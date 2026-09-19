export type AssignableReminder = {
  assignedUserId: number | null;
};

export type ReminderOwnershipPartition<T extends AssignableReminder> = {
  mine: T[];
  team: T[];
};

/**
 * Separa los hitos asignados explícitamente a la persona de la bandeja general
 * del equipo. Los hitos sin responsable siempre quedan en equipo: un
 * administrador puede supervisarlos, pero no debe verlos como una tarea propia.
 */
export function partitionRemindersByOwnership<T extends AssignableReminder>(
  reminders: T[] | null | undefined,
  currentUserId: number | null | undefined,
): ReminderOwnershipPartition<T> {
  const mine: T[] = [];
  const team: T[] = [];

  for (const reminder of reminders ?? []) {
    if (currentUserId != null && reminder.assignedUserId === currentUserId) {
      mine.push(reminder);
    } else {
      team.push(reminder);
    }
  }

  return { mine, team };
}
