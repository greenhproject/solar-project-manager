import { describe, it, expect } from "vitest";
import { normalizeMilestoneState } from "./db";

describe("normalizeMilestoneState", () => {
  describe("completedDate present but status not completed", () => {
    it("when status is explicitly pending, status wins and completedDate is cleared", () => {
      // Business rule: explicit status change takes priority
      const result = normalizeMilestoneState({
        completedDate: new Date("2026-07-13"),
        status: "pending",
      });
      expect(result.status).toBe("pending");
      expect(result.completedDate).toBeNull();
    });

    it("when status is explicitly in_progress, status wins and completedDate is cleared", () => {
      const result = normalizeMilestoneState({
        completedDate: new Date("2026-07-13"),
        status: "in_progress",
      });
      expect(result.status).toBe("in_progress");
      expect(result.completedDate).toBeNull();
    });

    it("should force status to completed when completedDate is set and status is undefined", () => {
      // When no explicit status is given, completedDate implies completed
      const result = normalizeMilestoneState({
        completedDate: new Date("2026-07-13"),
      });
      expect(result.status).toBe("completed");
    });

    it("should force status to completed when completedDate is set and status is overdue", () => {
      // overdue is not an explicit 'revert' so completedDate wins
      const result = normalizeMilestoneState({
        completedDate: new Date("2026-07-13"),
        status: "overdue",
      });
      expect(result.status).toBe("completed");
    });
  });

  describe("status completed but no completedDate", () => {
    it("should fill completedDate when status is completed and completedDate is null", () => {
      const result = normalizeMilestoneState({
        status: "completed",
        completedDate: null,
      });
      expect(result.status).toBe("completed");
      expect(result.completedDate).toBeInstanceOf(Date);
    });

    it("should fill completedDate when status is completed and completedDate is undefined", () => {
      const result = normalizeMilestoneState({
        status: "completed",
      });
      expect(result.status).toBe("completed");
      expect(result.completedDate).toBeInstanceOf(Date);
    });
  });

  describe("status pending/in_progress should clear completedDate", () => {
    it("should clear completedDate when status is pending", () => {
      const result = normalizeMilestoneState({
        status: "pending",
        completedDate: new Date("2026-07-13"),
      });
      expect(result.status).toBe("pending");
      expect(result.completedDate).toBeNull();
    });

    it("should clear completedDate when status is in_progress", () => {
      const result = normalizeMilestoneState({
        status: "in_progress",
        completedDate: new Date("2026-07-13"),
      });
      expect(result.status).toBe("in_progress");
      expect(result.completedDate).toBeNull();
    });
  });

  describe("consistent states should pass through unchanged", () => {
    it("should not modify when status is completed and completedDate is present", () => {
      const date = new Date("2026-07-13");
      const result = normalizeMilestoneState({
        status: "completed",
        completedDate: date,
      });
      expect(result.status).toBe("completed");
      expect(result.completedDate).toEqual(date);
    });

    it("should not modify when status is pending and no completedDate fields", () => {
      const result = normalizeMilestoneState({
        status: "pending",
        name: "Test milestone",
      } as any);
      expect(result.status).toBe("pending");
    });

    it("should not modify when only updating name (no status/date fields)", () => {
      const result = normalizeMilestoneState({
        name: "Updated name",
      } as any);
      expect(result.name).toBe("Updated name");
      expect(result.status).toBeUndefined();
      expect(result.completedDate).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty object", () => {
      const result = normalizeMilestoneState({});
      expect(result).toEqual({});
    });

    it("should handle overdue status (not pending/in_progress) with completedDate", () => {
      // overdue with completedDate should force completed
      const result = normalizeMilestoneState({
        status: "overdue",
        completedDate: new Date("2026-07-13"),
      });
      expect(result.status).toBe("completed");
    });
  });
});
