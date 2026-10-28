const NETWORK_ERROR_PATTERN =
  /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|fetch failed|getaddrinfo|network error/i;

/** Detect network/DNS failures from fetch, googleapis, or nested causes. */
export function isUpstreamUnavailable(error: unknown): boolean {
  let current: unknown = error;
  const fragments: string[] = [];
  let depth = 0;

  while (current && depth < 5) {
    if (typeof current === "string") {
      fragments.push(current);
      break;
    }
    if (typeof current !== "object") break;

    const value = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (typeof value.code === "string") fragments.push(value.code);
    if (typeof value.message === "string") fragments.push(value.message);
    current = value.cause;
    depth += 1;
  }

  return NETWORK_ERROR_PATTERN.test(fragments.join(" "));
}
