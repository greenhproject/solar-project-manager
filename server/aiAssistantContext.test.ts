import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getAllProjects: vi.fn(),
  getProjectsWithAssignedMilestones: vi.fn(),
  getProjectsByEngineerId: vi.fn(),
  getAllUsers: vi.fn(),
  getAllMilestones: vi.fn(),
  getProjectUpdatesByProjectId: vi.fn(),
}));

import * as db from "./db";
import { buildAiAssistantContext } from "./aiAssistantContext";

const projectA = {
  id: 1,
  name: "Proyecto visible",
  description: "Proyecto asignado al usuario",
  projectTypeId: 1,
  assignedEngineerId: 10,
  startDate: new Date("2026-01-01"),
  estimatedEndDate: new Date("2026-02-01"),
  actualEndDate: null,
  status: "in_progress",
  progressPercentage: 45,
  location: "Bogotá",
  clientName: "Cliente A",
};

const projectB = {
  ...projectA,
  id: 2,
  name: "Proyecto restringido",
  clientName: "Cliente B",
};

const milestoneA = {
  id: 101,
  projectId: 1,
  name: "Hito visible",
  description: "Información autorizada",
  startDate: new Date("2026-01-02"),
  endDate: new Date("2026-01-10"),
  dueDate: new Date("2026-01-10"),
  completedDate: null,
  status: "pending",
  durationDays: 8,
  weight: 1,
  assignedUserId: 10,
  notes: null,
  observations: null,
};

const milestoneB = {
  ...milestoneA,
  id: 102,
  projectId: 2,
  name: "Hito restringido",
  assignedUserId: 20,
};

describe("AI Assistant role-aware context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getAllProjects).mockResolvedValue([projectA, projectB] as any);
    vi.mocked(db.getProjectsWithAssignedMilestones).mockResolvedValue([projectA] as any);
    vi.mocked(db.getProjectsByEngineerId).mockResolvedValue([] as any);
    vi.mocked(db.getAllUsers).mockResolvedValue([] as any);
    vi.mocked(db.getAllMilestones).mockResolvedValue([milestoneA, milestoneB] as any);
    vi.mocked(db.getProjectUpdatesByProjectId).mockResolvedValue([] as any);
  });

  it("includes all authorized project and milestone data for an administrator", async () => {
    const result = await buildAiAssistantContext({
      id: 1,
      name: "Admin",
      email: "admin@greenhproject.com",
      role: "admin",
    });

    expect(result.scope).toContain("Visibilidad global");
    expect(result.projectCount).toBe(2);
    expect(result.milestoneCount).toBe(2);
    expect(result.context).toContain("Proyecto visible");
    expect(result.context).toContain("Proyecto restringido");
    expect(db.getAllProjects).toHaveBeenCalledOnce();
  });

  it("excludes projects and milestones outside an engineer's assigned scope", async () => {
    const result = await buildAiAssistantContext({
      id: 10,
      name: "Ingeniero",
      email: "engineer@greenhproject.com",
      role: "engineer",
    });

    expect(result.scope).toContain("Visibilidad individual");
    expect(result.projectCount).toBe(1);
    expect(result.milestoneCount).toBe(1);
    expect(result.context).toContain("Proyecto visible");
    expect(result.context).toContain("Hito visible");
    expect(result.context).not.toContain("Proyecto restringido");
    expect(result.context).not.toContain("Hito restringido");
    expect(db.getProjectsWithAssignedMilestones).toHaveBeenCalledWith(10);
    expect(db.getAllProjects).not.toHaveBeenCalled();
  });
});
