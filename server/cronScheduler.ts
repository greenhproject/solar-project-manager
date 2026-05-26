/**
 * Cron Scheduler para Railway
 * Reemplaza el sistema Heartbeat de Manus con node-cron para entornos auto-hospedados.
 * Railway mantiene instancias persistentes, por lo que node-cron funciona correctamente.
 */
import cron, { ScheduledTask } from "node-cron";

interface CronJobConfig {
  name: string;
  /** Cron expression estándar de 5 campos: min hour dom mon dow */
  cronExpression: string;
  handler: () => Promise<void>;
  description?: string;
}

interface ActiveJob {
  name: string;
  task: ScheduledTask;
  cronExpression: string;
  description: string;
  isRunning: boolean;
  lastExecutedAt: Date | null;
  nextExecutionAt: string | null;
  createdAt: Date;
}

class CronSchedulerService {
  private jobs: Map<string, ActiveJob> = new Map();

  /**
   * Registrar y arrancar un cron job
   */
  schedule(config: CronJobConfig): { success: boolean; name: string } {
    // Si ya existe, detenerlo primero
    if (this.jobs.has(config.name)) {
      this.stop(config.name);
    }

    // Validar expresión cron
    if (!cron.validate(config.cronExpression)) {
      console.error(`[CronScheduler] Invalid cron expression: ${config.cronExpression}`);
      return { success: false, name: config.name };
    }

    const task = cron.schedule(config.cronExpression, async () => {
      const job = this.jobs.get(config.name);
      if (job) {
        job.isRunning = true;
        job.lastExecutedAt = new Date();
      }

      try {
        console.log(`[CronScheduler] Executing job: ${config.name} at ${new Date().toISOString()}`);
        await config.handler();
        console.log(`[CronScheduler] Job completed: ${config.name}`);
      } catch (error) {
        console.error(`[CronScheduler] Job failed: ${config.name}`, error);
      } finally {
        if (job) {
          job.isRunning = false;
        }
      }
    }, {
      scheduled: true,
      timezone: "UTC",
    });

    this.jobs.set(config.name, {
      name: config.name,
      task,
      cronExpression: config.cronExpression,
      description: config.description || "",
      isRunning: false,
      lastExecutedAt: null,
      nextExecutionAt: null,
      createdAt: new Date(),
    });

    console.log(`[CronScheduler] Job scheduled: ${config.name} (${config.cronExpression}) - ${config.description || ""}`);
    return { success: true, name: config.name };
  }

  /**
   * Detener un cron job
   */
  stop(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) return false;

    job.task.stop();
    this.jobs.delete(name);
    console.log(`[CronScheduler] Job stopped: ${name}`);
    return true;
  }

  /**
   * Pausar un cron job (sin eliminarlo)
   */
  pause(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) return false;

    job.task.stop();
    console.log(`[CronScheduler] Job paused: ${name}`);
    return true;
  }

  /**
   * Reanudar un cron job pausado
   */
  resume(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) return false;

    job.task.start();
    console.log(`[CronScheduler] Job resumed: ${name}`);
    return true;
  }

  /**
   * Actualizar la expresión cron de un job existente
   */
  updateCron(name: string, newCronExpression: string, handler: () => Promise<void>): boolean {
    const job = this.jobs.get(name);
    if (!job) return false;

    if (!cron.validate(newCronExpression)) {
      console.error(`[CronScheduler] Invalid cron expression: ${newCronExpression}`);
      return false;
    }

    // Detener el job actual y recrearlo con la nueva expresión
    this.stop(name);
    this.schedule({
      name,
      cronExpression: newCronExpression,
      handler,
      description: job.description,
    });

    return true;
  }

  /**
   * Verificar si un job existe y está activo
   */
  isActive(name: string): boolean {
    return this.jobs.has(name);
  }

  /**
   * Obtener información de un job
   */
  getJobInfo(name: string): Omit<ActiveJob, "task"> | null {
    const job = this.jobs.get(name);
    if (!job) return null;

    const { task, ...info } = job;
    return info;
  }

  /**
   * Listar todos los jobs activos
   */
  listJobs(): Array<Omit<ActiveJob, "task">> {
    return Array.from(this.jobs.values()).map(({ task, ...info }) => info);
  }

  /**
   * Detener todos los jobs (para shutdown graceful)
   */
  stopAll(): void {
    for (const [name, job] of this.jobs) {
      job.task.stop();
      console.log(`[CronScheduler] Job stopped: ${name}`);
    }
    this.jobs.clear();
    console.log("[CronScheduler] All jobs stopped");
  }
}

// Singleton
export const cronScheduler = new CronSchedulerService();
