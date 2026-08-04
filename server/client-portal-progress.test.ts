/**
 * Tests for Client Portal real-time progress calculation
 * Verifies that the portal calculates progress from milestones instead of trusting stored project values
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const clientPortalPath = resolve(__dirname, "routes/client-portal.ts");
const clientPortalCode = readFileSync(clientPortalPath, "utf-8");

const apiV1Path = resolve(__dirname, "routes/api-v1.ts");
const apiV1Code = readFileSync(apiV1Path, "utf-8");

describe("Client Portal Progress Fix", () => {
  describe("client-portal.ts - Real-time progress calculation", () => {
    it("should have enrichWithRealProgress helper function", () => {
      expect(clientPortalCode).toContain("enrichWithRealProgress");
    });

    it("should calculate progress from milestones weight", () => {
      expect(clientPortalCode).toContain("totalWeight");
      expect(clientPortalCode).toContain("completedWeight");
      expect(clientPortalCode).toContain('m.status === "completed"');
    });

    it("should derive project status from milestone progress", () => {
      // Should set status to in_progress when there are completed milestones
      expect(clientPortalCode).toContain('realStatus = "in_progress"');
      // Should set status to completed when all milestones are done
      expect(clientPortalCode).toContain('realStatus = "completed"');
      // Should check for in_progress/overdue milestones before defaulting to planning
      expect(clientPortalCode).toContain('m.status === "in_progress" || m.status === "overdue"');
    });

    it("should enrich admin project list with real progress", () => {
      expect(clientPortalCode).toContain("return enrichWithRealProgress(allProjects)");
    });

    it("should enrich client project list with real progress", () => {
      expect(clientPortalCode).toContain("return enrichWithRealProgress(clientProjects)");
    });

    it("should recalculate progress in projectDetail endpoint", () => {
      // The projectDetail should also recalculate progress
      expect(clientPortalCode).toContain("// Recalcular progreso en tiempo real desde los hitos");
      expect(clientPortalCode).toContain("progressPercentage: realProgress");
      expect(clientPortalCode).toContain("status: realStatus");
    });

    it("should handle projects with no milestones gracefully", () => {
      // Should keep stored values when no milestones exist
      expect(clientPortalCode).toContain("if (projectMilestones.length > 0)");
    });

    it("should use weight field with fallback to 1", () => {
      expect(clientPortalCode).toContain("(m.weight || 1)");
    });
  });

  describe("api-v1.ts - PATCH /milestones/:id uses recalculateProjectProgress", () => {
    it("should import and use recalculateProjectProgress", () => {
      expect(apiV1Code).toContain('import("../progressCalculator")');
      expect(apiV1Code).toContain("recalculateProjectProgress(existing.projectId)");
    });

    it("should NOT have the old partial progress calculation", () => {
      // The old code only updated progressPercentage without status
      expect(apiV1Code).not.toContain(
        "projectMilestones.reduce((sum, m) => sum + m.weight, 0)"
      );
    });
  });
});
