/**
 * AIGRC MCP HTTP Server
 *
 * Provides HTTP/SSE transport for cloud deployments.
 * Uses the MCP SDK's StreamableHTTPServerTransport.
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { AIGRCConfig, loadConfig } from "./config.js";
import { getTools, executeTool } from "./tools/index.js";
import { getResources, readResource } from "./resources/index.js";
import { getPrompts, getPrompt } from "./prompts/index.js";
import { createServices, Services } from "./services/index.js";
import {
  requireAuth,
  rateLimit,
  createJwtVerifier,
  AuthInfo as AIGRCAuthInfo,
} from "./auth/index.js";

export interface HttpServerConfig {
  /** Port to listen on */
  port: number;

  /** Host to bind to */
  host: string;

  /** Enable CORS */
  cors: boolean;

  /** Allowed origins for CORS */
  corsOrigins: string[];

  /** Enable authentication */
  authEnabled: boolean;

  /** Allow anonymous access */
  allowAnonymous: boolean;

  /** OAuth issuer URL */
  oauthIssuer?: string;

  /** OAuth audience */
  oauthAudience?: string;

  /** Rate limit: requests per minute */
  requestsPerMinute: number;

  /** Rate limit: tool calls per hour */
  toolCallsPerHour: number;

  /** Enable session management (stateful mode) */
  stateful: boolean;
}

export const DEFAULT_HTTP_CONFIG: HttpServerConfig = {
  port: 3000,
  host: "0.0.0.0",
  cors: true,
  corsOrigins: ["*"],
  authEnabled: false,
  allowAnonymous: true,
  requestsPerMinute: 120,
  toolCallsPerHour: 1000,
  stateful: true,
};

/**
 * Session store for stateful connections
 */
interface Session {
  id: string;
  transport: StreamableHTTPServerTransport;
  server: Server;
  services: Services;
  createdAt: Date;
  lastActivity: Date;
  tenantId?: string;
}

const sessions = new Map<string, Session>();

/**
 * AIGRC HTTP Server instance
 */
export interface AIGRCHttpServer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: any; // Express application
  config: AIGRCConfig;
  httpConfig: HttpServerConfig;
  start: (port?: number, host?: string) => Promise<void>;
  sessions: Map<string, Session>;
}

/**
 * Cleanup stale sessions (older than 30 minutes of inactivity)
 */
