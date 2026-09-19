import { describe, expect, it } from "vitest";
import { partitionRemindersByOwnership } from "../shared/reminderOwnership";

describe("partitionRemindersByOwnership", () => {
  const reminders = [
    { milestoneId: 1, assignedUserId: 10, label: "Propio" },
    { milestoneId: 2, assignedUserId: 20, label: "Equipo" },
    { milestoneId: 3, assignedUserId: null, label: "Sin responsable" },
  ];

  it("prioritizes only the milestones explicitly assigned to the current administrator", () => {
    const result = partitionRemindersByOwnership(reminders, 10);

    expect(result.mine).toEqual([{ milestoneId: 1, assignedUserId: 10, label: "Propio" }]);
    expect(result.team).toEqual([
      { milestoneId: 2, assignedUserId: 20, label: "Equipo" },
      { milestoneId: 3, assignedUserId: null, label: "Sin responsable" },
    ]);
  });

  it("keeps all reminders in team context when there is no authenticated user id", () => {
    const result = partitionRemindersByOwnership(reminders, null);

    expect(result.mine).toEqual([]);
    expect(result.team).toHaveLength(3);
  });
});
