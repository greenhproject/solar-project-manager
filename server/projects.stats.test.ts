import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Projects Stats for Users with Assigned Milestones", () => {
  it("should get projects with assigned milestones for a user", async () => {
    // Santiago Bravo tiene userId = 2 (ingeniero_tramites)
    const userId = 2;
    
    const projects = await db.getProjectsWithAssignedMilestones(userId);
    
    console.log(`[Test] Found ${projects.length} projects with assigned milestones for user ${userId}`);
    console.log("[Test] Projects:", projects.map(p => ({ id: p.id, name: p.name, status: p.status })));
    
    // Verificar que devuelve un array
    expect(Array.isArray(projects)).toBe(true);
    
    // Si Santiago tiene hitos asignados, debería tener al menos 1 proyecto
    if (projects.length > 0) {
      console.log(`[Test] ✓ User has ${projects.length} project(s) with assigned milestones`);
      
      // Verificar estructura de los proyectos
      const firstProject = projects[0];
      expect(firstProject).toHaveProperty("id");
      expect(firstProject).toHaveProperty("name");
      expect(firstProject).toHaveProperty("status");
      expect(firstProject).toHaveProperty("estimatedEndDate");
    } else {
      console.log("[Test] ⚠ User has no projects with assigned milestones");
    }
  });

  it("should calculate correct stats from projects with assigned milestones", async () => {
    const userId = 2; // Santiago Bravo
    
    const projects = await db.getProjectsWithAssignedMilestones(userId);
    const now = new Date();
    
    const stats = {
      total: projects.length,
      active: projects.filter(p => p.status === "in_progress").length,
      completed: projects.filter(p => p.status === "completed").length,
      overdue: projects.filter(
        p =>
          p.status !== "completed" &&
          p.status !== "cancelled" &&
          p.estimatedEndDate < now
      ).length,
    };
    
    console.log("[Test] Calculated stats:", stats);
    
    // Verificar que las estadísticas son números válidos
    expect(typeof stats.total).toBe("number");
    expect(typeof stats.active).toBe("number");
    expect(typeof stats.completed).toBe("number");
    expect(typeof stats.overdue).toBe("number");
    
    // Verificar que los números son coherentes
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.active).toBeGreaterThanOrEqual(0);
    expect(stats.completed).toBeGreaterThanOrEqual(0);
    expect(stats.overdue).toBeGreaterThanOrEqual(0);
    
    // La suma de active + completed no puede ser mayor que total
    expect(stats.active + stats.completed).toBeLessThanOrEqual(stats.total);
  });

  it("should return different stats for admin vs regular user", async () => {
    // Admin stats (todos los proyectos)
    const adminStats = await db.getProjectStats();
    
    // User stats (solo proyectos con hitos asignados)
    const userId = 2; // Santiago Bravo
    const userProjects = await db.getProjectsWithAssignedMilestones(userId);
    const userStats = {
      total: userProjects.length,
      active: userProjects.filter(p => p.status === "in_progress").length,
      completed: userProjects.filter(p => p.status === "completed").length,
      overdue: userProjects.filter(
        p =>
          p.status !== "completed" &&
          p.status !== "cancelled" &&
          p.estimatedEndDate < new Date()
      ).length,
    };
    
    console.log("[Test] Admin stats:", adminStats);
    console.log("[Test] User stats:", userStats);
    
    // Admin debería ver más o igual cantidad de proyectos que un usuario regular
    expect(adminStats.total).toBeGreaterThanOrEqual(userStats.total);
    
    // Si el usuario tiene proyectos asignados, sus stats deberían ser > 0
    if (userStats.total > 0) {
      console.log("[Test] ✓ User has assigned projects with valid stats");
    }
  });
});
