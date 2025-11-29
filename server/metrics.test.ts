import { describe, it, expect } from "vitest";
import {
  getCompletionRate,
  getAverageCompletionTime,
  getMonthlyMetrics,
  getProjectDistributionByType,
} from "./db";

describe("Metrics Functions", () => {
  it("getCompletionRate debe devolver objeto con rate, completed y total", async () => {
    const result = await getCompletionRate();

    expect(result).toHaveProperty("rate");
    expect(result).toHaveProperty("completed");
    expect(result).toHaveProperty("total");

    expect(typeof result.rate).toBe("number");
    expect(typeof result.completed).toBe("number");
    expect(typeof result.total).toBe("number");

    // Verificar que rate esté entre 0 y 100
    expect(result.rate).toBeGreaterThanOrEqual(0);
    expect(result.rate).toBeLessThanOrEqual(100);

    // Verificar que completed <= total
    expect(result.completed).toBeLessThanOrEqual(result.total);
  });

  it("getAverageCompletionTime debe devolver objeto con avgDays y totalCompleted", async () => {
    const result = await getAverageCompletionTime();

    expect(result).toHaveProperty("avgDays");
    expect(result).toHaveProperty("totalCompleted");

    expect(typeof result.avgDays).toBe("number");
    expect(typeof result.totalCompleted).toBe("number");

    // Verificar que sean números válidos (no NaN)
    expect(result.avgDays).not.toBeNaN();
    expect(result.totalCompleted).not.toBeNaN();

    // Verificar que sean no negativos
    expect(result.avgDays).toBeGreaterThanOrEqual(0);
    expect(result.totalCompleted).toBeGreaterThanOrEqual(0);
  });

  it("getMonthlyMetrics debe devolver array de objetos con estructura correcta", async () => {
    const result = await getMonthlyMetrics(12);

    expect(Array.isArray(result)).toBe(true);

    if (result.length > 0) {
      const firstItem = result[0];
      expect(firstItem).toHaveProperty("month");
      expect(firstItem).toHaveProperty("total");
      expect(firstItem).toHaveProperty("completed");
      expect(firstItem).toHaveProperty("in_progress");
      expect(firstItem).toHaveProperty("cancelled");

      expect(typeof firstItem.month).toBe("string");
      expect(typeof Number(firstItem.total)).toBe("number");
    }
  });

  it("getProjectDistributionByType debe devolver array de objetos con typeName, color y count", async () => {
    const result = await getProjectDistributionByType();

    expect(Array.isArray(result)).toBe(true);

    if (result.length > 0) {
      const firstItem = result[0];
      expect(firstItem).toHaveProperty("typeName");
      expect(firstItem).toHaveProperty("color");
      expect(firstItem).toHaveProperty("count");

      expect(typeof firstItem.typeName).toBe("string");
      expect(typeof firstItem.color).toBe("string");
      expect(typeof Number(firstItem.count)).toBe("number");
    }
  });
});
