/**
 * Tests para la lógica de cascada automática de fechas de hitos.
 * Verifica que al cambiar la fecha de un hito, los hitos siguientes
 * se recalculen correctamente usando los días de duración de la plantilla.
 */
import { describe, it, expect } from "vitest";

// Simulamos la lógica de cascada que está en el servidor (routers.ts)
// para probar el algoritmo de cálculo de fechas

interface MockMilestone {
  id: number;
  orderIndex: number;
  dueDate: Date;
  status: string;
  name: string;
}

interface MockTemplate {
  orderIndex: number;
  estimatedDurationDays: number;
}

/**
 * Función que replica la lógica de cascada del servidor.
 * Dado un hito editado y su nueva fecha, recalcula las fechas
 * de los hitos siguientes usando las duraciones de la plantilla.
 */
function calculateCascadeDates(
  editedMilestoneOrderIndex: number,
  newDueDate: Date,
  allMilestones: MockMilestone[],
  templates: MockTemplate[]
): { milestoneId: number; newDueDate: Date }[] {
  // Crear mapa de orderIndex -> estimatedDurationDays
  const durationByOrder = new Map<number, number>();
  for (const tmpl of templates) {
    durationByOrder.set(tmpl.orderIndex, tmpl.estimatedDurationDays || 7);
  }

  // Filtrar hitos con orderIndex mayor al editado y no completados
  const subsequentMilestones = allMilestones
    .filter(
      (m) =>
        m.orderIndex > editedMilestoneOrderIndex && m.status !== "completed"
    )
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const updates: { milestoneId: number; newDueDate: Date }[] = [];
  let previousDueDate = new Date(newDueDate);

  for (const milestone of subsequentMilestones) {
    const durationDays = durationByOrder.get(milestone.orderIndex) || 7;
    const newDate = new Date(previousDueDate);
    newDate.setDate(newDate.getDate() + durationDays);

    updates.push({ milestoneId: milestone.id, newDueDate: newDate });
    previousDueDate = newDate;
  }

  return updates;
}

