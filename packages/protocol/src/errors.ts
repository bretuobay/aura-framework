import type { z } from "zod";

/**
 * A structured validation error item with a field path and human-readable message.
 * Represents a single validation issue found during schema parsing.
 */
export interface ValidationErrorItem {
  /** JSON path to the problematic field (e.g., ["surfaces", 0, "components", 1, "riskClass"]) */
  path: (string | number)[];
  /** Human-readable description of the validation problem */
  message: string;
  /** Optional Zod issue code for programmatic handling */
  code?: string;
}

/**
 * A discriminated union representing either a successful parse result
 * with typed data, or a failure result with structured error items.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationErrorItem[] };

/**
 * Wraps Zod's `.safeParse()` to produce a structured validation result.
 * Never throws — returns all validation errors collected in a single pass.
 *
 * @param schema - The Zod schema to validate against
 * @param value - The unknown value to parse
 * @returns A ValidationResult with either the typed data or structured errors
 */
export function parseSchema<T>(schema: z.ZodType<T>, value: unknown): ValidationResult<T> {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
    })),
  };
}
