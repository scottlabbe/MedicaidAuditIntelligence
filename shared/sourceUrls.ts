export const PUBLIC_SOURCE_URL_PATTERN = "^https?://";

export function normalizePublicSourceUrl(
  value?: string | null,
): string | undefined {
  const normalized = value?.trim();
  return normalized && /^https?:\/\//i.test(normalized)
    ? normalized
    : undefined;
}

export function isPublicSourceUrl(value?: string | null): value is string {
  return Boolean(normalizePublicSourceUrl(value));
}
