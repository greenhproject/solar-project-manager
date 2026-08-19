import type { User } from "../drizzle/schema";
import * as db from "./db";

type AssistantUser = Pick<User, "id" | "name" | "email" | "role">;

const GLOBAL_CONTEXT_ROLES = new Set<AssistantUser["role"]>(["admin", "admin_financiero"]);

// Mantiene el payload ampliamente por debajo del límite de Groq, incluido el prompt del sistema.
const MAX_CONTEXT_CHARS = 6_000;

function compactText(value: string | null | undefined, maxLength = 160) {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized;
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "Sin dato";
}

/**
 * Construye un contexto amplio y seguro para el Asistente IA.
 * Respeta la misma visibilidad de proyectos/hitos usada por el resto de SPM.
 */
export async function buildAiAssistantContext(user: AssistantUser, focus = "") {
  const hasGlobalVisibility = GLOBAL_CONTEXT_ROLES.has(user.role);
  const [projectsByMilestone, projectsByEngineer, allUsers] = await Promise.all([
    hasGlobalVisibility ? Promise.resolve([]) : db.getProjectsWithAssignedMilestones(user.id),
    hasGlobalVisibility ? Promise.resolve([]) : db.getProjectsByEngineerId(user.id),
    hasGlobalVisibility ? db.getAllUsers() : Promise.resolve([]),
  ]);

  const visibleProjects = hasGlobalVisibility
    ? await db.getAllProjects()
    : Array.from(
        new Map(
          [...projectsByMilestone, ...projectsByEngineer].map(project => [project.id, project])
        ).values()
      );

  const allMilestones = hasGlobalVisibility
    ? await db.getAllMilestones()
    : (await db.getAllMilestones()).filter(milestone => milestone.assignedUserId === user.id);

  const visibleProjectIds = new Set(visibleProjects.map(project => project.id));
  const visibleMilestones = allMilestones.filter(milestone => visibleProjectIds.has(milestone.projectId));
  const usersById = new Map(allUsers.map(person => [person.id, person]));
  const milestonesByProject = new Map<number, typeof visibleMilestones>();

  for (const milestone of visibleMilestones) {
    const group = milestonesByProject.get(milestone.projectId) || [];
    group.push(milestone);
    milestonesByProject.set(milestone.projectId, group);
  }

  const updatesByProject = new Map<number, Awaited<ReturnType<typeof db.getProjectUpdatesByProjectId>>>();
  await Promise.all(
    visibleProjects.map(async project => {
      const updates = await db.getProjectUpdatesByProjectId(project.id);
      updatesByProject.set(project.id, updates.slice(0, 2));
    })
  );

  const now = new Date();
  const completedMilestones = visibleMilestones.filter(
    milestone => milestone.status === "completed" || milestone.completedDate !== null
  ).length;
  const overdueMilestones = visibleMilestones.filter(
    milestone => milestone.status !== "completed" && new Date(milestone.dueDate) < now
  ).length;

  const normalizedFocus = focus.toLowerCase();
  const focusedProjectIds = new Set(
    visibleProjects
      .filter(project => normalizedFocus.includes(project.name.toLowerCase()))
      .map(project => project.id)
  );

  const projectsContext = [...visibleProjects]
    .sort((a, b) => Number(focusedProjectIds.has(b.id)) - Number(focusedProjectIds.has(a.id)))
    .map(project => {
    const engineer = project.assignedEngineerId ? usersById.get(project.assignedEngineerId) : undefined;
    const projectMilestones = milestonesByProject.get(project.id) || [];
    const updates = updatesByProject.get(project.id) || [];

    return {
      id: project.id,
      name: project.name,
      description: compactText(project.description, focusedProjectIds.has(project.id) ? 600 : 120),
      client: project.clientName || "Sin cliente registrado",
      location: project.location || "Sin ubicación registrada",
      status: project.status,
      progressPercentage: project.progressPercentage,
      startDate: formatDate(project.startDate),
      estimatedEndDate: formatDate(project.estimatedEndDate),
      actualEndDate: formatDate(project.actualEndDate),
      engineer: engineer?.name || (project.assignedEngineerId ? "Asignado" : "Sin asignar"),
      recentUpdates: updates.map(update => ({
        type: update.updateType,
        title: update.title,
        description: compactText(update.description, focusedProjectIds.has(project.id) ? 400 : 120),
        date: formatDate(update.createdAt),
      })),
    };
    });

  const milestonesContext = visibleMilestones.map(milestone => ({
    id: milestone.id,
    projectId: milestone.projectId,
    projectName: visibleProjects.find(project => project.id === milestone.projectId)?.name || "Proyecto no disponible",
    name: milestone.name,
    status: milestone.status,
    startDate: formatDate(milestone.startDate),
    endDate: formatDate(milestone.endDate),
    dueDate: formatDate(milestone.dueDate),
    completedDate: formatDate(milestone.completedDate),
    durationDays: milestone.durationDays,
    weight: milestone.weight,
    responsible: milestone.assignedUserId === user.id
      ? "Usuario actual"
      : usersById.get(milestone.assignedUserId || -1)?.name || "Sin asignar",
    description: compactText(
      milestone.description,
      focusedProjectIds.has(milestone.projectId) ? 600 : 100
    ),
    notes: compactText(milestone.notes, focusedProjectIds.has(milestone.projectId) ? 400 : 80),
    observations: compactText(milestone.observations, focusedProjectIds.has(milestone.projectId) ? 400 : 80),
  }));

  const scope = hasGlobalVisibility
    ? "Visibilidad global: todos los proyectos, hitos y actualizaciones operativas."
    : "Visibilidad individual: solo proyectos relacionados y hitos asignados al usuario actual, conforme a los permisos de SPM.";

  const payload = {
    generatedAt: new Date().toISOString(),
    user: { role: user.role, scope },
    summary: {
      projects: visibleProjects.length,
      milestones: visibleMilestones.length,
      completedMilestones,
      overdueMilestones,
      projectsByStatus: {
        planning: visibleProjects.filter(project => project.status === "planning").length,
        inProgress: visibleProjects.filter(project => project.status === "in_progress").length,
        onHold: visibleProjects.filter(project => project.status === "on_hold").length,
        completed: visibleProjects.filter(project => project.status === "completed").length,
      },
    },
    projects: projectsContext,
    milestones: milestonesContext,
  };

  let context = JSON.stringify(payload, null, 2);
  if (context.length > MAX_CONTEXT_CHARS) {
    // Se preservan todos los proyectos y el inventario operativo de hitos.
    // Para conjuntos excepcionalmente grandes se eliminan primero textos largos y actualizaciones.
    const compactPayload = {
      ...payload,
      contextNotice: "El inventario de proyectos y hitos se conserva; se omitieron textos extensos y actualizaciones antiguas para respetar el límite del proveedor de IA.",
      projects: projectsContext.map(({ description, recentUpdates, ...project }) => project),
      milestones: milestonesContext.map(({ description, notes, observations, ...milestone }) => milestone),
    };
    context = JSON.stringify(compactPayload, null, 2);
  }

  if (context.length > MAX_CONTEXT_CHARS) {
    // El límite final evita errores HTTP 413. Se incluye el total exacto y los hitos más críticos.
    const criticalMilestones = [...milestonesContext]
      .sort((a, b) => {
        const priority = (status: string) => status === "overdue" ? 0 : status === "in_progress" ? 1 : status === "pending" ? 2 : 3;
        return priority(a.status) - priority(b.status) || a.dueDate.localeCompare(b.dueDate);
      })
      .slice(0, 30)
      .map(({ description, notes, observations, ...milestone }) => milestone);
    context = JSON.stringify({
      ...payload,
      contextNotice: `El total exacto es ${visibleProjects.length} proyectos y ${visibleMilestones.length} hitos. Para respetar el límite del proveedor se incluyeron los 150 hitos de mayor prioridad; solicita un proyecto concreto para ampliar su detalle.`,
      projects: projectsContext.map(({ description, recentUpdates, ...project }) => project),
      milestones: criticalMilestones,
    }, null, 2);
  }

  if (context.length > MAX_CONTEXT_CHARS) {
    const compactProjects = projectsContext.slice(0, 35).map(project => ({
      id: project.id,
      name: project.name,
      client: project.client,
      status: project.status,
      progressPercentage: project.progressPercentage,
      estimatedEndDate: project.estimatedEndDate,
      engineer: project.engineer,
    }));
    const criticalMilestones = [...milestonesContext]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 12)
      .map(({ description, notes, observations, ...milestone }) => milestone);
    context = JSON.stringify({
      generatedAt: payload.generatedAt,
      user: payload.user,
      summary: payload.summary,
      contextNotice: `La plataforma contiene ${visibleProjects.length} proyectos y ${visibleMilestones.length} hitos accesibles. Se consultó el conjunto completo, pero este resumen incluye 35 proyectos y 12 hitos prioritarios por el límite del proveedor. Para precisión máxima sobre un caso, solicita el proyecto o hito por nombre.`,
      projects: compactProjects,
      milestones: criticalMilestones,
    }, null, 2);
  }

  return {
    scope,
    projectCount: visibleProjects.length,
    milestoneCount: visibleMilestones.length,
    context,
  };
}
