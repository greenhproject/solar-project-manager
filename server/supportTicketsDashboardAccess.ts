type ProjectWithId = { id: number };

/**
 * Combina las dos fuentes que otorgan visibilidad a un usuario no
 * administrativo: ser ingeniero asignado al proyecto o tener al menos un hito
 * asignado. El resultado no duplica proyectos.
 */
export function mergeSupportTicketsAuthorizedProjects<T extends ProjectWithId>(
  engineerProjects: T[],
  milestoneProjects: T[],
): T[] {
  return Array.from(
    new Map([...engineerProjects, ...milestoneProjects].map(project => [project.id, project])).values(),
  );
}
