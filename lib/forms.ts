import { toast } from "sonner";

import { ApiError } from "@/lib/api/errors";

/**
 * Map an ApiError's field errors onto a react-hook-form, toasting anything that
 * isn't a known field (e.g. a 409 conflict or network error).
 */
export function applyFormError(
  error: unknown,
  setError: (name: string, e: { message: string }) => void,
  fields: string[],
): void {
  const apiFields = error instanceof ApiError ? error.fields : undefined;
  let handled = false;
  if (apiFields) {
    for (const f of fields) {
      if (apiFields[f]) {
        setError(f, { message: apiFields[f] });
        handled = true;
      }
    }
  }
  if (!handled) {
    toast.error(error instanceof Error ? error.message : "Something went wrong.");
  }
}
