import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  getNotificationPermission,
  notifyMilestoneDue,
  notifyProjectDelayed,
} from "@/lib/pushNotifications";

/**
 * Hook para monitorear hitos y proyectos y enviar notificaciones automáticas
 */
export function useNotificationMonitor() {
  const [, navigate] = useLocation();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: milestones } = trpc.milestones.getAll.useQuery();
  const notifiedMilestones = useRef<Set<number>>(new Set());
  const notifiedProjects = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Verificar si las notificaciones están habilitadas
    const permission = getNotificationPermission();
    if (!permission.granted) {
      return;
    }

    // Verificar hitos próximos a vencer (3 días)
    if (milestones) {
      const now = new Date();
      const threeDaysFromNow = new Date(
        now.getTime() + 3 * 24 * 60 * 60 * 1000
      );

      milestones.forEach(milestone => {
        // Solo notificar hitos pendientes o en progreso
        if (
          milestone.status === "completed" ||
          milestone.status === "overdue"
        ) {
          return;
        }

        const dueDate = new Date(milestone.dueDate);
        const daysRemaining = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Notificar si vence en 3 días o menos y no se ha notificado antes
        if (
          daysRemaining <= 3 &&
          daysRemaining >= 0 &&
          !notifiedMilestones.current.has(milestone.id)
        ) {
          // Buscar el proyecto asociado
          const project = projects?.find(p => p.id === milestone.projectId);
          if (project) {
            notifyMilestoneDue(
              milestone.name,
              project.name,
              daysRemaining,
              () => navigate(`/projects/${project.id}`)
            );
            notifiedMilestones.current.add(milestone.id);
          }
        }
      });
    }

    // Verificar proyectos retrasados
    if (projects) {
      const now = new Date();

      projects.forEach(project => {
        // Solo notificar proyectos activos
        if (project.status === "completed" || project.status === "cancelled") {
          return;
        }

        const endDate = new Date(project.estimatedEndDate);
        const daysOverdue = Math.ceil(
          (now.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Notificar si está retrasado y no se ha notificado antes
        if (daysOverdue > 0 && !notifiedProjects.current.has(project.id)) {
          notifyProjectDelayed(project.name, daysOverdue, () =>
            navigate(`/projects/${project.id}`)
          );
          notifiedProjects.current.add(project.id);
        }
      });
    }
  }, [milestones, projects, navigate]);

  // Limpiar notificaciones cada 24 horas para permitir re-notificaciones
  useEffect(() => {
    const interval = setInterval(
      () => {
        notifiedMilestones.current.clear();
        notifiedProjects.current.clear();
      },
      24 * 60 * 60 * 1000
    ); // 24 horas

    return () => clearInterval(interval);
  }, []);
}
