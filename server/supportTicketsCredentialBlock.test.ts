import { describe, expect, it } from "vitest";
import { parseSupportTicketsCredentialBlock } from "../client/src/lib/supportTicketsCredentialBlock";

describe("parseSupportTicketsCredentialBlock", () => {
  it("extracts the complete Solar Project Manager HMAC block", () => {
    const result = parseSupportTicketsCredentialBlock([
      "SUPPORT_TICKETS_API_URL=https://soporte-backend-ghp-production.up.railway.app",
      "SUPPORT_TICKETS_SOURCE_KEY=spm_example_source_key",
      "SUPPORT_TICKETS_SIGNING_SECRET=very-long-hmac-secret-created-by-support",
    ].join("\n"));

    expect(result).toEqual({
      kind: "complete",
      apiUrl: "https://soporte-backend-ghp-production.up.railway.app",
      sourceKey: "spm_example_source_key",
      signingSecret: "very-long-hmac-secret-created-by-support",
    });
  });

  it("rejects the ghps_live external API key because it lacks the HMAC pair", () => {
    const result = parseSupportTicketsCredentialBlock(
      "GHP_SOPORTE_API_KEY=ghps_live_example_external_read_only_key",
    );

    expect(result.kind).toBe("external_api_key");
    if (result.kind === "external_api_key") {
      expect(result.message).toContain("tickets.read");
    }
  });

  it("identifies an incomplete or manually copied block", () => {
    const result = parseSupportTicketsCredentialBlock(
      "SUPPORT_TICKETS_SOURCE_KEY=spm_example_source_key",
    );

    expect(result).toEqual({
      kind: "incomplete",
      missing: ["SUPPORT_TICKETS_SIGNING_SECRET"],
    });
  });
});
