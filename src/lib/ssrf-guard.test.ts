import { describe, it, expect } from "vitest";
import {
  assertSafeUrl,
  fetchImageAsDataUrl,
  isPrivateOrLiteralIp,
  DEFAULT_ALLOWED_HOSTS,
} from "./ssrf-guard";

describe("isPrivateOrLiteralIp", () => {
  it.each([
    "10.0.0.1",
    "127.0.0.1",
    "0.0.0.0",
    "169.254.169.254", // AWS/GCP metadata
    "172.16.5.9",
    "172.31.255.255",
    "192.168.1.1",
    "::1",
    "[::1]",
    "fe80::1",
  ])("flags %s as private/literal", (host) => {
    expect(isPrivateOrLiteralIp(host)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "example.com"])(
    "allows public host %s",
    (host) => {
      expect(isPrivateOrLiteralIp(host)).toBe(false);
    },
  );
});

describe("assertSafeUrl", () => {
  it("rejects non-https", () => {
    expect(() => assertSafeUrl("http://images.unsplash.com/a.jpg")).toThrow(/https/);
  });

  it("rejects malformed URL", () => {
    expect(() => assertSafeUrl("not-a-url")).toThrow(/Invalid/);
  });

  it("rejects localhost and .internal/.local suffixes", () => {
    expect(() => assertSafeUrl("https://localhost/x")).toThrow(/not allowed/);
    expect(() => assertSafeUrl("https://svc.internal/x")).toThrow(/not allowed/);
    expect(() => assertSafeUrl("https://host.local/x")).toThrow(/not allowed/);
  });

  it("rejects private/link-local/metadata IPs", () => {
    for (const h of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "192.168.1.1", "172.20.0.1"]) {
      expect(() => assertSafeUrl(`https://${h}/x`)).toThrow(/not allowed/);
    }
  });

  it("rejects IPv6 literal hosts", () => {
    expect(() => assertSafeUrl("https://[::1]/x")).toThrow(/not allowed/);
  });

  it("rejects hosts not on allowlist", () => {
    expect(() => assertSafeUrl("https://evil.example.com/x")).toThrow(/allowlist/);
  });

  it("accepts allowlisted hosts and subdomains", () => {
    expect(assertSafeUrl("https://images.unsplash.com/a.jpg").hostname).toBe(
      "images.unsplash.com",
    );
    // subdomain of an allowed host
    expect(
      assertSafeUrl(
        "https://cdn.eesxiwdeeipfzyarycgo.supabase.co/x.jpg",
        DEFAULT_ALLOWED_HOSTS,
      ).hostname,
    ).toBe("cdn.eesxiwdeeipfzyarycgo.supabase.co");
  });
});

describe("fetchImageAsDataUrl (integration)", () => {
  const okFetch = (body = new Uint8Array([1, 2, 3]), mime = "image/png"): typeof fetch =>
    (async () =>
      new Response(body, {
        status: 200,
        headers: { "content-type": mime, "content-length": String(body.byteLength) },
      })) as unknown as typeof fetch;

  it("blocks SSRF to AWS metadata before any fetch is made", async () => {
    let called = false;
    const spyFetch: typeof fetch = (async () => {
      called = true;
      return new Response("", { status: 200 });
    }) as unknown as typeof fetch;
    await expect(
      fetchImageAsDataUrl("https://169.254.169.254/latest/meta-data/", {
        fetchImpl: spyFetch,
      }),
    ).rejects.toThrow(/not allowed/);
    expect(called).toBe(false);
  });

  it("blocks non-allowlisted DNS hostnames without hitting the network", async () => {
    let called = false;
    const spyFetch: typeof fetch = (async () => {
      called = true;
      return new Response("", { status: 200 });
    }) as unknown as typeof fetch;
    await expect(
      fetchImageAsDataUrl("https://attacker.example.com/a.png", { fetchImpl: spyFetch }),
    ).rejects.toThrow(/allowlist/);
    expect(called).toBe(false);
  });

  it("rejects non-image content types", async () => {
    const fetchImpl: typeof fetch = (async () =>
      new Response("hi", {
        status: 200,
        headers: { "content-type": "text/html" },
      })) as unknown as typeof fetch;
    await expect(
      fetchImageAsDataUrl("https://images.unsplash.com/a.jpg", { fetchImpl }),
    ).rejects.toThrow(/did not return an image/);
  });

  it("rejects payloads larger than maxBytes (declared content-length)", async () => {
    const fetchImpl: typeof fetch = (async () =>
      new Response(new Uint8Array(10), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": "9999999" },
      })) as unknown as typeof fetch;
    await expect(
      fetchImageAsDataUrl("https://images.unsplash.com/a.jpg", {
        fetchImpl,
        maxBytes: 1024,
      }),
    ).rejects.toThrow(/too large/);
  });

  it("rejects payloads larger than maxBytes (actual bytes)", async () => {
    const body = new Uint8Array(2048);
    const fetchImpl: typeof fetch = (async () =>
      new Response(body, {
        status: 200,
        headers: { "content-type": "image/png" }, // no content-length
      })) as unknown as typeof fetch;
    await expect(
      fetchImageAsDataUrl("https://images.unsplash.com/a.jpg", {
        fetchImpl,
        maxBytes: 1024,
      }),
    ).rejects.toThrow(/too large/);
  });

  it("aborts slow fetches via timeout", async () => {
    const fetchImpl: typeof fetch = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          (err as Error & { name: string }).name = "AbortError";
          reject(err);
        });
      })) as unknown as typeof fetch;

    await expect(
      fetchImageAsDataUrl("https://images.unsplash.com/a.jpg", {
        fetchImpl,
        timeoutMs: 20,
      }),
    ).rejects.toThrow(/aborted/);
  });

  it("succeeds and returns a data URL on happy path", async () => {
    const url = await fetchImageAsDataUrl("https://images.unsplash.com/a.png", {
      fetchImpl: okFetch(new Uint8Array([137, 80, 78, 71]), "image/png"),
    });
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
  });
});
