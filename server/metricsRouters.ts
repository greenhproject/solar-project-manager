import { router, protectedProcedure } from "./_core/trpc";
import * as metrics from "./metricsCalculator";

import { z } from "zod";
import * as db from "./db";

export const metricsRouter = router({
  teamVelocity: protectedProcedure
    .input(z.object({ engineerId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await metrics.calculateTeamVelocity(input?.engineerId);
    }),

  projectTypeMetrics: protectedProcedure
    .input(z.object({ engineerId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await metrics.calculateProjectTypeMetrics(input?.engineerId);
    }),

  predictions: protectedProcedure
    .input(z.object({ engineerId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await metrics.predictProjectCompletion(input?.engineerId);
    }),

  dashboardStats: protectedProcedure
    .input(z.object({ engineerId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await metrics.calculateDashboardStats(input?.engineerId);
    }),

  engineers: protectedProcedure.query(async () => {
    const users = await db.getAllUsers();
    return users
      .filter((u: any) => u.role === "admin" || u.role === "user" || u.role === "ingeniero_tramites")
      .map((u: any) => ({ id: u.id, name: u.name || u.email, role: u.role }));
  }),

  // Score de desempeño de un ingeniero específico
  engineerScore: protectedProcedure
    .input(z.object({ 
      engineerId: z.number(),
      month: z.string().optional() // formato "2026-05"
    }))
    .query(async ({ input }) => {
      let monthDate: Date | undefined;
      if (input.month) {
        const [year, month] = input.month.split("-").map(Number);
        monthDate = new Date(year, month - 1, 1);
      }
      return await metrics.calculateEngineerScore(input.engineerId, monthDate);
    }),

  // Scores de todos los ingenieros para un mes
  allEngineerScores: protectedProcedure
    .input(z.object({ 
      month: z.string().optional() // formato "2026-05"
    }).optional())
    .query(async ({ input }) => {
      let monthDate: Date | undefined;
      if (input?.month) {
        const [year, month] = input.month.split("-").map(Number);
        monthDate = new Date(year, month - 1, 1);
      }
      return await metrics.calculateAllEngineerScores(monthDate);
    }),

  // Historial de scores de un ingeniero (últimos 6 meses)
  engineerScoreHistory: protectedProcedure
    .input(z.object({ engineerId: z.number() }))
    .query(async ({ input }) => {
      const history: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const score = await metrics.calculateEngineerScore(input.engineerId, monthDate);
        if (score) {
          history.push(score);
        }
      }
      return history;
    }),
});
