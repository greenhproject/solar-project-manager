import crypto from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSupportTicketsRequestSignature,
  getSupportTicketSummary,
  getSupportTicketsConfigurationStatus,
} from "./supportTicketsIntegration";

const envKeys = [
  "SUPPORT_TICKETS_API_URL",
  "SUPPORT_TICKETS_SOURCE_KEY",
  "SUPPORT_TICKETS_SIGNING_SECRET",
] as const;
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("Support ticket integration", () => {
  it("signs the precise timestamp, method, path and normalized recipient", () => {
    const signature = buildSupportTicketsRequestSignature({
      secret: "secret",
      timestamp: "1789830000",
      method: "get",
      path: "/api/integrations/spm/projects/9255866/tickets-summary",
      recipientEmail: " Tecnico@GreenHProject.com ",
    });

    const expected = crypto
      .createHmac("sha256", "secret")
      .update("1789830000.GET./api/integrations/spm/projects/9255866/tickets-summary.tecnico@greenhproject.com")
      .digest("hex");

    expect(signature).toBe(expected);
  });

  it("reports missing configuration without attempting a remote request", async () => {
    delete process.env.SUPPORT_TICKETS_API_URL;
    delete process.env.SUPPORT_TICKETS_SOURCE_KEY;
    delete process.env.SUPPORT_TICKETS_SIGNING_SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(getSupportTicketsConfigurationStatus().configured).toBe(false);
    await expect(getSupportTicketSummary({
      projectExternalId: "9255866",
      recipientEmail: "tecnico@greenhproject.com",
    })).resolves.toEqual({
      available: false,
      projectExternalId: "9255866",
      activeTicketCount: 0,
      tickets: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests only the user-filtered project summary and strips invalid records", async () => {
    process.env.SUPPORT_TICKETS_API_URL = "https://soporte-backend-ghp-production.up.railway.app/";
    process.env.SUPPORT_TICKETS_SOURCE_KEY = "spm-test-source";
    process.env.SUPPORT_TICKETS_SIGNING_SECRET = "spm-test-secret";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      projectExternalId: "9255866",
      activeTicketCount: 2,
      tickets: [
        {
          ticketId: "9255866-001",
          status: "in_progress",
          priority: "high",
          actionUrl: "https://soporte.ghp.center/tickets/9255866-001",
        },
        {
          ticketId: "9255866-002",
          status: "resolved",
          priority: "critical",
          actionUrl: "javascript:alert(1)",
        },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getSupportTicketSummary({
      projectExternalId: "9255866",
      recipientEmail: "Tecnico@GreenHProject.com",
    });

    expect(result).toEqual({
      available: true,
      projectExternalId: "9255866",
      activeTicketCount: 1,
      tickets: [{
        ticketId: "9255866-001",
        status: "in_progress",
        priority: "high",
        actionUrl: "https://soporte.ghp.center/tickets/9255866-001",
      }],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://soporte-backend-ghp-production.up.railway.app/api/integrations/spm/projects/9255866/tickets-summary");
    expect(options.headers["X-GHP-Recipient-Email"]).toBe("tecnico@greenhproject.com");
    expect(options.headers["X-GHP-Source"]).toBe("spm-test-source");
    expect(options.headers["X-GHP-Signature"]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed when the remote service rejects the request", async () => {
    process.env.SUPPORT_TICKETS_API_URL = "https://soporte-backend-ghp-production.up.railway.app";
    process.env.SUPPORT_TICKETS_SOURCE_KEY = "spm-test-source";
    process.env.SUPPORT_TICKETS_SIGNING_SECRET = "spm-test-secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));

    await expect(getSupportTicketSummary({
      projectExternalId: "9255866",
      recipientEmail: "tecnico@greenhproject.com",
    })).resolves.toEqual({
      available: false,
      projectExternalId: "9255866",
      activeTicketCount: 0,
      tickets: [],
    });
  });
});
