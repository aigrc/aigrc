// ─────────────────────────────────────────────────────────────────
// EXIT CODES (AIG-99)
// Comprehensive exit code coverage for CLI commands
// ─────────────────────────────────────────────────────────────────

/**
 * Standard exit codes for AIGRC CLI
 */
export enum ExitCode {
  /** Command completed successfully */
  SUCCESS = 0,

  /** General error - unspecified failure */
  GENERAL_ERROR = 1,

  /** Invalid arguments or options provided */
  INVALID_ARGUMENTS = 2,

  /** Validation errors detected */
  VALIDATION_ERRORS = 3,

  /** File or directory not found */
  FILE_NOT_FOUND = 4,

  /** Permission denied */
  PERMISSION_DENIED = 5,
}

/**
 * Exit the process with the specified exit code
 */
export function exit(code: ExitCode): never {
  process.exit(code);
}

/**
 * Exit with success code
 */
export function exitSuccess(): never {
  process.exit(ExitCode.SUCCESS);
}

/**
 * Exit with validation errors code
 */
export function exitValidationErrors(): never {
  process.exit(ExitCode.VALIDATION_ERRORS);
}

/**
 * Exit with file not found code
 */
export function exitFileNotFound(): never {
  process.exit(ExitCode.FILE_NOT_FOUND);
}

/**
 * Exit with invalid arguments code
 */
export function exitInvalidArguments(): never {
  process.exit(ExitCode.INVALID_ARGUMENTS);
}

/**
 * Exit with permission denied code
 */
export function exitPermissionDenied(): never {
  process.exit(ExitCode.PERMISSION_DENIED);
}

/**
 * Exit with general error code
 */
export function exitGeneralError(): never {
  process.exit(ExitCode.GENERAL_ERROR);
}
