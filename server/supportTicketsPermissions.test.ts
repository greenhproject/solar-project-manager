import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type Role = NonNullable<TrpcContext["user"]>["role"];

function createContext(role: Role): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `test-${role}`,
      email: `${role}@greenhproject.com`,
      name: `Test ${role}`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("supportTickets administrative permissions", () => {
  it("rejects a non-admin before exposing integration status", async () => {
    const caller = appRouter.createCaller(createContext("engineer"));

    await expect(caller.supportTickets.getConfiguration()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a non-admin before accepting source or signing-secret fields", async () => {
    const caller = appRouter.createCaller(createContext("engineer"));

    await expect(caller.supportTickets.saveConfiguration({
      enabled: false,
      apiUrl: "https://soporte-backend-ghp-production.up.railway.app",
      sourceKey: "spm_not_allowed_test_key",
      signingSecret: "not-allowed-signing-secret-with-enough-length",
    })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows an administrator to reach the status procedure", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    const result = await caller.supportTickets.getConfiguration();

    expect(result).toHaveProperty("credentialsConfigured");
    expect(result).toHaveProperty("credentialsSource");
    expect(result).not.toHaveProperty("sourceKey");
    expect(result).not.toHaveProperty("signingSecret");
  });
});