function cleanupSessions(): void {
  const staleThreshold = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();

  for (const [id, session] of sessions) {
    if (now - session.lastActivity.getTime() > staleThreshold) {
      session.transport.close().catch(() => {});
      sessions.delete(id);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupSessions, 5 * 60 * 1000);

/**
 * Create the AIGRC HTTP server
 */
export function createHttpServer(
  aigrcConfig?: Partial<AIGRCConfig>,
  httpConfig?: Partial<HttpServerConfig>
): AIGRCHttpServer {
  const config = { ...loadConfig(), ...aigrcConfig };
  const httpConf = { ...DEFAULT_HTTP_CONFIG, ...httpConfig };

  const app = express();

  // Trust proxy for X-Forwarded-For
  app.set("trust proxy", true);

  // CORS
  if (httpConf.cors) {
    app.use(
      cors({
        origin: httpConf.corsOrigins.includes("*")
          ? true
          : httpConf.corsOrigins,
        credentials: true,
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-AIGRC-API-Key",
          "X-AIGRC-Tenant-ID",
          "Mcp-Session-Id",
        ],
        exposedHeaders: ["Mcp-Session-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
      })
    );
  }

  // Parse JSON bodies
  app.use(express.json({ limit: "4mb" }));

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "healthy",
      version: "3.0.0",
      transport: "streamable-http",
      sessions: sessions.size,
    });
  });

  // Server info endpoint
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      name: "aigrc-mcp",
      version: "3.0.0",
      protocol: "2024-11-05",
      transport: "streamable-http",
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
        logging: {},
      },
      extensions: {
        // Core extensions
        goldenThread: true,
        checkpointAcceleration: true,
        valueFirst: true,
        // Compliance
        multiJurisdiction: true,
        profileStacking: config.stackProfiles,
        // Integrations
        jiraIntegration: !!config.jiraApiUrl,
        adoIntegration: !!config.adoOrgUrl,
        redTeamIntegration: config.redTeamEnabled,
        // Enterprise
        telemetry: config.telemetryEnabled,
        authentication: httpConf.authEnabled,
        rateLimiting: true,
      },
      profiles: config.profiles,
    });
  });

  // Authentication middleware (optional)
  const authMiddleware = httpConf.authEnabled
    ? requireAuth({
        allowAnonymous: httpConf.allowAnonymous,
        tokenVerifier: httpConf.oauthIssuer
          ? createJwtVerifier({
              issuer: httpConf.oauthIssuer,
              audience: httpConf.oauthAudience,
            })
          : undefined,
      })
    : (_req: Request, _res: Response, next: NextFunction) => next();

  // Rate limiting middleware
  const rateLimitMiddleware = rateLimit({
    requestsPerMinute: httpConf.requestsPerMinute,
    toolCallsPerHour: httpConf.toolCallsPerHour,
  });

  /**
   * Create a new MCP server instance for a session
   */
  function createMcpServer(services: Services): Server {
    const server = new Server(
      {
        name: "aigrc",
        version: "3.0.0",
      },
      {
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          prompts: { listChanged: true },
          logging: {},
        },
      }
    );

    // Register handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.setRequestHandler(ListToolsRequestSchema, async (_request, _extra): Promise<any> => {
      return { tools: getTools(config) };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.setRequestHandler(CallToolRequestSchema, async (request, _extra): Promise<any> => {
      const { name, arguments: args } = request.params;
      return executeTool(name, args || {}, services, config);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.setRequestHandler(ListResourcesRequestSchema, async (_request, _extra): Promise<any> => {
      return { resources: await getResources(services, config) };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.setRequestHandler(ReadResourceRequestSchema, async (request, _extra): Promise<any> => {
      const { uri } = request.params;
      return readResource(uri, services, config);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.setRequestHandler(ListPromptsRequestSchema, async (_request, _extra): Promise<any> => {
      return { prompts: getPrompts(config) };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.setRequestHandler(GetPromptRequestSchema, async (request, _extra): Promise<any> => {
      const { name, arguments: args } = request.params;
      return getPrompt(name, args || {}, services, config);
    });

    return server;
  }

  /**
   * MCP endpoint - handles both GET (SSE) and POST (messages)
   */
  app.all(
    "/mcp",
    authMiddleware,
    rateLimitMiddleware,
    async (req: Request & { auth?: AIGRCAuthInfo }, res: Response) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const httpReq = req as any; // Cast for MCP SDK compatibility

        // Handle existing session
        if (sessionId && sessions.has(sessionId)) {
          const session = sessions.get(sessionId)!;
          session.lastActivity = new Date();
          await session.transport.handleRequest(httpReq, res, req.body);
          return;
        }

        // Create new session
        if (httpConf.stateful) {
          const newSessionId = randomUUID();
          const services = createServices(config);
          const server = createMcpServer(services);

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
          });

          // Store session
          const session: Session = {
            id: newSessionId,
            transport,
            server,
            services,
            createdAt: new Date(),
            lastActivity: new Date(),
            tenantId: req.auth?.tenantId,
          };
          sessions.set(newSessionId, session);

          // Connect server to transport
          await server.connect(transport);

          // Handle the request
          await transport.handleRequest(httpReq, res, req.body);

          // Cleanup on connection close
          transport.onclose = () => {
            sessions.delete(newSessionId);
          };
        } else {
          // Stateless mode - create fresh transport for each request
          const services = createServices(config);
          const server = createMcpServer(services);

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // Stateless
          });

          await server.connect(transport);
          await transport.handleRequest(httpReq, res, req.body);
        }
      } catch (error) {
        console.error("MCP request error:", error);
        if (!res.headersSent) {
          res.status(500).json({
            error: "server_error",
            error_description:
              error instanceof Error ? error.message : "Internal server error",
          });
        }
      }
    }
  );

  /**
   * SSE endpoint for legacy clients (deprecated)
   */
  app.get(
    "/sse",
    authMiddleware,
    rateLimitMiddleware,
    async (_req: Request, res: Response) => {
      res.status(410).json({
        error: "deprecated",
        error_description:
          "SSE endpoint is deprecated. Use /mcp with StreamableHTTP transport.",
        alternative: "/mcp",
      });
    }
  );

  /**
   * Session management endpoints
   */
  app.delete(
    "/sessions/:sessionId",
    authMiddleware,
    async (req: Request & { auth?: AIGRCAuthInfo }, res: Response) => {
      const { sessionId } = req.params;
      const session = sessions.get(sessionId);

      if (!session) {
        res.status(404).json({
          error: "not_found",
          error_description: "Session not found",
        });
        return;
      }

      // Verify tenant ownership
      if (req.auth?.tenantId && session.tenantId !== req.auth.tenantId) {
        res.status(403).json({
          error: "forbidden",
          error_description: "Cannot delete session owned by another tenant",
        });
        return;
      }

      await session.transport.close();
      sessions.delete(sessionId);

      res.json({
        status: "deleted",
        sessionId,
      });
    }
  );

  app.get(
    "/sessions",
    authMiddleware,
    async (req: Request & { auth?: AIGRCAuthInfo }, res: Response) => {
      const tenantSessions = Array.from(sessions.values())
        .filter(
          (s) => !req.auth?.tenantId || s.tenantId === req.auth.tenantId
        )
        .map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          lastActivity: s.lastActivity,
          tenantId: s.tenantId,
        }));

      res.json({
        sessions: tenantSessions,
        count: tenantSessions.length,
      });
    }
  );

  /**
   * Start the server
   */
  const start = (port?: number, host?: string): Promise<void> => {
    const p = port ?? httpConf.port;
    const h = host ?? httpConf.host;

    return new Promise((resolve) => {
      app.listen(p, h, () => {
        console.log(`AIGRC MCP HTTP Server v3.0.0 started`);
        console.log(`Listening on http://${h}:${p}`);
        console.log(`MCP endpoint: http://${h}:${p}/mcp`);
        console.log(`Health check: http://${h}:${p}/health`);
        console.log(`Auth: ${httpConf.authEnabled ? "enabled" : "disabled"}`);
        console.log(`Mode: ${httpConf.stateful ? "stateful" : "stateless"}`);
        resolve();
      });
    });
  };

  return {
    app,
    config,
    httpConfig: httpConf,
    start,
    sessions,
  };
}
