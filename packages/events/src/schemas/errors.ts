import type { EventErrorCode } from "./enums";
import type { ValidationError } from "./responses";

/**
 * Factory for creating structured validation errors per EVT-001 Appendix C.
 */
export function createValidationError(
  code: EventErrorCode,
  message: string,
  options?: {
    detail?: string;
    field?: string;
    schemaPath?: string;
  }
): ValidationError {
  return {
    code,
    message,
    detail: options?.detail,
    field: options?.field,
    schemaPath: options?.schemaPath,
  };
}
