import { router, protectedProcedure } from "./_core/trpc";
import * as metrics from "./metricsCalculator";

export const metricsRouter = router({
  teamVelocity: protectedProcedure.query(async () => {
    return await metrics.calculateTeamVelocity();
  }),

  projectTypeMetrics: protectedProcedure.query(async () => {
    return await metrics.calculateProjectTypeMetrics();
  }),

  predictions: protectedProcedure.query(async () => {
    return await metrics.predictProjectCompletion();
  }),

  dashboardStats: protectedProcedure.query(async () => {
    return await metrics.calculateDashboardStats();
  }),
});
