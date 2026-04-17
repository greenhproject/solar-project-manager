import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";


/**
 * Tests to verify dark mode support across all page and component files.
 * These tests ensure that hardcoded color classes have corresponding dark: variants.
 */

const PAGES_DIR = path.join(__dirname, "../client/src/pages");
const COMPONENTS_DIR = path.join(__dirname, "../client/src/components");

// Get all page files
const pageFiles = fs.readdirSync(PAGES_DIR)
  .filter(f => f.endsWith(".tsx"))
  .map(f => path.join(PAGES_DIR, f));

// Key component files that should have dark mode
const keyComponentFiles = [
  path.join(COMPONENTS_DIR, "Sidebar.tsx"),
  path.join(COMPONENTS_DIR, "NotificationBell.tsx"),
];

describe("Dark Mode Support", () => {
  describe("Page files have dark: variants", () => {
    // Files that are expected to have dark mode classes (have hardcoded colors)
    const filesWithHardcodedColors = pageFiles.filter((file) => {
      const content = fs.readFileSync(file, "utf-8");
      return (
        content.includes("bg-white") ||
        content.includes("text-gray-") ||
        content.includes("border-orange-") ||
        content.includes("border-gray-")
      );
    });

    it("should have identified files with hardcoded colors", () => {
      expect(filesWithHardcodedColors.length).toBeGreaterThan(0);
    });

    for (const file of filesWithHardcodedColors) {
      const filename = path.basename(file);

      it(`${filename} should have dark: variants for bg-white`, () => {
        const content = fs.readFileSync(file, "utf-8");
        // Find bg-white that doesn't have dark: nearby (within same className string)
        const bgWhiteMatches = content.match(/bg-white(?!\/)/g) || [];
        const bgWhiteDarkMatches =
          content.match(/bg-white(?!\/) dark:bg-/g) || [];

        if (bgWhiteMatches.length > 0) {
          // At least some bg-white should have dark variants
          expect(bgWhiteDarkMatches.length).toBeGreaterThan(0);
        }
      });

      it(`${filename} should have dark: variants for text-gray colors`, () => {
        const content = fs.readFileSync(file, "utf-8");
        const textGrayMatches = content.match(/text-gray-[0-9]+/g) || [];
        const textGrayDarkMatches =
          content.match(/text-gray-[0-9]+ dark:text-gray-/g) || [];

        if (textGrayMatches.length > 0) {
          // At least some text-gray should have dark variants
          expect(textGrayDarkMatches.length).toBeGreaterThan(0);
        }
      });
    }
  });

  describe("Sidebar has dark mode support", () => {
    it("Sidebar.tsx should have dark: variant classes", () => {
      const sidebarPath = path.join(COMPONENTS_DIR, "Sidebar.tsx");
      const content = fs.readFileSync(sidebarPath, "utf-8");

      // Count dark: classes
      const darkClassCount = (content.match(/dark:/g) || []).length;
      expect(darkClassCount).toBeGreaterThan(20);
    });

    it("Sidebar.tsx should have dark backgrounds for sidebar container", () => {
      const sidebarPath = path.join(COMPONENTS_DIR, "Sidebar.tsx");
      const content = fs.readFileSync(sidebarPath, "utf-8");

      expect(content).toContain("dark:from-gray-900");
      expect(content).toContain("dark:border-gray-700");
    });

    it("Sidebar.tsx should have dark text colors for nav items", () => {
      const sidebarPath = path.join(COMPONENTS_DIR, "Sidebar.tsx");
      const content = fs.readFileSync(sidebarPath, "utf-8");

      expect(content).toContain("dark:text-gray-300");
      expect(content).toContain("dark:hover:bg-gray-800");
    });
  });

  describe("ThemeContext implementation", () => {
    it("ThemeContext.tsx should exist and export useTheme", () => {
      const themeContextPath = path.join(
        __dirname,
        "../client/src/contexts/ThemeContext.tsx"
      );
      const content = fs.readFileSync(themeContextPath, "utf-8");

      expect(content).toContain("export function useTheme");
      expect(content).toContain("export function ThemeProvider");
    });

    it("ThemeContext should support light, dark, and system themes", () => {
      const themeContextPath = path.join(
        __dirname,
        "../client/src/contexts/ThemeContext.tsx"
      );
      const content = fs.readFileSync(themeContextPath, "utf-8");

      expect(content).toContain('"light"');
      expect(content).toContain('"dark"');
      expect(content).toContain('"system"');
    });

    it("ThemeContext should toggle dark class on document root", () => {
      const themeContextPath = path.join(
        __dirname,
        "../client/src/contexts/ThemeContext.tsx"
      );
      const content = fs.readFileSync(themeContextPath, "utf-8");

      expect(content).toContain('classList.add("dark")');
      expect(content).toContain('classList.remove("dark")');
    });

    it("ThemeContext should persist theme to localStorage", () => {
      const themeContextPath = path.join(
        __dirname,
        "../client/src/contexts/ThemeContext.tsx"
      );
      const content = fs.readFileSync(themeContextPath, "utf-8");

      expect(content).toContain("localStorage");
      expect(content).toContain("user-theme");
    });
  });

  describe("UserProfile theme integration", () => {
    it("UserProfile.tsx should import useTheme", () => {
      const profilePath = path.join(PAGES_DIR, "UserProfile.tsx");
      const content = fs.readFileSync(profilePath, "utf-8");

      expect(content).toContain("useTheme");
    });

    it("UserProfile.tsx should call setTheme when user changes theme", () => {
      const profilePath = path.join(PAGES_DIR, "UserProfile.tsx");
      const content = fs.readFileSync(profilePath, "utf-8");

      expect(content).toContain("setTheme");
    });
  });

  describe("MainLayout theme sync", () => {
    it("MainLayout.tsx should sync user theme from DB", () => {
      const mainLayoutPath = path.join(COMPONENTS_DIR, "MainLayout.tsx");
      const content = fs.readFileSync(mainLayoutPath, "utf-8");

      expect(content).toContain("useTheme");
      expect(content).toContain("setTheme");
      expect(content).toContain("meQuery.data?.theme");
    });
  });

  describe("CSS dark mode variables", () => {
    it("index.css should have :root (light) variables", () => {
      const cssPath = path.join(__dirname, "../client/src/index.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain(":root");
      expect(content).toContain("--background:");
      expect(content).toContain("--foreground:");
    });

    it("index.css should have .dark variables", () => {
      const cssPath = path.join(__dirname, "../client/src/index.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain(".dark");
      expect(content).toContain("--background:");
    });

    it("index.css should define dark custom variant", () => {
      const cssPath = path.join(__dirname, "../client/src/index.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain("@custom-variant dark");
    });
  });

  describe("Gantt chart dark mode CSS", () => {
    it("gantt-custom.css should have dark mode rules", () => {
      const ganttCssPath = path.join(
        __dirname,
        "../client/src/gantt-custom.css"
      );
      const content = fs.readFileSync(ganttCssPath, "utf-8");

      expect(content).toContain(".dark ._3vJC0");
      expect(content).toContain(".dark ._1b4aS");
      expect(content).toContain(".dark ._WuQ0f");
    });
  });

  describe("Coverage summary", () => {
    it("should have dark: classes in at least 15 page files", () => {
      let filesWithDark = 0;
      for (const file of pageFiles) {
        const content = fs.readFileSync(file, "utf-8");
        if (content.includes("dark:")) {
          filesWithDark++;
        }
      }
      expect(filesWithDark).toBeGreaterThanOrEqual(15);
    });

    it("should have at least 300 total dark: class instances across all pages", () => {
      let totalDarkClasses = 0;
      for (const file of pageFiles) {
        const content = fs.readFileSync(file, "utf-8");
        const matches = content.match(/dark:/g) || [];
        totalDarkClasses += matches.length;
      }
      expect(totalDarkClasses).toBeGreaterThanOrEqual(300);
    });
  });
});
