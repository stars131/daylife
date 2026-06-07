const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const trustedFetchSites = new Set(["same-origin", "same-site", "none"]);

export function isMutatingMethod(method: string): boolean {
  return mutatingMethods.has(method.toUpperCase());
}

export function isSameOriginRequest(request: Request, configuredAppUrl = process.env.APP_URL): boolean {
  const allowedOrigins = new Set<string>([new URL(request.url).origin]);
  if (configuredAppUrl) {
    try {
      allowedOrigins.add(new URL(configuredAppUrl).origin);
    } catch {
      // APP_URL is validated by server env parsing; middleware still stays defensive.
    }
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return allowedOrigins.has(origin);
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || trustedFetchSites.has(fetchSite);
}
