/**
 * Test de integración para verificar correcciones de métricas avanzadas
 */

import { describe, it, expect } from "vitest";
import * as db from "./db";
import * as metrics from "./metricsCalculator";

describe("Metrics Fix Verification", () => {
  it("should have completedDate for completed milestones", async () => {
    const allMilestones = await db.getAllMilestones();
    const completedMilestones = allMilestones.filter(
      (m: any) => m.status === "completed"
    );

    console.log(`\n✅ Completed milestones: ${completedMilestones.length}`);

    completedMilestones.forEach((m: any) => {
      console.log(
        `   - ${m.name}: completedDate = ${m.completedDate ? "✅" : "❌"}`
      );
    });

    // Todos los hitos completados deben tener completedDate
    completedMilestones.forEach((m: any) => {
      expect(m.completedDate).toBeTruthy();
    });
  });

  it("should have actualEndDate for completed projects", async () => {
    const allProjects = await db.getAllProjects();
    const completedProjects = allProjects.filter(
      (p: any) => p.status === "completed"
    );

    console.log(`\n✅ Completed projects: ${completedProjects.length}`);

    completedProjects.forEach((p: any) => {
      console.log(
        `   - ${p.name}: actualEndDate = ${p.actualEndDate ? "✅" : "❌"}`
      );
    });

    // Todos los proyectos completados deben tener actualEndDate
    completedProjects.forEach((p: any) => {
      expect(p.actualEndDate).toBeTruthy();
    });
  });

  it("should show team velocity with data", async () => {
    const velocity = await metrics.calculateTeamVelocity();

    console.log("\n📊 Team Velocity Summary:");

    const totalMilestones = velocity.reduce(
      (sum, m) => sum + m.milestonesCompleted,
      0
    );
    const totalProjects = velocity.reduce(
      (sum, m) => sum + m.projectsCompleted,
      0
    );

    console.log(`   Total milestones completed: ${totalMilestones}`);
    console.log(`   Total projects completed: ${totalProjects}`);

    // Debe haber al menos algunos hitos completados
    expect(totalMilestones).toBeGreaterThan(0);
  });

  it("should show project type metrics with completion rates", async () => {
    const typeMetrics = await metrics.calculateProjectTypeMetrics();

    console.log("\n📈 Project Type Metrics:");

    typeMetrics.forEach((metric) => {
      console.log(`   ${metric.projectTypeName}:`);
      console.log(`      - Count: ${metric.count}`);
      console.log(`      - Completion Rate: ${metric.completionRate}%`);
      console.log(`      - Avg Duration: ${metric.averageDurationDays} days`);
    });

    // Debe haber al menos un tipo de proyecto
    expect(typeMetrics.length).toBeGreaterThan(0);

    // Verificar que los porcentajes están en rango válido
    typeMetrics.forEach((metric) => {
      expect(metric.completionRate).toBeGreaterThanOrEqual(0);
      expect(metric.completionRate).toBeLessThanOrEqual(100);
    });
  });

  it("should generate predictions for active projects", async () => {
    const predictions = await metrics.predictProjectCompletion();

    console.log(`\n🔮 Predictions: ${predictions.length} active projects`);

    predictions.forEach((pred) => {
      console.log(`   ${pred.projectName}:`);
      console.log(`      - Days delay: ${pred.daysDelay}`);
      console.log(`      - Confidence: ${pred.confidence}%`);
    });

    // Las predicciones deben tener estructura correcta
    predictions.forEach((pred) => {
      expect(pred.projectId).toBeDefined();
      expect(pred.projectName).toBeDefined();
      expect(pred.confidence).toBeGreaterThanOrEqual(0);
      expect(pred.confidence).toBeLessThanOrEqual(100);
    });
  });

  it("should calculate dashboard stats correctly", async () => {
    const stats = await metrics.calculateDashboardStats();

    console.log("\n📊 Dashboard Stats:");
    console.log(`   Total Projects: ${stats.totalProjects}`);
    console.log(`   Active: ${stats.activeProjects}`);
    console.log(`   Completed: ${stats.completedProjects}`);
    console.log(`   Delayed: ${stats.delayedProjects}`);
    console.log(`   Total Milestones: ${stats.totalMilestones}`);
    console.log(`   Completed Milestones: ${stats.completedMilestones}`);
    console.log(`   Average Progress: ${stats.averageProgress}%`);

    // Verificar que los números tienen sentido
    expect(stats.totalProjects).toBeGreaterThanOrEqual(
      stats.activeProjects + stats.completedProjects
    );
    expect(stats.totalMilestones).toBeGreaterThanOrEqual(
      stats.completedMilestones
    );
    expect(stats.averageProgress).toBeGreaterThanOrEqual(0);
    expect(stats.averageProgress).toBeLessThanOrEqual(100);
  });
});