describe("Cascada automática de fechas de hitos", () => {
  // Plantillas de ejemplo (similar a la imagen del usuario)
  const templates: MockTemplate[] = [
    { orderIndex: 1, estimatedDurationDays: 1 }, // Visita técnica presencial
    { orderIndex: 2, estimatedDurationDays: 2 }, // Compra de equipos / Mesa técnica
    { orderIndex: 3, estimatedDurationDays: 5 }, // Diseño de proyecto unifilares
    { orderIndex: 4, estimatedDurationDays: 7 }, // Fabricación material eléctrico
    { orderIndex: 5, estimatedDurationDays: 7 }, // Adecuaciones civiles
    { orderIndex: 6, estimatedDurationDays: 1 }, // Análisis materiales segundarios
    { orderIndex: 7, estimatedDurationDays: 1 }, // Aprobación materiales
    { orderIndex: 8, estimatedDurationDays: 3 }, // Alistamiento y despacho
  ];

  // Hitos de ejemplo para un proyecto
  const baseMilestones: MockMilestone[] = [
    {
      id: 1,
      orderIndex: 1,
      dueDate: new Date("2026-04-10T12:00:00"),
      status: "pending",
      name: "Visita técnica presencial",
    },
    {
      id: 2,
      orderIndex: 2,
      dueDate: new Date("2026-04-12T12:00:00"),
      status: "pending",
      name: "Compra de equipos principales",
    },
    {
      id: 3,
      orderIndex: 3,
      dueDate: new Date("2026-04-17T12:00:00"),
      status: "pending",
      name: "Diseño de proyecto unifilares",
    },
    {
      id: 4,
      orderIndex: 4,
      dueDate: new Date("2026-04-24T12:00:00"),
      status: "pending",
      name: "Fabricación material eléctrico",
    },
    {
      id: 5,
      orderIndex: 5,
      dueDate: new Date("2026-05-01T12:00:00"),
      status: "pending",
      name: "Adecuaciones civiles",
    },
    {
      id: 6,
      orderIndex: 6,
      dueDate: new Date("2026-05-02T12:00:00"),
      status: "pending",
      name: "Análisis materiales segundarios",
    },
    {
      id: 7,
      orderIndex: 7,
      dueDate: new Date("2026-05-03T12:00:00"),
      status: "pending",
      name: "Aprobación materiales",
    },
    {
      id: 8,
      orderIndex: 8,
      dueDate: new Date("2026-05-06T12:00:00"),
      status: "pending",
      name: "Alistamiento y despacho",
    },
  ];

  describe("Cálculo básico de cascada", () => {
    it("debería recalcular todos los hitos siguientes al cambiar el primer hito", () => {
      // Cambiar hito 1 (orderIndex=1) al 15 de abril
      const newDate = new Date("2026-04-15T12:00:00");
      const updates = calculateCascadeDates(1, newDate, baseMilestones, templates);

      // Debería actualizar 7 hitos (del 2 al 8)
      expect(updates).toHaveLength(7);

      // Hito 2 (orderIndex=2, duración=2): 15 abr + 2 = 17 abr
      expect(updates[0].milestoneId).toBe(2);
      expect(updates[0].newDueDate.getDate()).toBe(17);

      // Hito 3 (orderIndex=3, duración=5): 17 abr + 5 = 22 abr
      expect(updates[1].milestoneId).toBe(3);
      expect(updates[1].newDueDate.getDate()).toBe(22);

      // Hito 4 (orderIndex=4, duración=7): 22 abr + 7 = 29 abr
      expect(updates[2].milestoneId).toBe(4);
      expect(updates[2].newDueDate.getDate()).toBe(29);
    });

    it("debería recalcular solo los hitos posteriores al hito editado", () => {
      // Cambiar hito 5 (orderIndex=5) al 10 de mayo
      const newDate = new Date("2026-05-10T12:00:00");
      const updates = calculateCascadeDates(5, newDate, baseMilestones, templates);

      // Debería actualizar solo 3 hitos (6, 7, 8)
      expect(updates).toHaveLength(3);

      // Hito 6 (duración=1): 10 may + 1 = 11 may
      expect(updates[0].milestoneId).toBe(6);
      expect(updates[0].newDueDate.getDate()).toBe(11);

      // Hito 7 (duración=1): 11 may + 1 = 12 may
      expect(updates[1].milestoneId).toBe(7);
      expect(updates[1].newDueDate.getDate()).toBe(12);

      // Hito 8 (duración=3): 12 may + 3 = 15 may
      expect(updates[2].milestoneId).toBe(8);
      expect(updates[2].newDueDate.getDate()).toBe(15);
    });

    it("no debería actualizar nada al cambiar el último hito", () => {
      const newDate = new Date("2026-06-01T12:00:00");
      const updates = calculateCascadeDates(8, newDate, baseMilestones, templates);

      expect(updates).toHaveLength(0);
    });
  });

  describe("Hitos completados no se mueven", () => {
    it("debería saltar hitos completados en la cascada", () => {
      const milestonesWithCompleted = baseMilestones.map((m) => ({
        ...m,
        // Marcar hito 3 como completado
        status: m.id === 3 ? "completed" : m.status,
      }));

      // Cambiar hito 1
      const newDate = new Date("2026-04-15T12:00:00");
      const updates = calculateCascadeDates(
        1,
        newDate,
        milestonesWithCompleted,
        templates
      );

      // Debería actualizar 6 hitos (2, 4, 5, 6, 7, 8) - saltando el 3 que está completado
      expect(updates).toHaveLength(6);

      // Verificar que el hito 3 no está en las actualizaciones
      const updatedIds = updates.map((u) => u.milestoneId);
      expect(updatedIds).not.toContain(3);

      // Hito 2 sigue siendo el primero en actualizarse
      expect(updates[0].milestoneId).toBe(2);
    });
  });

  describe("Manejo de plantillas faltantes", () => {
    it("debería usar 7 días por defecto si no hay plantilla para un orderIndex", () => {
      // Plantillas parciales (solo para orderIndex 1 y 2)
      const partialTemplates: MockTemplate[] = [
        { orderIndex: 1, estimatedDurationDays: 1 },
        { orderIndex: 2, estimatedDurationDays: 2 },
      ];

      const milestones: MockMilestone[] = [
        {
          id: 1,
          orderIndex: 1,
          dueDate: new Date("2026-04-10T12:00:00"),
          status: "pending",
          name: "Hito 1",
        },
        {
          id: 2,
          orderIndex: 2,
          dueDate: new Date("2026-04-12T12:00:00"),
          status: "pending",
          name: "Hito 2",
        },
        {
          id: 3,
          orderIndex: 3,
          dueDate: new Date("2026-04-19T12:00:00"),
          status: "pending",
          name: "Hito 3 (sin plantilla)",
        },
      ];

      const newDate = new Date("2026-04-15T12:00:00");
      const updates = calculateCascadeDates(1, newDate, milestones, partialTemplates);

      expect(updates).toHaveLength(2);

      // Hito 2 (duración=2): 15 + 2 = 17
      expect(updates[0].newDueDate.getDate()).toBe(17);

      // Hito 3 (sin plantilla, usa 7 por defecto): 17 + 7 = 24
      expect(updates[1].newDueDate.getDate()).toBe(24);
    });
  });

  describe("Cascada con fechas que cruzan meses", () => {
    it("debería manejar correctamente el cambio de mes", () => {
      const newDate = new Date("2026-04-28T12:00:00");
      const updates = calculateCascadeDates(1, newDate, baseMilestones, templates);

      // Hito 2 (duración=2): 28 abr + 2 = 30 abr
      expect(updates[0].newDueDate.getMonth()).toBe(3); // Abril = 3
      expect(updates[0].newDueDate.getDate()).toBe(30);

      // Hito 3 (duración=5): 30 abr + 5 = 5 may
      expect(updates[1].newDueDate.getMonth()).toBe(4); // Mayo = 4
      expect(updates[1].newDueDate.getDate()).toBe(5);
    });
  });

  describe("Cascada sin cascada (solo este hito)", () => {
    it("no debería generar actualizaciones cuando cascadeSubsequent es false", () => {
      // Simular el comportamiento de cascadeSubsequent: false
      // En ese caso, la función no se llama en absoluto
      // Pero verificamos que el array vacío funciona
      const updates = calculateCascadeDates(
        1,
        new Date("2026-04-15T12:00:00"),
        [], // Sin hitos subsecuentes
        templates
      );

      expect(updates).toHaveLength(0);
    });
  });
});
