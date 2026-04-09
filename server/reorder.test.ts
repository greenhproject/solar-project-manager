import { describe, it, expect } from "vitest";

/**
 * Tests para la funcionalidad de reordenamiento de hitos y plantillas.
 * Verifica la lógica de reordenamiento sin acceso a la base de datos.
 */

// Simular la lógica de reordenamiento que se usa en el servidor
function reorderItems<T extends { id: number; orderIndex: number }>(
  items: T[],
  orderedIds: number[]
): T[] {
  const result = [...items];
  for (let i = 0; i < orderedIds.length; i++) {
    const item = result.find((it) => it.id === orderedIds[i]);
    if (item) {
      item.orderIndex = i + 1;
    }
  }
  return result.sort((a, b) => a.orderIndex - b.orderIndex);
}

describe("Reordenamiento de hitos", () => {
  it("debería reordenar correctamente una lista simple", () => {
    const items = [
      { id: 1, orderIndex: 1, name: "Visita técnica" },
      { id: 2, orderIndex: 2, name: "Compra de equipos" },
      { id: 3, orderIndex: 3, name: "Mesa técnica" },
    ];

    const result = reorderItems(items, [3, 1, 2]);

    expect(result[0].id).toBe(3);
    expect(result[0].orderIndex).toBe(1);
    expect(result[1].id).toBe(1);
    expect(result[1].orderIndex).toBe(2);
    expect(result[2].id).toBe(2);
    expect(result[2].orderIndex).toBe(3);
  });

  it("debería mover un elemento del final al inicio", () => {
    const items = [
      { id: 10, orderIndex: 1, name: "Hito A" },
      { id: 20, orderIndex: 2, name: "Hito B" },
      { id: 30, orderIndex: 3, name: "Hito C" },
      { id: 40, orderIndex: 4, name: "Hito D" },
    ];

    const result = reorderItems(items, [40, 10, 20, 30]);

    expect(result[0].id).toBe(40);
    expect(result[0].orderIndex).toBe(1);
    expect(result[1].id).toBe(10);
    expect(result[1].orderIndex).toBe(2);
    expect(result[2].id).toBe(20);
    expect(result[2].orderIndex).toBe(3);
    expect(result[3].id).toBe(30);
    expect(result[3].orderIndex).toBe(4);
  });

  it("debería mover un elemento del inicio al final", () => {
    const items = [
      { id: 1, orderIndex: 1, name: "Primero" },
      { id: 2, orderIndex: 2, name: "Segundo" },
      { id: 3, orderIndex: 3, name: "Tercero" },
    ];

    const result = reorderItems(items, [2, 3, 1]);

    expect(result[0].id).toBe(2);
    expect(result[0].orderIndex).toBe(1);
    expect(result[1].id).toBe(3);
    expect(result[1].orderIndex).toBe(2);
    expect(result[2].id).toBe(1);
    expect(result[2].orderIndex).toBe(3);
  });

  it("debería mantener el orden si no hay cambios", () => {
    const items = [
      { id: 1, orderIndex: 1, name: "A" },
      { id: 2, orderIndex: 2, name: "B" },
      { id: 3, orderIndex: 3, name: "C" },
    ];

    const result = reorderItems(items, [1, 2, 3]);

    expect(result[0].id).toBe(1);
    expect(result[0].orderIndex).toBe(1);
    expect(result[1].id).toBe(2);
    expect(result[1].orderIndex).toBe(2);
    expect(result[2].id).toBe(3);
    expect(result[2].orderIndex).toBe(3);
  });

  it("debería manejar un solo elemento", () => {
    const items = [{ id: 1, orderIndex: 1, name: "Único" }];

    const result = reorderItems(items, [1]);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(1);
    expect(result[0].orderIndex).toBe(1);
  });

  it("debería intercambiar dos elementos adyacentes", () => {
    const items = [
      { id: 1, orderIndex: 1, name: "A" },
      { id: 2, orderIndex: 2, name: "B" },
      { id: 3, orderIndex: 3, name: "C" },
      { id: 4, orderIndex: 4, name: "D" },
    ];

    // Intercambiar B y C (posiciones 2 y 3)
    const result = reorderItems(items, [1, 3, 2, 4]);

    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(3);
    expect(result[1].orderIndex).toBe(2);
    expect(result[2].id).toBe(2);
    expect(result[2].orderIndex).toBe(3);
    expect(result[3].id).toBe(4);
  });

  it("debería invertir completamente el orden", () => {
    const items = [
      { id: 1, orderIndex: 1, name: "A" },
      { id: 2, orderIndex: 2, name: "B" },
      { id: 3, orderIndex: 3, name: "C" },
      { id: 4, orderIndex: 4, name: "D" },
      { id: 5, orderIndex: 5, name: "E" },
    ];

    const result = reorderItems(items, [5, 4, 3, 2, 1]);

    expect(result[0].id).toBe(5);
    expect(result[0].orderIndex).toBe(1);
    expect(result[4].id).toBe(1);
    expect(result[4].orderIndex).toBe(5);
  });
});

describe("arrayMove (lógica de @dnd-kit)", () => {
  // Simular arrayMove de @dnd-kit
  function arrayMove<T>(array: T[], from: number, to: number): T[] {
    const newArray = [...array];
    const [removed] = newArray.splice(from, 1);
    newArray.splice(to, 0, removed);
    return newArray;
  }

  it("debería mover un elemento hacia adelante", () => {
    const items = ["A", "B", "C", "D"];
    const result = arrayMove(items, 0, 2);
    expect(result).toEqual(["B", "C", "A", "D"]);
  });

  it("debería mover un elemento hacia atrás", () => {
    const items = ["A", "B", "C", "D"];
    const result = arrayMove(items, 3, 1);
    expect(result).toEqual(["A", "D", "B", "C"]);
  });

  it("no debería cambiar nada si from === to", () => {
    const items = ["A", "B", "C"];
    const result = arrayMove(items, 1, 1);
    expect(result).toEqual(["A", "B", "C"]);
  });
});
