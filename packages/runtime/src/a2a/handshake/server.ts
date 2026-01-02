/**
 * AIGOS Handshake Server - SPEC-PRT-003
 *
 * Server-side implementation of the AIGOS mutual authentication handshake.
 */

import type {
  IGovernanceTokenGenerator,
  TokenGenerationInput,
  TokenGenerationOptions,
  GovernanceTokenPayload,
} from "../token/generator.js";
import type {
  IGovernanceTokenValidator,
  TokenValidationOptions,
  TokenValidationErrorCode,
} from "../token/validator.js";
import type { IA2AInboundPolicy, PolicyDecision } from "../policy/inbound.js";
import {
  AIGOS_TOKEN_HEADER,
  AIGOS_PROTOCOL_VERSION_HEADER,
  AIGOS_PROTOCOL_VERSION,
} from "./client.js";

/**
 * Result of handling an incoming handshake request
 */
export interface HandshakeRequestResult {
  valid: boolean;
  callerPayload?: GovernanceTokenPayload;
  responseHeaders?: Record<string, string>;
  error?: {
    code: string;
    message: string;
    httpStatus: number;
  };
}

/**
 * Configuration for handshake server
 */
export interface HandshakeServerConfig {
  /** Token generator for creating response tokens */
  tokenGenerator: IGovernanceTokenGenerator;
  /** Token validator for validating incoming tokens */
  tokenValidator: IGovernanceTokenValidator;
  /** Input for generating response tokens */
  tokenInput: TokenGenerationInput;
  /** Options for token generation */
  tokenOptions?: TokenGenerationOptions;
  /** Options for validating incoming tokens */
  validationOptions?: TokenValidationOptions;
  /** Optional inbound policy to apply */
  inboundPolicy?: IA2AInboundPolicy;
}

/**
 * Interface for handshake server
 */
export interface IHandshakeServer {
  /**
   * Handle an incoming request and validate the handshake
   */
  handleRequest(headers: Record<string, string>): Promise<HandshakeRequestResult>;

  /**
   * Update the token input (e.g., when identity changes)
   */
  updateTokenInput(input: TokenGenerationInput): void;
}

/**
 * Map validation error codes to HTTP status codes
 */
function errorCodeToHttpStatus(code: TokenValidationErrorCode | string): number {
  switch (code) {
    case "INVALID_SIGNATURE":
    case "INVALID_TOKEN_TYPE":
    case "MISSING_CLAIMS":
      return 401; // Unauthorized
    case "EXPIRED":
    case "NOT_YET_VALID":
      return 401;
    case "INVALID_ISSUER":
    case "INVALID_AUDIENCE":
      return 403; // Forbidden
    case "RISK_TOO_HIGH":
    case "KILL_SWITCH_DISABLED":
    case "AGENT_PAUSED":
    case "TERMINATION_PENDING":
      return 403;
    case "POLICY_DENIED":
      return 403;
    default:
      return 401;
  }
}

/**
 * Creates a handshake server
 */
export function createHandshakeServer(
  config: HandshakeServerConfig
): IHandshakeServer {
  const {
    tokenGenerator,
    tokenValidator,
    tokenOptions,
    validationOptions,
    inboundPolicy,
  } = config;
  let tokenInput = config.tokenInput;

  return {
    async handleRequest(
      headers: Record<string, string>
    ): Promise<HandshakeRequestResult> {
      // Normalize header names to lowercase for comparison
      const normalizedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        normalizedHeaders[key.toLowerCase()] = value;
      }

      // Check protocol version
      const protocolVersion = normalizedHeaders[AIGOS_PROTOCOL_VERSION_HEADER.toLowerCase()];
      if (protocolVersion && protocolVersion !== AIGOS_PROTOCOL_VERSION) {
        return {
          valid: false,
          error: {
            code: "PROTOCOL_VERSION_MISMATCH",
            message: `Unsupported protocol version: ${protocolVersion}`,
            httpStatus: 400,
          },
        };
      }

      // Get and validate incoming token
      const incomingToken = normalizedHeaders[AIGOS_TOKEN_HEADER.toLowerCase()];
      if (!incomingToken) {
        return {
          valid: false,
          error: {
            code: "MISSING_TOKEN",
            message: "Request did not include AIGOS token header",
            httpStatus: 401,
          },
        };
      }

      const validationResult = await tokenValidator.validate(
        incomingToken,
        validationOptions
      );

      if (!validationResult.valid) {
        return {
          valid: false,
          error: {
            code: validationResult.error?.code ?? "VALIDATION_FAILED",
            message: validationResult.error?.message ?? "Token validation failed",
            httpStatus: errorCodeToHttpStatus(validationResult.error?.code ?? ""),
          },
        };
      }

      const callerPayload = validationResult.payload!;

      // Apply inbound policy if configured
      if (inboundPolicy) {
        const policyDecision = await inboundPolicy.evaluate(callerPayload);
        if (!policyDecision.allowed) {
          return {
            valid: false,
            error: {
              code: "POLICY_DENIED",
              message: policyDecision.reason ?? "Inbound policy denied request",
              httpStatus: 403,
            },
          };
        }
      }

      // Generate response token
      const { token: responseToken } = await tokenGenerator.generate(
        tokenInput,
        tokenOptions
      );

      return {
        valid: true,
        callerPayload,
        responseHeaders: {
          [AIGOS_TOKEN_HEADER]: responseToken,
          [AIGOS_PROTOCOL_VERSION_HEADER]: AIGOS_PROTOCOL_VERSION,
        },
      };
    },

    updateTokenInput(input: TokenGenerationInput): void {
      tokenInput = input;
    },
  };
}

/**
 * Create an error response for failed handshakes
 */
export function createHandshakeErrorResponse(
  result: HandshakeRequestResult
): {
  status: number;
  headers: Record<string, string>;
  body: { error: string; message: string };
} {
  return {
    status: result.error?.httpStatus ?? 500,
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      error: result.error?.code ?? "UNKNOWN_ERROR",
      message: result.error?.message ?? "Unknown error",
    },
  };
}
