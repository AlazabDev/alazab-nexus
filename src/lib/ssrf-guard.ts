// SSRF guard helpers shared by server functions that fetch user-supplied URLs.
// Keep pure and side-effect free so it can be unit/integration tested.

export const DEFAULT_ALLOWED_HOSTS = [
  "eesxiwdeeipfzyarycgo.supabase.co",
  "eesxiwdeeipfzyarycgo.storage.supabase.co",
  "images.unsplash.com",
  "cdn.shopify.com",
  "res.cloudinary.com",
  "i.imgur.com",
];

export const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;
export const DEFAULT_TIMEOUT_MS = 10_000;

export function isPrivateOrLiteralIp(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = parseInt(m[1]);
    const b = parseInt(m[2]);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  if (host.startsWith("[") || host.includes(":")) return true; // IPv6 literal
  return false;
}

export function assertSafeUrl(
  url: string,
  allowedHosts: string[] = DEFAULT_ALLOWED_HOSTS,
): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid source URL");
  }
  if (parsed.protocol !== "https:") throw new Error("Only https URLs are allowed");
  const host = parsed.hostname.toLowerCase();
  if (
    isPrivateOrLiteralIp(host) ||
    host === "localhost" ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    throw new Error("Source URL host is not allowed");
  }
  const allowed = allowedHosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) throw new Error(`Source host not in allowlist: ${host}`);
  return parsed;
}

export type FetchImageOptions = {
  allowedHosts?: string[];
  maxBytes?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export async function fetchImageAsDataUrl(
  url: string,
  opts: FetchImageOptions = {},
): Promise<string> {
  const parsed = assertSafeUrl(url, opts.allowedHosts ?? DEFAULT_ALLOWED_HOSTS);
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = opts.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(parsed.toString(), { redirect: "error", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`Failed to fetch source image: ${res.status}`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  if (!mime.startsWith("image/")) throw new Error("Source URL did not return an image");
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared && declared > maxBytes) throw new Error("Source image too large");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > maxBytes) throw new Error("Source image too large");
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return `data:${mime};base64,${btoa(bin)}`;
}
