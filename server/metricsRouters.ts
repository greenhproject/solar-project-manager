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
      .filter((u: any) => u.role === "admin" || u.role === "engineer" || u.role === "ingeniero_tramites")
      .map((u: any) => ({ id: u.id, name: u.name || u.email, role: u.role }));
  }),
});
