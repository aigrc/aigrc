/**
 * Fetch Middleware - SPEC-PRT-003
 *
 * Middleware for automatic A2A authentication with fetch API.
 */

import type {
  IGovernanceTokenGenerator,
  TokenGenerationInput,
  TokenGenerationOptions,
} from "../token/generator.js";
import type {
  IGovernanceTokenValidator,
  TokenValidationOptions,
} from "../token/validator.js";
import type { IA2AOutboundPolicy } from "../policy/outbound.js";
import {
  AIGOS_TOKEN_HEADER,
  AIGOS_PROTOCOL_VERSION_HEADER,
  AIGOS_PROTOCOL_VERSION,
} from "../handshake/client.js";

/**
 * Configuration for fetch middleware
 */
export interface FetchMiddlewareConfig {
  /** Token generator for outgoing requests */
  tokenGenerator: IGovernanceTokenGenerator;
  /** Token validator for response tokens */
  tokenValidator: IGovernanceTokenValidator;
  /** Input for token generation */
  tokenInput: TokenGenerationInput;
  /** Options for token generation */
  tokenOptions?: TokenGenerationOptions;
  /** Options for validating response tokens */
  validationOptions?: TokenValidationOptions;
  /** Optional outbound policy */
  outboundPolicy?: IA2AOutboundPolicy;
  /** Whether to require valid response tokens */
  requireValidResponse?: boolean;
  /** Callback for handshake events */
  onHandshake?: (event: FetchHandshakeEvent) => void;
}

/**
 * Handshake event for logging/monitoring
 */
export interface FetchHandshakeEvent {
  url: string;
  method: string;
  success: boolean;
  responseStatus?: number;
  error?: string;
  targetInstanceId?: string;
  durationMs: number;
}

/**
 * Enhanced response with AIGOS context
 */
export interface AigosResponse extends Response {
  aigos?: {
    valid: boolean;
    targetInstanceId?: string;
    error?: string;
  };
}

/**
 * Creates a fetch function with AIGOS middleware
 */
export function createAigosFetch(
  config: FetchMiddlewareConfig
): typeof fetch {
  const {
    tokenGenerator,
    tokenValidator,
    tokenInput,
    tokenOptions,
    validationOptions,
    outboundPolicy,
    requireValidResponse = false,
    onHandshake,
  } = config;

  return async function aigosFetch(
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<AigosResponse> {
    const startTime = Date.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";

    // Check outbound policy for URL
    if (outboundPolicy) {
      const urlDecision = outboundPolicy.evaluateUrl(url);
      if (!urlDecision.allowed) {
        const error = new Error(`Outbound policy denied: ${urlDecision.reason}`);
        (error as any).code = "OUTBOUND_POLICY_DENIED";
        throw error;
      }
    }

    // Generate token for outgoing request
    const { token } = await tokenGenerator.generate(tokenInput, tokenOptions);

    // Add AIGOS headers
    const headers = new Headers(init?.headers);
    headers.set(AIGOS_TOKEN_HEADER, token);
    headers.set(AIGOS_PROTOCOL_VERSION_HEADER, AIGOS_PROTOCOL_VERSION);

    // Make the request
    const response = await fetch(input, {
      ...init,
      headers,
    }) as AigosResponse;

    const durationMs = Date.now() - startTime;

    // Validate response token
    const responseToken = response.headers.get(AIGOS_TOKEN_HEADER);

    if (responseToken) {
      const validationResult = await tokenValidator.validate(
        responseToken,
        validationOptions
      );

      if (validationResult.valid) {
        // Check outbound policy for target
        if (outboundPolicy && validationResult.payload) {
          const targetDecision = await outboundPolicy.evaluateTarget(validationResult.payload);
          if (!targetDecision.allowed) {
            response.aigos = {
              valid: false,
              error: `Outbound policy denied target: ${targetDecision.reason}`,
            };

            onHandshake?.({
              url,
              method,
              success: false,
              responseStatus: response.status,
              error: targetDecision.reason,
              durationMs,
            });

            if (requireValidResponse) {
              const error = new Error(`Outbound policy denied target: ${targetDecision.reason}`);
              (error as any).code = "OUTBOUND_POLICY_DENIED";
              throw error;
            }
          } else {
            response.aigos = {
              valid: true,
              targetInstanceId: validationResult.payload.aigos.identity.instance_id,
            };

            onHandshake?.({
              url,
              method,
              success: true,
              responseStatus: response.status,
              targetInstanceId: validationResult.payload.aigos.identity.instance_id,
              durationMs,
            });
          }
        } else {
          response.aigos = {
            valid: true,
            targetInstanceId: validationResult.payload?.aigos.identity.instance_id,
          };

          onHandshake?.({
            url,
            method,
            success: true,
            responseStatus: response.status,
            targetInstanceId: validationResult.payload?.aigos.identity.instance_id,
            durationMs,
          });
        }
      } else {
        response.aigos = {
          valid: false,
          error: validationResult.error?.message,
        };

        onHandshake?.({
          url,
          method,
          success: false,
          responseStatus: response.status,
          error: validationResult.error?.message,
          durationMs,
        });

        if (requireValidResponse) {
          const error = new Error(`Invalid response token: ${validationResult.error?.message}`);
          (error as any).code = validationResult.error?.code;
          throw error;
        }
      }
    } else {
      response.aigos = {
        valid: false,
        error: "No AIGOS token in response",
      };

      onHandshake?.({
        url,
        method,
        success: false,
        responseStatus: response.status,
        error: "No AIGOS token in response",
        durationMs,
      });

      if (requireValidResponse) {
        const error = new Error("No AIGOS token in response");
        (error as any).code = "MISSING_RESPONSE_TOKEN";
        throw error;
      }
    }

    return response;
  };
}

/**
 * Creates a simple wrapper that just adds AIGOS headers
 * without validating responses (for non-AIGOS endpoints)
 */
export function createAigosHeadersFetch(
  tokenGenerator: IGovernanceTokenGenerator,
  tokenInput: TokenGenerationInput,
  tokenOptions?: TokenGenerationOptions
): typeof fetch {
  return async function aigosFetch(
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> {
    const { token } = await tokenGenerator.generate(tokenInput, tokenOptions);

    const headers = new Headers(init?.headers);
    headers.set(AIGOS_TOKEN_HEADER, token);
    headers.set(AIGOS_PROTOCOL_VERSION_HEADER, AIGOS_PROTOCOL_VERSION);

    return fetch(input, {
      ...init,
      headers,
    });
  };
}
