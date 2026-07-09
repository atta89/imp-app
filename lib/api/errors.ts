import type { components } from "@/lib/api/schema";

type ErrorPayload = components["schemas"]["ErrorPayload"];
export type ApiErrorKind = ErrorPayload["kind"];

type AttachmentValidationError =
  components["schemas"]["AttachmentValidationError"];
export type AttachmentErrorCode = NonNullable<AttachmentValidationError["error"]>;

/** Normalized error thrown by the API layer. Mirrors the backend envelope. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Per-field validation messages (from `error.fields`), keyed by field name. */
  readonly fields?: Record<string, string>;
  /** Per-attachment validation results (from a top-level `attachments` array on 400). */
  readonly attachments?: AttachmentValidationError[];

  constructor(
    message: string,
    opts: {
      kind: ApiErrorKind;
      status: number;
      fields?: Record<string, string>;
      attachments?: AttachmentValidationError[];
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = opts.kind;
    this.status = opts.status;
    this.fields = opts.fields;
    this.attachments = opts.attachments;
  }
}

/** Build an ApiError from the backend `{ error: { kind, message, fields } }` envelope. */
export function toApiError(error: unknown, status = 0): ApiError {
  const body = error as
    | { error?: ErrorPayload; attachments?: AttachmentValidationError[] }
    | undefined;
  const payload = body?.error;
  const attachments = body?.attachments;
  if (payload?.message) {
    return new ApiError(payload.message, {
      kind: payload.kind,
      status,
      fields: payload.fields,
      attachments,
    });
  }
  return new ApiError(
    status === 0
      ? "Network error — please check your connection and try again."
      : "Something went wrong. Please try again.",
    { kind: status === 401 ? "unauthorized" : "internal", status, attachments },
  );
}

/** Field-level errors to surface on a form, or {} when none. */
export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError && error.fields ? error.fields : {};
}

/** Human-readable message for any thrown error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/** Failed-attachment codes keyed by attachmentId, or {} when none. */
export function attachmentErrors(
  error: unknown,
): Record<string, AttachmentErrorCode> {
  if (!(error instanceof ApiError) || !error.attachments) return {};
  const map: Record<string, AttachmentErrorCode> = {};
  for (const a of error.attachments) {
    if (!a.ok && a.error) map[a.attachmentId] = a.error;
  }
  return map;
}
