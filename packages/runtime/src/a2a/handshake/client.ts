/**
 * AIGOS Handshake Client - SPEC-PRT-003
 *
 * Client-side implementation of the AIGOS mutual authentication handshake.
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
} from "../token/validator.js";

// HTTP header names
export const AIGOS_TOKEN_HEADER = "X-AIGOS-Token";
export const AIGOS_PROTOCOL_VERSION_HEADER = "X-AIGOS-Protocol-Version";
export const AIGOS_PROTOCOL_VERSION = "1.0";

/**
 * Result of a handshake request
 */
export interface HandshakeResult {
  success: boolean;
  responsePayload?: GovernanceTokenPayload;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Configuration for handshake client
 */
export interface HandshakeClientConfig {
  /** Token generator for creating outgoing tokens */
  tokenGenerator: IGovernanceTokenGenerator;
  /** Token validator for validating response tokens */
  tokenValidator: IGovernanceTokenValidator;
  /** Input for token generation */
  tokenInput: TokenGenerationInput;
  /** Options for token generation */
  tokenOptions?: TokenGenerationOptions;
  /** Options for validating response tokens */
  validationOptions?: TokenValidationOptions;
}

/**
 * Interface for handshake client
 */
export interface IHandshakeClient {
  /**
   * Generate headers for an outgoing request
   */
  generateRequestHeaders(): Promise<Record<string, string>>;

  /**
   * Validate response headers and complete the handshake
   */
  validateResponseHeaders(headers: Record<string, string>): Promise<HandshakeResult>;

  /**
   * Perform a complete handshake with a fetch-like function
   */
  performHandshake(
    url: string,
    options?: RequestInit
  ): Promise<{
    response: Response;
    handshake: HandshakeResult;
  }>;
}

/**
 * Creates a handshake client
 */
export function createHandshakeClient(
  config: HandshakeClientConfig
): IHandshakeClient {
  const {
    tokenGenerator,
    tokenValidator,
    tokenInput,
    tokenOptions,
    validationOptions,
  } = config;

  return {
    async generateRequestHeaders(): Promise<Record<string, string>> {
      const { token } = await tokenGenerator.generate(tokenInput, tokenOptions);

      return {
        [AIGOS_TOKEN_HEADER]: token,
        [AIGOS_PROTOCOL_VERSION_HEADER]: AIGOS_PROTOCOL_VERSION,
      };
    },

    async validateResponseHeaders(
      headers: Record<string, string>
    ): Promise<HandshakeResult> {
      // Normalize header names to lowercase for comparison
      const normalizedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        normalizedHeaders[key.toLowerCase()] = value;
      }

      const responseToken = normalizedHeaders[AIGOS_TOKEN_HEADER.toLowerCase()];
      if (!responseToken) {
        return {
          success: false,
          error: {
            code: "MISSING_RESPONSE_TOKEN",
            message: "Response did not include AIGOS token header",
          },
        };
      }

      const result = await tokenValidator.validate(responseToken, validationOptions);

      if (!result.valid) {
        return {
          success: false,
          error: {
            code: result.error?.code ?? "VALIDATION_FAILED",
            message: result.error?.message ?? "Response token validation failed",
          },
        };
      }

      return {
        success: true,
        responsePayload: result.payload,
      };
    },

    async performHandshake(
      url: string,
      options: RequestInit = {}
    ): Promise<{
      response: Response;
      handshake: HandshakeResult;
    }> {
      const aigosHeaders = await this.generateRequestHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...aigosHeaders,
        },
      });

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const handshake = await this.validateResponseHeaders(responseHeaders);

      return { response, handshake };
    },
  };
}

/**
 * Helper to create fetch options with AIGOS headers
 */
export async function createAigosRequestInit(
  generator: IGovernanceTokenGenerator,
  input: TokenGenerationInput,
  options?: TokenGenerationOptions & RequestInit
): Promise<RequestInit> {
  const { token } = await generator.generate(input, options);

  const { algorithm, ttlSeconds, audience, keyId, ...fetchOptions } = options ?? {};

  return {
    ...fetchOptions,
    headers: {
      ...(fetchOptions.headers ?? {}),
      [AIGOS_TOKEN_HEADER]: token,
      [AIGOS_PROTOCOL_VERSION_HEADER]: AIGOS_PROTOCOL_VERSION,
    },
  };
}
