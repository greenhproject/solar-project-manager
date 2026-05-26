import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock del emailService
vi.mock("./emailService", () => ({
  sendClientInvitationEmail: vi.fn().mockResolvedValue(true),
}));

describe("sendClientInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export sendClientInvitationEmail function", async () => {
    const { sendClientInvitationEmail } = await import("./emailService");
    expect(sendClientInvitationEmail).toBeDefined();
    expect(typeof sendClientInvitationEmail).toBe("function");
  });

  it("should call sendClientInvitationEmail with correct params", async () => {
    const { sendClientInvitationEmail } = await import("./emailService");
    
    const params = {
      toEmail: "cliente@test.com",
      clientName: "Juan Pérez",
      projectName: "Proyecto Solar Test",
      projectId: 123,
      portalUrl: "https://spm.ghp.center/portal",
      senderName: "Admin GreenH",
    };

    const result = await sendClientInvitationEmail(params);
    
    expect(sendClientInvitationEmail).toHaveBeenCalledWith(params);
    expect(result).toBe(true);
  });

  it("should handle missing clientName gracefully", async () => {
    const { sendClientInvitationEmail } = await import("./emailService");
    
    const params = {
      toEmail: "cliente@test.com",
      clientName: "",
      projectName: "Proyecto Solar",
      projectId: 456,
      portalUrl: "http://localhost:3000/portal",
      senderName: "Equipo GreenH",
    };

    const result = await sendClientInvitationEmail(params);
    expect(result).toBe(true);
  });

  it("should return false when email service fails", async () => {
    const { sendClientInvitationEmail } = await import("./emailService");
    (sendClientInvitationEmail as any).mockResolvedValueOnce(false);
    
    const params = {
      toEmail: "invalid@test.com",
      clientName: "Test",
      projectName: "Proyecto",
      projectId: 789,
      portalUrl: "https://spm.ghp.center/portal",
      senderName: "Admin",
    };

    const result = await sendClientInvitationEmail(params);
    expect(result).toBe(false);
  });
});
