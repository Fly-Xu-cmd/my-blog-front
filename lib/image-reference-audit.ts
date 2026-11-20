export function legacyImagePaths(value: string | null | undefined): string[] {
  if (!value) return [];
  const candidates =
    value.match(/(?:https?:\/\/[^\s<>"'()]+)?\/?uploads?\/[^\s<>"'()\\]+/gi) ??
    [];
  const paths = new Set<string>();
  for (const candidate of candidates) {
    try {
      const url = new URL(
        candidate.startsWith("upload") ? "/" + candidate : candidate,
        "https://audit.invalid",
      );
      if (/^\/uploads?\//i.test(url.pathname)) paths.add(url.pathname);
    } catch {
      /* Invalid links cannot become filesystem paths. */
    }
  }
  return [...paths].sort();
}
