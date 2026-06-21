import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";

describe("SSO Callback - CRM_SSO_SECRET validation", () => {
  const SSO_SECRET = process.env.CRM_SSO_SECRET || process.env.SSO_SECRET || "";
  const BASE_URL = "http://localhost:3000";

  it("CRM_SSO_SECRET está configurado", () => {
    expect(SSO_SECRET).toBeTruthy();
    expect(SSO_SECRET.length).toBeGreaterThan(10);
  });

  it("puede generar un JWT válido con CRM_SSO_SECRET", async () => {
    const secretKey = new TextEncoder().encode(SSO_SECRET);
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      sub: "test-user-1",
      email: "test-sso@greenhproject.com",
      name: "Test SSO User",
      role: "admin",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("ghp-hub")
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(secretKey);

    expect(token).toBeTruthy();
    expect(token.split(".")).toHaveLength(3);
  });

  it("GET /api/sso/callback sin token devuelve 400", async () => {
    const res = await fetch(`${BASE_URL}/api/sso/callback`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Token JWT requerido");
  });

  it("GET /api/sso/callback con token inválido devuelve 401", async () => {
    const res = await fetch(`${BASE_URL}/api/sso/callback?token=invalid-token-xyz`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("inválido o expirado");
  });

  it("GET /api/sso/callback con JWT válido redirige (302)", async () => {
    const secretKey = new TextEncoder().encode(SSO_SECRET);
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      sub: "1",
      email: "greenhproject@gmail.com",
      name: "Green House Project",
      role: "admin",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("ghp-hub")
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(secretKey);

    const res = await fetch(`${BASE_URL}/api/sso/callback?token=${token}`, {
      redirect: "manual", // No seguir redirects
    });

    // Debe redirigir (302) al dashboard
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).toContain("/dashboard");
  });

  it("GET /api/sso/callback con JWT expirado devuelve 401", async () => {
    const secretKey = new TextEncoder().encode(SSO_SECRET);
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      sub: "1",
      email: "greenhproject@gmail.com",
      name: "Green House Project",
      role: "admin",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("ghp-hub")
      .setIssuedAt(now - 600)
      .setExpirationTime(now - 300) // Expirado hace 5 min
      .sign(secretKey);

    const res = await fetch(`${BASE_URL}/api/sso/callback?token=${token}`);
    expect(res.status).toBe(401);
  });

  it("GET /api/sso/callback con JWT firmado con secret incorrecto devuelve 401", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret-12345");
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      sub: "1",
      email: "greenhproject@gmail.com",
      name: "Green House Project",
      role: "admin",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("ghp-hub")
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(wrongSecret);

    const res = await fetch(`${BASE_URL}/api/sso/callback?token=${token}`);
    expect(res.status).toBe(401);
  });
});
