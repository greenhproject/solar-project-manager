/**
 * Tests para métricas avanzadas
 */

import { describe, it, expect } from "vitest";
import * as metrics from "./metricsCalculator";

describe("Advanced Metrics", () => {
  it("should calculate team velocity for last 6 months", async () => {
    const velocity = await metrics.calculateTeamVelocity();

    console.log("\n📊 Team Velocity:");
    console.log(JSON.stringify(velocity, null, 2));

    expect(Array.isArray(velocity)).toBe(true);
    expect(velocity.length).toBe(6); // 6 months

    // Verificar estructura de cada mes
    velocity.forEach((month) => {
      expect(month).toHaveProperty("month");
      expect(month).toHaveProperty("milestonesCompleted");
      expect(month).toHaveProperty("projectsCompleted");
      expect(month).toHaveProperty("averageDaysPerMilestone");
      expect(typeof month.milestonesCompleted).toBe("number");
      expect(typeof month.projectsCompleted).toBe("number");
      expect(typeof month.averageDaysPerMilestone).toBe("number");
    });
  });

  it("should calculate project type metrics", async () => {
    const typeMetrics = await metrics.calculateProjectTypeMetrics();

    console.log("\n📈 Project Type Metrics:");
    console.log(JSON.stringify(typeMetrics, null, 2));

    expect(Array.isArray(typeMetrics)).toBe(true);

    // Verificar estructura
    typeMetrics.forEach((metric) => {
      expect(metric).toHaveProperty("projectTypeName");
      expect(metric).toHaveProperty("count");
      expect(metric).toHaveProperty("averageDurationDays");
      expect(metric).toHaveProperty("completionRate");
      expect(typeof metric.count).toBe("number");
      expect(typeof metric.averageDurationDays).toBe("number");
      expect(typeof metric.completionRate).toBe("number");
      expect(metric.completionRate).toBeGreaterThanOrEqual(0);
      expect(metric.completionRate).toBeLessThanOrEqual(100);
    });
  });

  it("should predict project completion dates", async () => {
    const predictions = await metrics.predictProjectCompletion();

    console.log("\n🔮 Predictions:");
    console.log(JSON.stringify(predictions, null, 2));

    expect(Array.isArray(predictions)).toBe(true);

    // Verificar estructura
    predictions.forEach((prediction) => {
      expect(prediction).toHaveProperty("projectId");
      expect(prediction).toHaveProperty("projectName");
      expect(prediction).toHaveProperty("estimatedEndDate");
      expect(prediction).toHaveProperty("predictedEndDate");
      expect(prediction).toHaveProperty("daysDelay");
      expect(prediction).toHaveProperty("confidence");
      expect(typeof prediction.projectId).toBe("number");
      expect(typeof prediction.projectName).toBe("string");
      expect(prediction.estimatedEndDate).toBeInstanceOf(Date);
      expect(prediction.predictedEndDate).toBeInstanceOf(Date);
      expect(typeof prediction.daysDelay).toBe("number");
      expect(typeof prediction.confidence).toBe("number");
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
    });
  });

  it("should calculate dashboard stats", async () => {
    const stats = await metrics.calculateDashboardStats();

    console.log("\n📊 Dashboard Stats:");
    console.log(JSON.stringify(stats, null, 2));

    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("totalProjects");
    expect(stats).toHaveProperty("activeProjects");
    expect(stats).toHaveProperty("completedProjects");
    expect(stats).toHaveProperty("delayedProjects");
    expect(stats).toHaveProperty("totalMilestones");
    expect(stats).toHaveProperty("completedMilestones");
    expect(stats).toHaveProperty("overdueMilestones");
    expect(stats).toHaveProperty("averageProgress");

    // Verificar tipos
    expect(typeof stats.totalProjects).toBe("number");
    expect(typeof stats.activeProjects).toBe("number");
    expect(typeof stats.completedProjects).toBe("number");
    expect(typeof stats.delayedProjects).toBe("number");
    expect(typeof stats.totalMilestones).toBe("number");
    expect(typeof stats.completedMilestones).toBe("number");
    expect(typeof stats.overdueMilestones).toBe("number");
    expect(typeof stats.averageProgress).toBe("number");

    // Verificar rangos
    expect(stats.averageProgress).toBeGreaterThanOrEqual(0);
    expect(stats.averageProgress).toBeLessThanOrEqual(100);
    expect(stats.totalProjects).toBeGreaterThanOrEqual(0);
    expect(stats.activeProjects).toBeGreaterThanOrEqual(0);
    expect(stats.completedProjects).toBeGreaterThanOrEqual(0);

    // Verificar lógica
    expect(stats.totalProjects).toBeGreaterThanOrEqual(
      stats.activeProjects + stats.completedProjects
    );
  });
});
