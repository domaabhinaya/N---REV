export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;

export type BodyType<T> = T;

export type AuthTokenGetter = () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

// ---------------------------------------------------------------------------
// Module-level configuration
// ---------------------------------------------------------------------------

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;

/**
 * Set a base URL that is prepended to every relative request URL
 * (i.e. paths that start with `/`).
 *
 * Useful for Expo bundles that need to call a remote API server.
 * Pass `null` to clear the base URL.
 */
export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

/**
 * Register a getter that supplies a bearer auth token.  Before every fetch
 * the getter is invoked; when it returns a non-null string, an
 * `Authorization: Bearer <token>` header is attached to the request.
 *
 * Useful for Expo bundles making token-gated API calls.
 * Pass `null` to clear the getter.
 *
 * NOTE: This function should never be used in web applications where session
 * token cookies are automatically associated with API calls by the browser.
 */
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

// Use loose check for URL — some runtimes (e.g. React Native) polyfill URL
// differently, so `instanceof URL` can fail.
function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  // Only prepend to relative paths (starting with /)
  if (!url.startsWith("/")) return input;

  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType === "application/xml" ||
        mediaType === "text/xml" ||
        mediaType.endsWith("+xml") ||
        mediaType === "application/x-www-form-urlencoded"),
  );
}

// Use strict equality: in browsers, `response.body` is `null` when the
// response genuinely has no content.  In React Native, `response.body` is
// always `undefined` because the ReadableStream API is not implemented —
// even when the response carries a full payload readable via `.text()` or
// `.json()`.  Loose equality (`== null`) matches both `null` and `undefined`,
// which causes every React Native response to be treated as empty.
function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;

  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;

  if (typeof data === "string") {
    const text = data.trim();
    return text ? `${prefix}: ${truncate(text)}` : prefix;
  }

  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message =
    getStringField(data, "message") ??
    getStringField(data, "error_description") ??
    getStringField(data, "error");

  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;

  return prefix;
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;

  constructor(
    response: Response,
    data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
  readonly rawBody: string;
  readonly cause: unknown;

  constructor(
    response: Response,
    rawBody: string,
    cause: unknown,
    requestInfo: { method: string; url: string },
  ) {
    super(
      `Failed to parse response from ${requestInfo.method} ${response.url || requestInfo.url} ` +
        `(${response.status} ${response.statusText}) as JSON`,
    );
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
    this.rawBody = rawBody;
    this.cause = cause;
  }
}

async function parseJsonBody(
  response: Response,
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);

  if (normalized.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch (cause) {
    throw new ResponseParseError(response, raw, cause, requestInfo);
  }
}

async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) {
    return null;
  }

  const mediaType = getMediaType(response.headers);

  // Fall back to text when blob() is unavailable (e.g. some React Native builds).
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function" ? response.blob() : response.text();
  }

  const raw = await response.text();
  const normalized = stripBom(raw);
  const trimmed = normalized.trim();

  if (trimmed === "") {
    return null;
  }

  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) {
    try {
      return JSON.parse(normalized);
    } catch {
      return raw;
    }
  }

  return raw;
}

function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);

  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

async function parseSuccessBody(
  response: Response,
  responseType: "json" | "text" | "blob" | "auto",
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) {
    return null;
  }

  const effectiveType =
    responseType === "auto" ? inferResponseType(response) : responseType;

  switch (effectiveType) {
    case "json":
      return parseJsonBody(response, requestInfo);

    case "text": {
      const text = await response.text();
      return text === "" ? null : text;
    }

    case "blob":
      if (typeof response.blob !== "function") {
        throw new TypeError(
          "Blob responses are not supported in this runtime. " +
            "Use responseType \"json\" or \"text\" instead.",
        );
      }
      return response.blob();
  }
}

