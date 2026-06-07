import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { isMutatingMethod, isSameOriginRequest } from "@/lib/origin";

function request(url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(url, init);
}

describe("origin guard", () => {
  it("detects mutating methods", () => {
    expect(isMutatingMethod("POST")).toBe(true);
    expect(isMutatingMethod("PATCH")).toBe(true);
    expect(isMutatingMethod("GET")).toBe(false);
  });

  it("allows same-origin writes and rejects cross-origin writes", () => {
    expect(
      isSameOriginRequest(
        new Request("https://app.example/api/events", {
          method: "POST",
          headers: { origin: "https://app.example" }
        })
      )
    ).toBe(true);

    expect(
      isSameOriginRequest(
        new Request("https://app.example/api/events", {
          method: "POST",
          headers: { origin: "https://evil.example" }
        })
      )
    ).toBe(false);
  });

  it("allows the configured public app origin behind a proxy", () => {
    expect(
      isSameOriginRequest(
        new Request("http://127.0.0.1:3000/api/events", {
          method: "POST",
          headers: { origin: "https://daylife.example" }
        }),
        "https://daylife.example"
      )
    ).toBe(true);
  });
});

describe("middleware request boundaries", () => {
  it("rejects cross-origin API mutations before route handlers run", async () => {
    const response = await middleware(
      request("https://app.example/api/events", {
        method: "POST",
        headers: { origin: "https://evil.example" }
      })
    );
    const body = (await response.json()) as { code: string };

    expect(response.status).toBe(403);
    expect(body.code).toBe("FORBIDDEN_ORIGIN");
  });

  it("allows unauthenticated logout requests so stale cookies can be cleared", async () => {
    const response = await middleware(
      request("https://app.example/api/auth/logout", {
        method: "POST",
        headers: { origin: "https://app.example" }
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
