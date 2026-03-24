// ─────────────────────────────────────────────────────────────────
// PangoGuard — Error Types
// ─────────────────────────────────────────────────────────────────

/**
 * Base error for all PangoGuard errors.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

/**
 * Thrown when GitHub API calls fail.
 */
export class GitHubApiError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "GITHUB_API_ERROR", 502, context);
    this.name = "GitHubApiError";
  }
}

/**
 * Thrown when scan operations fail or timeout.
 */
export class ScanError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "SCAN_ERROR", 500, context);
    this.name = "ScanError";
  }
}

/**
 * Thrown when scan exceeds the configured timeout.
 */
export class ScanTimeoutError extends AppError {
  constructor(timeoutMs: number, context?: Record<string, unknown>) {
    super(`Scan exceeded timeout of ${timeoutMs}ms`, "SCAN_TIMEOUT", 500, { ...context, timeoutMs });
    this.name = "ScanTimeoutError";
  }
}

/**
 * Thrown when Supabase persistence operations fail.
 */
export class PersistenceError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "PERSISTENCE_ERROR", 500, context);
    this.name = "PersistenceError";
  }
}

/**
 * Thrown when configuration is invalid.
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR", 500);
    this.name = "ConfigError";
  }
}

/**
 * Thrown when webhook payload validation fails.
 */
export class WebhookValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "WEBHOOK_VALIDATION_ERROR", 400, context);
    this.name = "WebhookValidationError";
  }
}

/**
 * Safe error serialization for logging.
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}