// ---------------------------------------------------------------------------
// Resilience policy (permanent fix for intermittent failures)
// ---------------------------------------------------------------------------
// The recovery-plan endpoint is a `GET /profiles/:id/recovery-plan` that can
// be served from a warm cache or recomputed server-side on demand. In practice
// the cold-start recomputation (and occasional infra/network blips between the
// Vite-built client and the backend origin) produced transient failures —
// `customFetch` used to surface a single bare `fetch`, so a dropped connection
// meant a hard error on the UI with no retry. That earlier, in-line-only
// band-aid has been replaced with this retry policy in the shared mutator so
// every generated caller benefits, and because `custom-fetch.ts` is an orval
// *user-supplied* mutator (see `orval.config.ts` -> `mutator.path`), codegen
// never overwrites it => this is the durable fix.
//
// Retry eligibility:
//   * only bodyless requests (GET/HEAD/etc.) are retried — POST/PUT bodies are
//     not safely re-playable on a stream that may already be consumed;
//   * HTTP 408, 429, 500, 502, 503, 504 are retried (transient);
//   * `AbortError` is never retried;
//   * other 4xx responses (auth errors, validation, 404) are NOT retried —
//     they are surfaced immediately as `ApiError` exactly as before.
//
// Backoff: exponential (300ms -> 600ms -> 1200ms) with jitter, capped at 5s,
// and honours `Retry-After` when the server provides one.

const RETRYABLE_STATUS = new Set<number>([408, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3; // additional attempts after the initial fetch
const BACKOFF_BASE_MS = 300;
const MAX_BACKOFF_MS = 5000;
const MAX_RETRY_AFTER_MS = 10000;

// Hard ceiling on how long a single logical request (initial attempt + retries
// + backoff) may occupy the caller. This exists because Vercel's Node.js
// Functions are killed at the platform function timeout (~10s on Hobby) and
// surface as a 504 — which `RETRYABLE_STATUS` above retries. Without a bound,
// a cold-start 504 on every attempt can hold a loading spinner for tens of
// seconds, and a stalled/non-responding invocation can hang the fetch
// indefinitely (the spinner never resolves). 15s lets a genuine cold-start
// 200 land (~1–4s) plus a warm retry after a transient 504, while capping the
// worst case.
const OVERALL_DEADLINE_MS = 15000;
// Per-attempt ceiling. Kept just above Vercel's 10s function timeout so a real
// response always wins the race; it only fires for an invocation that would
// otherwise never return (stalled edge/TCP). A value below the function timeout
// would wrongly abort legitimate (slow) cold-start successes.
const PER_ATTEMPT_TIMEOUT_MS = 11000;

// Marker error for our own per-attempt timeout. Distinguished from a real
// `AbortError` (user cancellation) so timeouts remain retryable within the
// overall deadline.
export class TimeoutError extends Error {
  readonly name = "TimeoutError" as const;
}

function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const { name, code } = err as { name?: unknown; code?: unknown };
  return name === "AbortError" || code === "ABORT_ERR";
}

function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

// Honors the `Retry-After` header (delta-seconds or HTTP-date) but falls back
// to the exponential schedule when the header is absent or unparseable.
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return Math.min(seconds, MAX_RETRY_AFTER_MS / 1000) * 1000;
  }
  return null; // HTTP-date form — let the caller fall back to the default backoff
}

