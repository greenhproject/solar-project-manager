import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cronScheduler } from "./cronScheduler";

describe("CronScheduler", () => {
  afterEach(() => {
    cronScheduler.stopAll();
  });

  it("should schedule a job successfully", () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const result = cronScheduler.schedule({
      name: "test-job",
      cronExpression: "* * * * *", // every minute
      handler,
      description: "Test job",
    });

    expect(result.success).toBe(true);
    expect(result.name).toBe("test-job");
    expect(cronScheduler.isActive("test-job")).toBe(true);
  });

  it("should reject invalid cron expressions", () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const result = cronScheduler.schedule({
      name: "bad-job",
      cronExpression: "invalid cron",
      handler,
    });

    expect(result.success).toBe(false);
    expect(cronScheduler.isActive("bad-job")).toBe(false);
  });

  it("should stop a job", () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    cronScheduler.schedule({
      name: "stop-test",
      cronExpression: "0 12 * * *",
      handler,
    });

    expect(cronScheduler.isActive("stop-test")).toBe(true);
    const stopped = cronScheduler.stop("stop-test");
    expect(stopped).toBe(true);
    expect(cronScheduler.isActive("stop-test")).toBe(false);
  });

  it("should return false when stopping non-existent job", () => {
    const stopped = cronScheduler.stop("non-existent");
    expect(stopped).toBe(false);
  });

  it("should list all active jobs", () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    cronScheduler.schedule({ name: "job-1", cronExpression: "0 8 * * *", handler });
    cronScheduler.schedule({ name: "job-2", cronExpression: "0 12 * * *", handler });

    const jobs = cronScheduler.listJobs();
    expect(jobs).toHaveLength(2);
    expect(jobs.map(j => j.name)).toContain("job-1");
    expect(jobs.map(j => j.name)).toContain("job-2");
  });

  it("should get job info", () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    cronScheduler.schedule({
      name: "info-test",
      cronExpression: "0 9 * * *",
      handler,
      description: "Info test job",
    });

    const info = cronScheduler.getJobInfo("info-test");
    expect(info).not.toBeNull();
    expect(info!.name).toBe("info-test");
    expect(info!.cronExpression).toBe("0 9 * * *");
    expect(info!.description).toBe("Info test job");
    expect(info!.isRunning).toBe(false);
    expect(info!.lastExecutedAt).toBeNull();
  });

  it("should return null for non-existent job info", () => {
    const info = cronScheduler.getJobInfo("non-existent");
    expect(info).toBeNull();
  });

  it("should replace existing job when scheduling same name", () => {
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);

    cronScheduler.schedule({ name: "replace-test", cronExpression: "0 8 * * *", handler: handler1 });
    cronScheduler.schedule({ name: "replace-test", cronExpression: "0 12 * * *", handler: handler2 });

    const info = cronScheduler.getJobInfo("replace-test");
    expect(info!.cronExpression).toBe("0 12 * * *");
    expect(cronScheduler.listJobs()).toHaveLength(1);
  });

  it("should stop all jobs", () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    cronScheduler.schedule({ name: "all-1", cronExpression: "0 8 * * *", handler });
    cronScheduler.schedule({ name: "all-2", cronExpression: "0 12 * * *", handler });

    cronScheduler.stopAll();
    expect(cronScheduler.listJobs()).toHaveLength(0);
  });

  it("should validate milestone reminder cron expression (daily at specific hour)", () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    
    // Simular la expresión que genera el sistema de recordatorios
    const hour = 12;
    const cronExpression = `0 ${hour} * * *`; // min hour dom mon dow
    
    const result = cronScheduler.schedule({
      name: "milestone-overdue-reminders",
      cronExpression,
      handler,
      description: `Envío diario de recordatorios de hitos vencidos a las ${hour}:00 UTC`,
    });

    expect(result.success).toBe(true);
    expect(cronScheduler.isActive("milestone-overdue-reminders")).toBe(true);
    
    const info = cronScheduler.getJobInfo("milestone-overdue-reminders");
    expect(info!.cronExpression).toBe("0 12 * * *");
  });
});
