import { describe, it, expect } from "vitest";
import { addBusinessDays, getBusinessDaysBetween } from "../shared/businessDays";

describe("Business Days Utility", () => {
  it("should add business days skipping weekends", () => {
    // Monday April 14, 2026
    const monday = new Date(2026, 3, 14);
    // Add 5 business days: Tue15, Wed16, Thu17, Fri18 (skip Sat19, Sun20), Mon21
    const result = addBusinessDays(monday, 5, false);
    expect(result.getDay()).toBe(2); // Tuesday (Tue15,Wed16,Thu17,Fri18,Mon21 skipped weekends -> Tue21? No: 15=Tue,16=Wed,17=Thu,18=Fri,21=Mon -> Mon=1? Actually result is 21 day 2=Tue)
    expect(result.getDate()).toBe(21);
  });

  it("should add days including weekends when configured", () => {
    // Monday April 14, 2026
    const monday = new Date(2026, 3, 14);
    // Add 5 calendar days = April 19, 2026 (Sunday)
    const result = addBusinessDays(monday, 5, true);
    expect(result.getDate()).toBe(19);
    expect(result.getDay()).toBe(0); // Sunday (day 0)
  });

  it("should handle starting on a weekend", () => {
    // Saturday April 18, 2026
    const saturday = new Date(2026, 3, 18);
    // Add 1 business day: skip Sun19, land on Mon20
    const result = addBusinessDays(saturday, 1, false);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(20);
  });

  it("should handle 0 business days", () => {
    const monday = new Date(2026, 3, 14);
    const result = addBusinessDays(monday, 0, false);
    expect(result.getDate()).toBe(14);
  });

  it("should calculate business days between two dates", () => {
    // Monday to Friday = 4 business days
    const monday = new Date(2026, 3, 14);
    const friday = new Date(2026, 3, 17);
    const result = getBusinessDaysBetween(monday, friday, false);
    expect(result).toBe(3);
  });

  it("should calculate calendar days between two dates when weekends included", () => {
    const monday = new Date(2026, 3, 14);
    const nextMonday = new Date(2026, 3, 21);
    const result = getBusinessDaysBetween(monday, nextMonday, true);
    expect(result).toBe(7);
  });

  it("should add business days across multiple weeks", () => {
    // Monday April 14, 2026
    const monday = new Date(2026, 3, 14);
    // Add 10 business days: Tue15-Fri18 (4), Mon21-Fri25 (4+4=8), Mon28-Tue29 (8+2=10)
    // Actually: 5 biz days = Mon21, 10 biz days = Mon28
    const result = addBusinessDays(monday, 10, false);
    expect(result.getDate()).toBe(28);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDay()).toBe(2); // Tuesday
  });
});

describe("PDF Generator", () => {
  it("should export generateProjectReport function", async () => {
    const { generateProjectReport } = await import("./pdfGenerator");
    expect(typeof generateProjectReport).toBe("function");
  });

  it("should generate a PDF buffer with valid data", async () => {
    const { generateProjectReport } = await import("./pdfGenerator");
    
    const mockProject = {
      id: 1,
      name: "Test Solar Project",
      description: "A test project for solar installation",
      location: "Bogotá, Colombia",
      clientName: "Test Client",
      status: "in_progress",
      startDate: new Date("2026-04-01"),
      estimatedEndDate: new Date("2026-12-31"),
      progressPercentage: 45,
      projectTypeId: 1,
      assignedEngineerId: 1,
      openSolarId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMilestones = [
      {
        id: 1,
        projectId: 1,
        name: "Mesa técnica de trabajo",
        description: "Reunión inicial",
        status: "completed",
        dueDate: new Date("2026-04-15"),
        completedDate: new Date("2026-04-14"),
        orderIndex: 0,
        assignedUserId: null,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date("2026-04-14"),
        endDate: new Date("2026-04-15"),
        durationDays: 1,
      },
      {
        id: 2,
        projectId: 1,
        name: "Diseño plano unifilar",
        description: "Diseño de planos",
        status: "pending",
        dueDate: new Date("2026-04-20"),
        completedDate: null,
        orderIndex: 1,
        assignedUserId: null,
        observations: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date("2026-04-16"),
        endDate: new Date("2026-04-20"),
        durationDays: 3,
      },
    ];

    const buffer = await generateProjectReport({
      project: mockProject as any,
      milestones: mockMilestones as any,
      projectType: { name: "Residencial", color: "#FF6B35" },
      assignedEngineer: { name: "Jean Arias", email: "jean@test.com" },
      milestoneComments: {
        1: [
          {
            id: 1,
            milestoneId: 1,
            userId: 1,
            content: "Se completó la mesa técnica exitosamente",
            createdAt: new Date("2026-04-14T10:30:00"),
            userName: "Lyda Triviño",
            userEmail: "lyda@test.com",
            userRole: "admin",
          },
        ],
      },
      includeGantt: true,
      includeSchedule: true,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF magic bytes: %PDF
    expect(buffer[0]).toBe(0x25); // %
    expect(buffer[1]).toBe(0x50); // P
    expect(buffer[2]).toBe(0x44); // D
    expect(buffer[3]).toBe(0x46); // F
  });

  it("should generate PDF without optional sections", async () => {
    const { generateProjectReport } = await import("./pdfGenerator");
    
    const mockProject = {
      id: 2,
      name: "Minimal Project",
      description: null,
      location: "Medellín",
      clientName: null,
      status: "planning",
      startDate: new Date("2026-05-01"),
      estimatedEndDate: new Date("2026-08-01"),
      progressPercentage: 0,
      projectTypeId: null,
      assignedEngineerId: null,
      openSolarId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const buffer = await generateProjectReport({
      project: mockProject as any,
      milestones: [],
      includeGantt: false,
      includeSchedule: false,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
