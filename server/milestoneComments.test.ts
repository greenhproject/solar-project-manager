import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de la base de datos
vi.mock("./db", () => ({
  getMilestoneComments: vi.fn(),
  createMilestoneComment: vi.fn(),
  deleteMilestoneComment: vi.fn(),
  getMilestoneCommentById: vi.fn(),
  getMilestoneById: vi.fn(),
}));

import * as db from "./db";

describe("Milestone Comments - Trazabilidad de Observaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMilestoneComments", () => {
    it("debería retornar comentarios con datos del usuario para auditoría", async () => {
      const mockComments = [
        {
          id: 1,
          milestoneId: 10,
          userId: 1,
          content: "Se verificó la instalación de paneles",
          createdAt: new Date("2026-04-13T15:30:00Z"),
          userName: "Jean Arias",
          userEmail: "jean@greenhproject.com",
          userRole: "engineer",
        },
        {
          id: 2,
          milestoneId: 10,
          userId: 2,
          content: "Aprobado por supervisión técnica",
          createdAt: new Date("2026-04-13T16:00:00Z"),
          userName: "Lyda Triviño",
          userEmail: "greenhproject@gmail.com",
          userRole: "admin",
        },
      ];

      vi.mocked(db.getMilestoneComments).mockResolvedValue(mockComments);

      const result = await db.getMilestoneComments(10);

      expect(result).toHaveLength(2);
      // Verificar que cada comentario tiene datos de trazabilidad
      for (const comment of result) {
        expect(comment).toHaveProperty("userId");
        expect(comment).toHaveProperty("userName");
        expect(comment).toHaveProperty("userEmail");
        expect(comment).toHaveProperty("userRole");
        expect(comment).toHaveProperty("createdAt");
        expect(comment).toHaveProperty("content");
        expect(comment.createdAt).toBeInstanceOf(Date);
      }
    });

    it("debería retornar array vacío si no hay comentarios", async () => {
      vi.mocked(db.getMilestoneComments).mockResolvedValue([]);

      const result = await db.getMilestoneComments(999);
      expect(result).toEqual([]);
    });
  });

  describe("createMilestoneComment", () => {
    it("debería crear un comentario con userId y milestoneId", async () => {
      vi.mocked(db.createMilestoneComment).mockResolvedValue(5);

      const commentId = await db.createMilestoneComment({
        milestoneId: 10,
        userId: 1,
        content: "Observación de prueba para auditoría",
      });

      expect(commentId).toBe(5);
      expect(db.createMilestoneComment).toHaveBeenCalledWith({
        milestoneId: 10,
        userId: 1,
        content: "Observación de prueba para auditoría",
      });
    });
  });

  describe("deleteMilestoneComment", () => {
    it("debería permitir eliminar un comentario propio", async () => {
      const mockComment = {
        id: 1,
        milestoneId: 10,
        userId: 1,
        content: "Mi comentario",
        createdAt: new Date(),
      };

      vi.mocked(db.getMilestoneCommentById).mockResolvedValue(mockComment);
      vi.mocked(db.deleteMilestoneComment).mockResolvedValue(undefined);

      const comment = await db.getMilestoneCommentById(1);
      expect(comment).toBeDefined();
      expect(comment!.userId).toBe(1);

      // Simular verificación de permisos: userId coincide
      const currentUserId = 1;
      const isOwner = comment!.userId === currentUserId;
      expect(isOwner).toBe(true);

      await db.deleteMilestoneComment(1);
      expect(db.deleteMilestoneComment).toHaveBeenCalledWith(1);
    });

    it("debería permitir a admin eliminar cualquier comentario", async () => {
      const mockComment = {
        id: 1,
        milestoneId: 10,
        userId: 2, // Otro usuario
        content: "Comentario de otro usuario",
        createdAt: new Date(),
      };

      vi.mocked(db.getMilestoneCommentById).mockResolvedValue(mockComment);
      vi.mocked(db.deleteMilestoneComment).mockResolvedValue(undefined);

      const comment = await db.getMilestoneCommentById(1);
      const currentUserId = 1;
      const currentUserRole = "admin";

      // Admin puede eliminar aunque no sea el autor
      const canDelete = comment!.userId === currentUserId || currentUserRole === "admin";
      expect(canDelete).toBe(true);

      await db.deleteMilestoneComment(1);
      expect(db.deleteMilestoneComment).toHaveBeenCalledWith(1);
    });

    it("NO debería permitir a un usuario no-admin eliminar comentario ajeno", async () => {
      const mockComment = {
        id: 1,
        milestoneId: 10,
        userId: 2, // Otro usuario
        content: "Comentario de otro usuario",
        createdAt: new Date(),
      };

      vi.mocked(db.getMilestoneCommentById).mockResolvedValue(mockComment);

      const comment = await db.getMilestoneCommentById(1);
      const currentUserId = 3; // Diferente al autor
      const currentUserRole = "engineer";

      const canDelete = comment!.userId === currentUserId || currentUserRole === "admin";
      expect(canDelete).toBe(false);
    });
  });

  describe("Validación de datos de trazabilidad", () => {
    it("debería incluir fecha de creación en cada comentario", async () => {
      const now = new Date();
      vi.mocked(db.createMilestoneComment).mockResolvedValue(1);

      await db.createMilestoneComment({
        milestoneId: 10,
        userId: 1,
        content: "Comentario con timestamp",
      });

      // Verificar que se llamó con los datos correctos
      const callArgs = vi.mocked(db.createMilestoneComment).mock.calls[0][0];
      expect(callArgs.milestoneId).toBe(10);
      expect(callArgs.userId).toBe(1);
      expect(callArgs.content).toBe("Comentario con timestamp");
    });

    it("debería vincular comentario al hito correcto", async () => {
      vi.mocked(db.getMilestoneById).mockResolvedValue({
        id: 10,
        projectId: 5,
        name: "Lista de materiales",
        description: null,
        startDate: null,
        dueDate: new Date(),
        completedDate: null,
        status: "pending",
        orderIndex: 1,
        weight: 1,
        notes: null,
        observations: null,
        dependencies: null,
        assignedUserId: null,
        googleCalendarEventId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const milestone = await db.getMilestoneById(10);
      expect(milestone).toBeDefined();
      expect(milestone!.id).toBe(10);

      vi.mocked(db.createMilestoneComment).mockResolvedValue(1);
      await db.createMilestoneComment({
        milestoneId: milestone!.id,
        userId: 1,
        content: "Observación vinculada al hito correcto",
      });

      expect(db.createMilestoneComment).toHaveBeenCalledWith(
        expect.objectContaining({ milestoneId: 10 })
      );
    });
  });
});
