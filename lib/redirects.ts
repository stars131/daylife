const fallbackPath = "/";
const sameOriginBase = "https://schedule.local";
const controlCharacters = /[\u0000-\u001F\u007F]/;

export function safeRedirectPath(value: string | null | undefined, fallback = fallbackPath): string {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || controlCharacters.test(candidate)) {
    return fallback;
  }

  try {
    const url = new URL(candidate, sameOriginBase);
    if (url.origin !== sameOriginBase) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
