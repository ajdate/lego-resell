/** Canonical public site URL for metadata and share copy. */
export const BRICKVALUE_APP_ORIGIN = "https://brickvalue.app";

export function brickvalueAppUrl(path = ""): string {
  const normalized = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${BRICKVALUE_APP_ORIGIN}${normalized}`;
}
