import { describe, expect, it } from "vitest";
import { mergeSupportTicketsAuthorizedProjects } from "./supportTicketsDashboardAccess";

describe("mergeSupportTicketsAuthorizedProjects", () => {
  it("includes projects from assigned engineer and assigned milestones without duplicates", () => {
    const engineerProjects = [
      { id: 10, name: "Ingeniería asignada" },
      { id: 30, name: "Ambas fuentes" },
    ];
    const milestoneProjects = [
      { id: 20, name: "Hito asignado" },
      { id: 30, name: "Ambas fuentes" },
    ];

    expect(mergeSupportTicketsAuthorizedProjects(engineerProjects, milestoneProjects)).toEqual([
      { id: 10, name: "Ingeniería asignada" },
      { id: 30, name: "Ambas fuentes" },
      { id: 20, name: "Hito asignado" },
    ]);
  });

  it("does not introduce unrelated projects into the authorized result", () => {
    const visible = mergeSupportTicketsAuthorizedProjects(
      [{ id: 10, name: "Autorizado por ingeniería" }],
      [],
    );

    expect(visible.map(project => project.id)).not.toContain(999);
  });
});
