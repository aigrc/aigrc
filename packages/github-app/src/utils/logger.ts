// ─────────────────────────────────────────────────────────────────
// PangoGuard — Structured Logger
// ─────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private minLevel: number;

  constructor(level: LogLevel = "info") {
    this.minLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  }

  setLevel(level: LogLevel): void {
    this.minLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }
}

/** Singleton logger instance */
export const logger = new Logger();

/**
 * Create a child logger with a fixed context prefix.
 */
export function createLogger(component: string): {
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
} {
  return {
    debug: (msg, ctx) => logger.debug(`[${component}] ${msg}`, ctx),
    info: (msg, ctx) => logger.info(`[${component}] ${msg}`, ctx),
    warn: (msg, ctx) => logger.warn(`[${component}] ${msg}`, ctx),
    error: (msg, ctx) => logger.error(`[${component}] ${msg}`, ctx),
  };
}
