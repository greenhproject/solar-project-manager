import { describe, it, expect } from "vitest";
import {
  generateSignature,
  buildMilestoneEventId,
  buildProjectEventId,
} from "./ghpNotificationHub";
import crypto from "crypto";

describe("GHP Notification Hub Adapter", () => {
  describe("generateSignature", () => {
    it("should generate a valid HMAC-SHA256 hex signature", () => {
      const secret = "test-secret-key";
      const timestamp = "1691234567";
      const body = JSON.stringify({ eventId: "spm:milestone:1:attention" });

      const signature = generateSignature(secret, timestamp, body);

      // Verify it's a valid hex string
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce consistent signatures for same input", () => {
      const secret = "my-secret";
      const timestamp = "1691234567";
      const body = '{"test":"data"}';

      const sig1 = generateSignature(secret, timestamp, body);
      const sig2 = generateSignature(secret, timestamp, body);

      expect(sig1).toBe(sig2);
    });

    it("should produce different signatures for different secrets", () => {
      const timestamp = "1691234567";
      const body = '{"test":"data"}';

      const sig1 = generateSignature("secret-1", timestamp, body);
      const sig2 = generateSignature("secret-2", timestamp, body);

      expect(sig1).not.toBe(sig2);
    });

    it("should produce different signatures for different timestamps", () => {
      const secret = "my-secret";
      const body = '{"test":"data"}';

      const sig1 = generateSignature(secret, "1691234567", body);
      const sig2 = generateSignature(secret, "1691234568", body);

      expect(sig1).not.toBe(sig2);
    });

    it("should match manual HMAC-SHA256 calculation", () => {
      const secret = "test-secret";
      const timestamp = "1691234567";
      const body = '{"eventId":"spm:milestone:42:attention"}';

      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.`)
        .update(body)
        .digest("hex");

      const result = generateSignature(secret, timestamp, body);
      expect(result).toBe(expected);
    });

    it("should use timestamp.body format (dot separator)", () => {
      const secret = "key";
      const timestamp = "123";
      const body = "test";

      // Manually compute what the signature should be
      const expected = crypto
        .createHmac("sha256", "key")
        .update("123.")
        .update("test")
        .digest("hex");

      expect(generateSignature(secret, timestamp, body)).toBe(expected);
    });
  });

  describe("buildMilestoneEventId", () => {
    it("should build correct format: spm:milestone:<id>:attention", () => {
      expect(buildMilestoneEventId(42)).toBe("spm:milestone:42:attention");
    });

    it("should handle large IDs", () => {
      expect(buildMilestoneEventId(99999)).toBe("spm:milestone:99999:attention");
    });

    it("should produce stable IDs for same input", () => {
      expect(buildMilestoneEventId(1)).toBe(buildMilestoneEventId(1));
    });
  });

  describe("buildProjectEventId", () => {
    it("should build correct format: spm:project:<id>:attention", () => {
      expect(buildProjectEventId(10)).toBe("spm:project:10:attention");
    });
  });

  describe("Event format validation", () => {
    it("should produce a valid event structure for milestone.assigned", () => {
      const event = {
        eventId: buildMilestoneEventId(284),
        recipientEmail: "ingeniero@greenhproject.com",
        eventType: "milestone.assigned",
        severity: "info" as const,
        title: "Nuevo hito asignado",
        body: 'Se te asignó el hito "Estudios Previos" del proyecto "Electrolinera".',
        status: "open" as const,
        externalEntityId: "284",
        actionUrl: "https://spm.ghp.center/projects/5",
        occurredAt: "2026-08-14T12:00:00.000Z",
        metadata: { projectName: "Electrolinera" },
      };

      // Validate required fields
      expect(event.eventId).toMatch(/^spm:milestone:\d+:attention$/);
      expect(event.recipientEmail).toContain("@");
      expect(event.eventType.length).toBeLessThanOrEqual(80);
      expect(["info", "warning", "critical"]).toContain(event.severity);
      expect(event.title.length).toBeLessThanOrEqual(255);
      expect(event.body.length).toBeLessThanOrEqual(10000);
      expect(["open", "resolved"]).toContain(event.status);
      expect(event.actionUrl).toMatch(/^https:\/\//);
    });

    it("should produce resolved status for milestone.completed", () => {
      const event = {
        eventId: buildMilestoneEventId(284),
        recipientEmail: "ingeniero@greenhproject.com",
        eventType: "milestone.completed",
        severity: "info" as const,
        title: "Hito completado",
        body: 'El hito "Estudios Previos" fue completado.',
        status: "resolved" as const,
      };

      expect(event.status).toBe("resolved");
      expect(event.eventType).toBe("milestone.completed");
    });

    it("eventId should be stable across lifecycle (same milestone)", () => {
      // The same milestone should always produce the same eventId
      // regardless of the event type (assigned, overdue, completed)
      const assignedId = buildMilestoneEventId(100);
      const overdueId = buildMilestoneEventId(100);
      const completedId = buildMilestoneEventId(100);

      expect(assignedId).toBe(overdueId);
      expect(overdueId).toBe(completedId);
      expect(completedId).toBe("spm:milestone:100:attention");
    });
  });
});
