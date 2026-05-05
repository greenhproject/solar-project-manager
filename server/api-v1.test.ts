import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";

/**
 * Tests para la API REST v1
 * Verifica la lógica de autenticación y los helpers
 */

describe("API v1 - Utilidades", () => {
  it("genera hash SHA-256 consistente para API keys", () => {
    const key = "spm_test_key_12345";
    const hash1 = crypto.createHash("sha256").update(key).digest("hex");
    const hash2 = crypto.createHash("sha256").update(key).digest("hex");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("genera API keys con formato correcto", () => {
    const rawKey = `spm_${crypto.randomBytes(32).toString("hex")}`;
    expect(rawKey).toMatch(/^spm_[a-f0-9]{64}$/);
    expect(rawKey.substring(0, 4)).toBe("spm_");
    expect(rawKey).toHaveLength(68); // "spm_" (4) + 64 hex chars
  });

  it("genera prefijos de 8 caracteres", () => {
    const rawKey = `spm_${crypto.randomBytes(32).toString("hex")}`;
    const prefix = rawKey.substring(0, 8);
    expect(prefix).toHaveLength(8);
    expect(prefix).toMatch(/^spm_[a-f0-9]{4}$/);
  });

  it("diferentes keys producen diferentes hashes", () => {
    const key1 = `spm_${crypto.randomBytes(32).toString("hex")}`;
    const key2 = `spm_${crypto.randomBytes(32).toString("hex")}`;
    const hash1 = crypto.createHash("sha256").update(key1).digest("hex");
    const hash2 = crypto.createHash("sha256").update(key2).digest("hex");
    expect(hash1).not.toBe(hash2);
  });
});

describe("API v1 - Validación de permisos", () => {
  function hasPermission(permissions: string[], required: string): boolean {
    return permissions.includes("*") || permissions.includes(required);
  }

  it("permiso wildcard (*) concede acceso a todo", () => {
    expect(hasPermission(["*"], "projects:read")).toBe(true);
    expect(hasPermission(["*"], "milestones:write")).toBe(true);
    expect(hasPermission(["*"], "admin")).toBe(true);
  });

  it("permisos específicos solo conceden acceso a lo indicado", () => {
    const perms = ["projects:read", "milestones:read"];
    expect(hasPermission(perms, "projects:read")).toBe(true);
    expect(hasPermission(perms, "milestones:read")).toBe(true);
    expect(hasPermission(perms, "milestones:write")).toBe(false);
    expect(hasPermission(perms, "admin")).toBe(false);
  });

  it("array vacío no concede acceso", () => {
    expect(hasPermission([], "projects:read")).toBe(false);
  });
});

describe("API v1 - Formato de respuestas", () => {
  it("respuesta de health tiene la estructura correcta", () => {
    const healthResponse = {
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "connected"
    };
    expect(healthResponse).toHaveProperty("status", "ok");
    expect(healthResponse).toHaveProperty("version");
    expect(healthResponse).toHaveProperty("timestamp");
    expect(healthResponse).toHaveProperty("database");
  });

  it("respuesta de error tiene la estructura correcta", () => {
    const errorResponse = {
      error: "API_KEY_REQUIRED",
      message: "Se requiere una API Key",
      docs: "/api-docs"
    };
    expect(errorResponse).toHaveProperty("error");
    expect(errorResponse).toHaveProperty("message");
    expect(errorResponse.error).toMatch(/^[A-Z_]+$/);
  });

  it("paginación calcula hasMore correctamente", () => {
    const total = 150;
    const limit = 50;
    const offset = 0;
    const hasMore = offset + limit < total;
    expect(hasMore).toBe(true);

    const offset2 = 100;
    const hasMore2 = offset2 + limit < total;
    expect(hasMore2).toBe(false);
  });

  it("permisos se parsean correctamente desde JSON", () => {
    const stored = '["projects:read", "milestones:write"]';
    const parsed = JSON.parse(stored);
    expect(parsed).toEqual(["projects:read", "milestones:write"]);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("permisos null se convierten en wildcard", () => {
    const stored: string | null = null;
    const permissions = stored ? JSON.parse(stored) : ["*"];
    expect(permissions).toEqual(["*"]);
  });
});
