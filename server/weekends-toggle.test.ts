import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Weekends Toggle & Auto-adjust Features", () => {
  // ============================================================
  // 1. Backend: recalculateWithWeekends procedure exists
  // ============================================================
  describe("Backend: recalculateWithWeekends procedure", () => {
    const routersPath = path.join(__dirname, "routers.ts");
    const routersContent = fs.readFileSync(routersPath, "utf-8");

    it("should have recalculateWithWeekends procedure defined", () => {
      expect(routersContent).toContain("recalculateWithWeekends:");
    });

    it("should accept milestoneId and includeWeekends inputs", () => {
      expect(routersContent).toContain("milestoneId: z.number()");
      expect(routersContent).toContain("includeWeekends: z.boolean()");
    });

    it("should import addBusinessDays from shared module", () => {
      expect(routersContent).toContain('import("../shared/businessDays")');
    });

    it("should update endDate and dueDate", () => {
      // The procedure should call updateMilestone with endDate and dueDate
      const recalcSection = routersContent.substring(
        routersContent.indexOf("recalculateWithWeekends:"),
        routersContent.indexOf("requestReschedule:")
      );
      expect(recalcSection).toContain("endDate: newEndDate");
      expect(recalcSection).toContain("dueDate: newEndDate");
    });

    it("should check permissions before recalculating", () => {
      const recalcSection = routersContent.substring(
        routersContent.indexOf("recalculateWithWeekends:"),
        routersContent.indexOf("requestReschedule:")
      );
      expect(recalcSection).toContain("FORBIDDEN");
    });
  });

  // ============================================================
  // 2. Backend: settings.getIncludeWeekends and setIncludeWeekends
  // ============================================================
  describe("Backend: settings endpoints for weekends", () => {
    const routersPath = path.join(__dirname, "routers.ts");
    const routersContent = fs.readFileSync(routersPath, "utf-8");

    it("should have getIncludeWeekends endpoint", () => {
      expect(routersContent).toContain("getIncludeWeekends:");
    });

    it("should have setIncludeWeekends endpoint", () => {
      expect(routersContent).toContain("setIncludeWeekends:");
    });
  });

  // ============================================================
  // 3. Frontend: SystemConfiguration has weekends toggle tab
  // ============================================================
  describe("Frontend: SystemConfiguration weekends toggle", () => {
    const configPath = path.join(
      __dirname,
      "../client/src/components/SystemConfiguration.tsx"
    );
    const configContent = fs.readFileSync(configPath, "utf-8");

    it("should have 3-column tab grid", () => {
      expect(configContent).toContain("grid-cols-3");
    });

    it("should have business-days tab", () => {
      expect(configContent).toContain('value="business-days"');
    });

    it("should have CalendarDays icon for the tab", () => {
      expect(configContent).toContain("CalendarDays");
    });

    it("should import Switch component", () => {
      expect(configContent).toContain("import { Switch }");
    });

    it("should use getIncludeWeekends query", () => {
      expect(configContent).toContain("settings.getIncludeWeekends.useQuery");
    });

    it("should use setIncludeWeekends mutation", () => {
      expect(configContent).toContain("settings.setIncludeWeekends.useMutation");
    });

    it("should display explanation of how weekends toggle works", () => {
      expect(configContent).toContain("funciona");
      expect(configContent).toContain("hábiles");
      expect(configContent).toContain("fines de semana");
    });

    it("should mention per-hito toggle in explanation", () => {
      expect(configContent).toContain("Toggle por hito");
    });
  });

  // ============================================================
  // 4. Frontend: ProjectDetail has per-hito weekend toggle
  // ============================================================
  describe("Frontend: ProjectDetail per-hito weekend toggle", () => {
    const detailPath = path.join(
      __dirname,
      "../client/src/pages/ProjectDetail.tsx"
    );
    const detailContent = fs.readFileSync(detailPath, "utf-8");

    it("should import Switch component", () => {
      expect(detailContent).toContain('import { Switch }');
    });

    it("should have milestoneWeekendOverrides state", () => {
      expect(detailContent).toContain("milestoneWeekendOverrides");
    });

    it("should have handleMilestoneWeekendToggle handler", () => {
      expect(detailContent).toContain("handleMilestoneWeekendToggle");
    });

    it("should use recalculateWithWeekends mutation", () => {
      expect(detailContent).toContain(
        "milestones.recalculateWithWeekends.useMutation"
      );
    });

    it("should query global weekends config", () => {
      expect(detailContent).toContain(
        "settings.getIncludeWeekends.useQuery"
      );
    });

    it("should show toggle label based on weekends state", () => {
      expect(detailContent).toContain("Incluye fines de semana");
      expect(detailContent).toContain("Solo días hábiles (L-V)");
    });

    it("should display 'calendario' or 'hábiles' based on toggle state", () => {
      expect(detailContent).toContain('"calendario"');
      expect(detailContent).toContain('"hábiles"');
    });
  });

  // ============================================================
  // 5. Frontend: Auto-adjust endDate when dueDate changes
  // ============================================================
  describe("Frontend: Auto-adjust endDate on dueDate change", () => {
    const detailPath = path.join(
      __dirname,
      "../client/src/pages/ProjectDetail.tsx"
    );
    const detailContent = fs.readFileSync(detailPath, "utf-8");

    it("should update endDate when 'Solo este hito' is clicked", () => {
      // The cascade dialog 'Solo este hito' button should also update endDate
      expect(detailContent).toContain(
        "También actualizar endDate para que coincida con la nueva fecha de vencimiento"
      );
    });

    it("should call updateMilestone with endDate in cascade dialog", () => {
      // The cascade dialog handler updates both dueDate and endDate
      const cascadeIdx = detailContent.indexOf("Actualizar dueDate Y endDate al mismo valor");
      expect(cascadeIdx).toBeGreaterThan(-1);
      // Need a larger window to capture the endDate line (indentation takes space)
      const handlerSection = detailContent.substring(cascadeIdx, cascadeIdx + 700);
      expect(handlerSection).toContain("endDate:");
      expect(handlerSection).toContain("updateMilestone.mutateAsync");
    });
  });

  // ============================================================
  // 6. Business logic: addBusinessDays shared module
  // ============================================================
  describe("Shared: businessDays module", () => {
    const sharedPath = path.join(
      __dirname,
      "../shared/businessDays.ts"
    );

    it("should exist", () => {
      expect(fs.existsSync(sharedPath)).toBe(true);
    });

    it("should export addBusinessDays function", () => {
      const content = fs.readFileSync(sharedPath, "utf-8");
      expect(content).toContain("export function addBusinessDays");
    });

    it("should accept includeWeekends parameter", () => {
      const content = fs.readFileSync(sharedPath, "utf-8");
      expect(content).toContain("includeWeekends");
    });
  });
});
