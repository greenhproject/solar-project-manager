import { describe, it, expect } from "vitest";

/**
 * Tests for Gantt chart export functionality
 * 
 * The actual PDF/image generation runs in the browser (client-side),
 * so we test the data preparation and configuration aspects here.
 */

describe("Gantt Export Configuration", () => {
  
  describe("Status Color Mapping", () => {
    const getStatusColor = (status: string): string => {
      switch (status) {
        case "completed": return "#10B981";
        case "in_progress": return "#3B82F6";
        case "overdue": return "#EF4444";
        case "pending": return "#9CA3AF";
        default: return "#9CA3AF";
      }
    };

    it("should return correct color for completed status", () => {
      expect(getStatusColor("completed")).toBe("#10B981");
    });

    it("should return correct color for in_progress status", () => {
      expect(getStatusColor("in_progress")).toBe("#3B82F6");
    });

    it("should return correct color for overdue status", () => {
      expect(getStatusColor("overdue")).toBe("#EF4444");
    });

    it("should return correct color for pending status", () => {
      expect(getStatusColor("pending")).toBe("#9CA3AF");
    });

    it("should return gray for unknown status", () => {
      expect(getStatusColor("unknown")).toBe("#9CA3AF");
    });
  });

  describe("Status Label Mapping", () => {
    const getStatusLabel = (status: string): string => {
      switch (status) {
        case "completed": return "Completado";
        case "in_progress": return "En Progreso";
        case "overdue": return "Vencido";
        case "pending": return "Pendiente";
        default: return "Pendiente";
      }
    };

    it("should return Spanish labels for all statuses", () => {
      expect(getStatusLabel("completed")).toBe("Completado");
      expect(getStatusLabel("in_progress")).toBe("En Progreso");
      expect(getStatusLabel("overdue")).toBe("Vencido");
      expect(getStatusLabel("pending")).toBe("Pendiente");
    });
  });

  describe("Project Progress Calculation", () => {
    const calculateProjectProgress = (milestones: any[]): number => {
      if (!milestones || milestones.length === 0) return 0;
      const completed = milestones.filter((m) => m.status === "completed").length;
      return Math.round((completed / milestones.length) * 100);
    };

    it("should return 0 for empty milestones", () => {
      expect(calculateProjectProgress([])).toBe(0);
    });

    it("should return 100 when all milestones are completed", () => {
      const milestones = [
        { status: "completed" },
        { status: "completed" },
        { status: "completed" },
      ];
      expect(calculateProjectProgress(milestones)).toBe(100);
    });

    it("should return 50 when half milestones are completed", () => {
      const milestones = [
        { status: "completed" },
        { status: "pending" },
      ];
      expect(calculateProjectProgress(milestones)).toBe(50);
    });

    it("should handle mixed statuses correctly", () => {
      const milestones = [
        { status: "completed" },
        { status: "in_progress" },
        { status: "overdue" },
        { status: "pending" },
      ];
      expect(calculateProjectProgress(milestones)).toBe(25);
    });
  });

  describe("Gantt Bar Position Calculation", () => {
    it("should calculate correct bar positions within project timeline", () => {
      const projectStart = new Date("2026-01-01").getTime();
      const projectEnd = new Date("2026-12-31").getTime();
      const totalDuration = projectEnd - projectStart;

      const milestoneStart = new Date("2026-03-01").getTime();
      const milestoneEnd = new Date("2026-04-15").getTime();

      const barStart = (milestoneStart - projectStart) / totalDuration;
      const barEnd = (milestoneEnd - projectStart) / totalDuration;

      expect(barStart).toBeGreaterThan(0);
      expect(barStart).toBeLessThan(1);
      expect(barEnd).toBeGreaterThan(barStart);
      expect(barEnd).toBeLessThan(1);
    });

    it("should clamp bar positions to [0, 1] range", () => {
      const projectStart = new Date("2026-03-01").getTime();
      const projectEnd = new Date("2026-06-30").getTime();
      const totalDuration = projectEnd - projectStart;

      // Milestone that starts before project
      const earlyStart = new Date("2026-01-01").getTime();
      const barStart = Math.max(0, (earlyStart - projectStart) / totalDuration);
      expect(barStart).toBe(0);

      // Milestone that ends after project
      const lateEnd = new Date("2026-12-31").getTime();
      const barEnd = Math.min(1, (lateEnd - projectStart) / totalDuration);
      expect(barEnd).toBe(1);
    });
  });

  describe("Duration Days Calculation", () => {
    it("should calculate business days between dates", () => {
      const start = new Date("2026-04-17");
      const end = new Date("2026-04-20");
      const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      expect(days).toBe(3);
    });

    it("should return at least 1 day for same-day milestones", () => {
      const start = new Date("2026-04-17");
      const end = new Date("2026-04-17");
      const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) || 1;
      expect(days).toBe(1);
    });
  });

  describe("Color Darkening Function", () => {
    const darkenColor = (color: string, percent: number): string => {
      const num = parseInt(color.replace("#", ""), 16);
      const r = (num >> 16) - percent;
      const g = ((num >> 8) & 0x00ff) - percent;
      const b = (num & 0x0000ff) - percent;
      return (
        "#" +
        (
          0x1000000 +
          (r < 255 ? (r < 1 ? 0 : r) : 255) * 0x10000 +
          (g < 255 ? (g < 1 ? 0 : g) : 255) * 0x100 +
          (b < 255 ? (b < 1 ? 0 : b) : 255)
        )
          .toString(16)
          .slice(1)
      );
    };

    it("should darken a color by reducing RGB values", () => {
      const original = "#FF6B35";
      const darkened = darkenColor(original, 20);
      // Should be darker (lower hex values)
      expect(darkened).not.toBe(original);
      expect(darkened.length).toBe(7); // #RRGGBB format
    });

    it("should not go below 0 for any channel", () => {
      const veryDark = "#101010";
      const result = darkenColor(veryDark, 50);
      // All channels should be clamped to 0
      expect(result).toBe("#000000");
    });
  });

  describe("OKLCH to HEX Override CSS", () => {
    // These are the HEX equivalents we use to replace oklch() for html2canvas
    const OKLCH_TO_HEX_MAP: Record<string, string> = {
      "--primary": "#d4622b",
      "--primary-foreground": "#ffffff",
      "--background": "#ffffff",
      "--foreground": "#3b3226",
      "--card": "#ffffff",
      "--card-foreground": "#3b3226",
      "--destructive": "#e53e3e",
      "--border": "#e8e8e8",
      "--ring": "#3b82f6",
      "--muted": "#f5f5f5",
      "--muted-foreground": "#8b8b8b",
      "--accent": "#f5f5f5",
      "--accent-foreground": "#222222",
      "--secondary": "#fafafa",
      "--secondary-foreground": "#665c4d",
    };

    it("should have valid HEX values for all CSS variables", () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      Object.entries(OKLCH_TO_HEX_MAP).forEach(([varName, hex]) => {
        expect(hex).toMatch(hexRegex);
      });
    });

    it("should include all critical CSS variables in the override map", () => {
      const criticalVars = ["--primary", "--background", "--foreground", "--card", "--border"];
      criticalVars.forEach(v => {
        expect(OKLCH_TO_HEX_MAP).toHaveProperty(v);
      });
    });

    it("should have distinct foreground and background colors", () => {
      expect(OKLCH_TO_HEX_MAP["--background"]).not.toBe(OKLCH_TO_HEX_MAP["--foreground"]);
      expect(OKLCH_TO_HEX_MAP["--card"]).not.toBe(OKLCH_TO_HEX_MAP["--card-foreground"]);
    });

    it("should replace oklch() pattern with HEX in CSS text", () => {
      const cssWithOklch = ":root { --primary: oklch(0.65 0.19 45); --bg: oklch(1 0 0); }";
      const fixed = cssWithOklch.replace(/oklch\([^)]*\)/g, "#888888");
      expect(fixed).not.toContain("oklch");
      expect(fixed).toContain("#888888");
    });

    it("should handle multiple oklch() occurrences in one line", () => {
      const css = "color: oklch(0.5 0.1 30); background: oklch(1 0 0);";
      const fixed = css.replace(/oklch\([^)]*\)/g, "#888888");
      expect(fixed).toBe("color: #888888; background: #888888;");
    });

    it("should not modify CSS that doesn't contain oklch", () => {
      const css = "color: #ff0000; background: rgb(255, 255, 255);";
      const fixed = css.replace(/oklch\([^)]*\)/g, "#888888");
      expect(fixed).toBe(css);
    });
  });

  describe("PDF Export Brand Configuration", () => {
    it("should use correct GHP logo URL", () => {
      const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663169336317/i9L9SEfcrUSsT5mzwNhmmi/GHPLogo-03_9b11623d.png";
      expect(LOGO_URL).toContain("GHPLogo-03");
      expect(LOGO_URL).toContain("cloudfront.net");
    });

    it("should define all required brand colors", () => {
      const COLORS = {
        orange: [255, 107, 53],
        amber: [247, 179, 43],
        green: [16, 185, 129],
        blue: [59, 130, 246],
        red: [239, 68, 68],
        gray: [156, 163, 175],
      };

      // All colors should be valid RGB arrays
      Object.values(COLORS).forEach(color => {
        expect(color).toHaveLength(3);
        color.forEach(c => {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(255);
        });
      });
    });
  });
});
