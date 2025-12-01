/**
 * Tests para funcionalidad de recordatorios (hitos próximos y vencidos)
 */

import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Reminders - Upcoming and Overdue Milestones", () => {
  it("should get upcoming milestones (next 7 days)", async () => {
    const upcomingMilestones = await db.getUpcomingMilestones(7);

    console.log(`\n📅 Upcoming Milestones (next 7 days): ${upcomingMilestones.length}`);

    upcomingMilestones.forEach((milestone) => {
      console.log(`   - ${milestone.milestoneName}`);
      console.log(`     Project: ${milestone.projectName}`);
      console.log(`     Due: ${milestone.dueDate}`);
      console.log(`     Status: ${milestone.status}`);
    });

    expect(Array.isArray(upcomingMilestones)).toBe(true);

    // Verificar estructura de cada hito
    upcomingMilestones.forEach((milestone) => {
      expect(milestone).toHaveProperty("milestoneId");
      expect(milestone).toHaveProperty("milestoneName");
      expect(milestone).toHaveProperty("dueDate");
      expect(milestone).toHaveProperty("status");
      expect(milestone).toHaveProperty("projectId");
      expect(milestone).toHaveProperty("projectName");
      expect(milestone).toHaveProperty("projectLocation");
      expect(typeof milestone.milestoneId).toBe("number");
      expect(typeof milestone.milestoneName).toBe("string");
      expect(milestone.dueDate).toBeInstanceOf(Date);
      expect(["pending", "in_progress"]).toContain(milestone.status);
    });

    // Verificar que todos los hitos están en el futuro (próximos 7 días)
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    upcomingMilestones.forEach((milestone) => {
      const dueDate = new Date(milestone.dueDate);
      expect(dueDate.getTime()).toBeGreaterThanOrEqual(now.getTime());
      expect(dueDate.getTime()).toBeLessThanOrEqual(futureDate.getTime());
    });
  });

  it("should get overdue milestones", async () => {
    const overdueMilestones = await db.getOverdueMilestones();

    console.log(`\n⚠️  Overdue Milestones: ${overdueMilestones.length}`);

    overdueMilestones.forEach((milestone) => {
      console.log(`   - ${milestone.milestoneName}`);
      console.log(`     Project: ${milestone.projectName}`);
      console.log(`     Due: ${milestone.dueDate}`);
      console.log(`     Status: ${milestone.status}`);
    });

    expect(Array.isArray(overdueMilestones)).toBe(true);

    // Verificar estructura de cada hito
    overdueMilestones.forEach((milestone) => {
      expect(milestone).toHaveProperty("milestoneId");
      expect(milestone).toHaveProperty("milestoneName");
      expect(milestone).toHaveProperty("dueDate");
      expect(milestone).toHaveProperty("status");
      expect(milestone).toHaveProperty("projectId");
      expect(milestone).toHaveProperty("projectName");
      expect(milestone).toHaveProperty("projectLocation");
      expect(typeof milestone.milestoneId).toBe("number");
      expect(typeof milestone.milestoneName).toBe("string");
      expect(milestone.dueDate).toBeInstanceOf(Date);
      expect(["pending", "in_progress"]).toContain(milestone.status);
    });

    // Verificar que todos los hitos están vencidos
    const now = new Date();
    overdueMilestones.forEach((milestone) => {
      const dueDate = new Date(milestone.dueDate);
      expect(dueDate.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  it("should get upcoming milestones with custom days ahead", async () => {
    const upcomingMilestones3Days = await db.getUpcomingMilestones(3);
    const upcomingMilestones14Days = await db.getUpcomingMilestones(14);

    console.log(`\n📅 Upcoming Milestones (next 3 days): ${upcomingMilestones3Days.length}`);
    console.log(`📅 Upcoming Milestones (next 14 days): ${upcomingMilestones14Days.length}`);

    expect(Array.isArray(upcomingMilestones3Days)).toBe(true);
    expect(Array.isArray(upcomingMilestones14Days)).toBe(true);

    // Los hitos de 14 días deben incluir los de 3 días
    expect(upcomingMilestones14Days.length).toBeGreaterThanOrEqual(
      upcomingMilestones3Days.length
    );
  });

  it("should return empty arrays when no milestones found", async () => {
    const upcomingMilestones = await db.getUpcomingMilestones(0);

    expect(Array.isArray(upcomingMilestones)).toBe(true);
    expect(upcomingMilestones.length).toBe(0);
  });

  it("should include project information in milestone data", async () => {
    const upcomingMilestones = await db.getUpcomingMilestones(30);

    if (upcomingMilestones.length > 0) {
      const milestone = upcomingMilestones[0];

      console.log("\n📋 Sample Milestone Data:");
      console.log(`   Milestone: ${milestone.milestoneName}`);
      console.log(`   Project: ${milestone.projectName}`);
      console.log(`   Location: ${milestone.projectLocation || "N/A"}`);
      console.log(`   Description: ${milestone.description || "N/A"}`);

      expect(milestone.projectId).toBeDefined();
      expect(milestone.projectName).toBeDefined();
      expect(typeof milestone.projectName).toBe("string");
    }
  });
});