function computeBackoff(retryAttempt: number, retryAfter: string | null): number {
  const explicit = parseRetryAfter(retryAfter);
  if (explicit !== null) return explicit;

  const exponential = Math.min(BACKOFF_BASE_MS * 2 ** retryAttempt, MAX_BACKOFF_MS);
  // ±30% jitter to avoid synchronized retry storms across clients.
  const jitter = Math.random() * 0.3 * exponential;
  return exponential + (Math.random() < 0.5 ? -jitter : jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const deadline = Date.now() + OVERALL_DEADLINE_MS;
  const parentSignal = init.signal;
  let attempt = 0;
  let lastError: unknown = null;
  let timedOut = false;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Overall budget exhausted: stop retrying and surface the last failure
    // (or a TimeoutError if the stall never produced an HTTP status).
    if (Date.now() >= deadline) {
      throw lastError instanceof Error
        ? lastError
        : new TimeoutError("Request exceeded the overall deadline.");
    }
    // Per-attempt cap, but never larger than the remaining overall budget.
    const attemptTimeout = Math.min(
      PER_ATTEMPT_TIMEOUT_MS,
      Math.max(deadline - Date.now(), 0),
    );

    const controller = new AbortController();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, attemptTimeout);
    const onParentAbort = () => controller.abort();
    parentSignal?.addEventListener("abort", onParentAbort);

    try {
      // Use our controller's signal (so we can abort on timeout) but mirror any
      // parent cancellation (e.g. react-query unmounting) onto it.
      const { signal: _omitted, ...rest } = init;
      const response = await fetch(input, { ...rest, signal: controller.signal });

      // Success or a non-retryable (e.g. 4xx) response is returned as-is so the
      // caller's existing `if (!response.ok)` path handles the ApiError.
      if (response.ok || !isRetryableHttpStatus(response.status)) return response;

      // Retryable HTTP error. If we're out of attempts, return it so the caller
      // throws `ApiError` exactly as before.
      if (attempt >= MAX_RETRIES) return response;

      const retryAfter = response.headers.get("retry-after");
      await sleep(computeBackoff(attempt, retryAfter));
    } catch (err) {
      if (timedOut) {
        // Our own timeout aborted the request — a retryable stall, not a user
        // cancellation. Keep the loop going until the overall deadline.
        lastError = new TimeoutError(`Attempt timed out after ${attemptTimeout}ms.`);
      } else if (isAbortError(err)) {
        // A real user-initiated cancellation (the parent signal was aborted,
        // e.g. the component unmounted) — never retry.
        throw err;
      } else {
        lastError = err;
      }
      if (attempt >= MAX_RETRIES || Date.now() >= deadline) throw lastError;
      await sleep(computeBackoff(attempt, null));
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", onParentAbort);
      timedOut = false;
    }
    attempt += 1;
  }
}

// Single (non-retried) attempt with a hard timeout. Used for requests that
// carry a body (POST/PUT) and therefore cannot be safely replayed. Without a
// timeout a stalled body request (e.g. /api/assistant/chat) would hang the
// caller's loading state forever.
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const parentSignal = init.signal;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onParentAbort = () => controller.abort();
  parentSignal?.addEventListener("abort", onParentAbort);
  try {
    const { signal: _omitted, ...rest } = init;
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (timedOut) {
      throw new TimeoutError(`Request timed out after ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener("abort", onParentAbort);
  }
}

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;

  const method = resolveMethod(input, init.method);

  if (init.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headers = mergeHeaders(isRequest(input) ? input.headers : undefined, headersInit);

  if (
    typeof init.body === "string" &&
    !headers.has("content-type") &&
    looksLikeJson(init.body)
  ) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  // Attach bearer token when an auth getter is configured and no
  // Authorization header has been explicitly provided.
  if (_authTokenGetter && !headers.has("authorization")) {
    const token = await _authTokenGetter();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  const requestInfo = { method, url: resolveUrl(input) };

  const fetchInit = { ...init, method, headers };
    // Bodyless requests (e.g. GET /profiles/:id/recovery-plan) are retried on
  // transient failures and bounded by an overall deadline so a cold-start 504
  // can never hold the UI loading forever. Requests with a body are sent once
  // but still respect a hard timeout so a stalled mutation can't hang either.
  const response = init.body
    ? await fetchWithTimeout(input, fetchInit, PER_ATTEMPT_TIMEOUT_MS)
    : await fetchWithRetry(input, fetchInit);

  if (!response.ok) {
    const errorData = await parseErrorBody(response, method);
    throw new ApiError(response, errorData, requestInfo);
  }

  return (await parseSuccessBody(response, responseType, requestInfo)) as T;
}
