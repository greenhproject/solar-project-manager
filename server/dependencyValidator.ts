/**
 * Validador de dependencias entre hitos
 * Previene dependencias circulares y valida integridad
 */

export interface MilestoneWithDependencies {
  id: number;
  dependencies: string | null;
}

/**
 * Parsear dependencias desde texto JSON
 */
export function parseDependencies(dependencies: string | null): number[] {
  if (!dependencies) return [];
  try {
    const parsed = JSON.parse(dependencies);
    return Array.isArray(parsed)
      ? parsed.filter(id => typeof id === "number")
      : [];
  } catch {
    return [];
  }
}

/**
 * Detectar dependencias circulares usando DFS
 */
export function hasCircularDependency(
  milestoneId: number,
  newDependencies: number[],
  allMilestones: MilestoneWithDependencies[]
): boolean {
  const visited = new Set<number>();
  const recursionStack = new Set<number>();

  function dfs(currentId: number): boolean {
    if (recursionStack.has(currentId)) {
      // Encontramos un ciclo
      return true;
    }

    if (visited.has(currentId)) {
      // Ya visitamos este nodo sin encontrar ciclo
      return false;
    }

    visited.add(currentId);
    recursionStack.add(currentId);

    // Obtener dependencias del hito actual
    let dependencies: number[] = [];
    if (currentId === milestoneId) {
      // Usar las nuevas dependencias para el hito que estamos validando
      dependencies = newDependencies;
    } else {
      // Usar dependencias existentes para otros hitos
      const milestone = allMilestones.find(m => m.id === currentId);
      if (milestone) {
        dependencies = parseDependencies(milestone.dependencies);
      }
    }

    // Visitar todas las dependencias
    for (const depId of dependencies) {
      if (dfs(depId)) {
        return true;
      }
    }

    recursionStack.delete(currentId);
    return false;
  }

  return dfs(milestoneId);
}

/**
 * Validar que todas las dependencias existen en el proyecto
 */
export function validateDependenciesExist(
  dependencies: number[],
  projectMilestones: MilestoneWithDependencies[]
): { valid: boolean; invalidIds: number[] } {
  const milestoneIds = new Set(projectMilestones.map(m => m.id));
  const invalidIds = dependencies.filter(id => !milestoneIds.has(id));

  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
}

/**
 * Validar que un hito no dependa de sí mismo
 */
export function validateNoSelfDependency(
  milestoneId: number,
  dependencies: number[]
): boolean {
  return !dependencies.includes(milestoneId);
}

/**
 * Obtener todos los hitos que dependen de un hito específico
 */
export function getDependentMilestones(
  milestoneId: number,
  allMilestones: MilestoneWithDependencies[]
): number[] {
  return allMilestones
    .filter(m => {
      const deps = parseDependencies(m.dependencies);
      return deps.includes(milestoneId);
    })
    .map(m => m.id);
}

/**
 * Calcular el orden topológico de los hitos (para visualización)
 */
export function topologicalSort(
  milestones: MilestoneWithDependencies[]
): number[] {
  const inDegree = new Map<number, number>();
  const adjList = new Map<number, number[]>();

  // Inicializar
  milestones.forEach(m => {
    inDegree.set(m.id, 0);
    adjList.set(m.id, []);
  });

  // Construir grafo
  milestones.forEach(m => {
    const deps = parseDependencies(m.dependencies);
    deps.forEach(depId => {
      const list = adjList.get(depId) || [];
      list.push(m.id);
      adjList.set(depId, list);
      inDegree.set(m.id, (inDegree.get(m.id) || 0) + 1);
    });
  });

  // Algoritmo de Kahn
  const queue: number[] = [];
  const result: number[] = [];

  // Agregar nodos sin dependencias
  inDegree.forEach((degree, id) => {
    if (degree === 0) {
      queue.push(id);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    const neighbors = adjList.get(current) || [];
    neighbors.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  // Si no procesamos todos los nodos, hay un ciclo
  return result.length === milestones.length ? result : [];
}
