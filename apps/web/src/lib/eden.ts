import { ApiError, handleUnauthorized } from "@/lib/api-error";
import { resolveApiBaseUrl } from "@/lib/api-base-url";
import { treaty, type Treaty } from "@elysiajs/eden";
import type { app } from "../../../api/src/index";

export const BASE_URL = resolveApiBaseUrl();

export type Api = Treaty.Create<typeof app>;

const apiFetch = Object.assign(
  async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await fetch(input, init);
    if (response.status === 401 && typeof window !== "undefined") {
      handleUnauthorized();
    }
    return response;
  },
  { preconnect: fetch.preconnect },
);

export const client = treaty<typeof app>(BASE_URL, {
  fetch: { credentials: "include" },
  fetcher: apiFetch,
  parseDate: false,
});

type EdenResult = { data: unknown; error: unknown; status?: number };

function edenErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (typeof error !== "object" || error === null) return "Request failed";

  const record = error as Record<string, unknown>;
  if ("value" in record) {
    const fromValue = edenErrorMessage(record.value);
    if (fromValue !== "Request failed") return fromValue;
  }
  if ("message" in record) {
    const msg = record.message;
    if (typeof msg === "string" && msg.length > 0) return msg;
    const nested = edenErrorMessage(msg);
    if (nested !== "Request failed") return nested;
  }
  if ("error" in record) {
    const nested = edenErrorMessage(record.error);
    if (nested !== "Request failed") return nested;
  }
  if (
    error instanceof Error &&
    error.message &&
    error.message !== "[object Object]"
  ) {
    return error.message;
  }
  return "Request failed";
}

function edenErrorStatus(result: EdenResult, error: unknown): number {
  if (typeof result.status === "number") return result.status;
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return 500;
}

export function expectEden<R extends EdenResult>(
  result: R,
  emptyMessage = "Empty response",
): NonNullable<R["data"]> {
  if (result.error) {
    throw new ApiError(
      edenErrorMessage(result.error),
      edenErrorStatus(result, result.error),
    );
  }
  if (result.data === null || result.data === undefined)
    throw new ApiError(emptyMessage, 500);
  return result.data as NonNullable<R["data"]>;
}

export function expectEdenVoid<R extends EdenResult>(result: R): void {
  if (result.error) {
    throw new ApiError(
      edenErrorMessage(result.error),
      edenErrorStatus(result, result.error),
    );
  }
}
