/**
 * Servicio de autenticación con Auth0
 * 
 * Este servicio valida tokens JWT de Auth0 y gestiona usuarios.
 * IMPORTANTE: El login NUNCA modifica roles. Los roles se gestionan
 * exclusivamente desde la UI de Gestión de Usuarios (admin).
 * Única excepción: greenhproject@gmail.com siempre es admin.
 */

import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

class Auth0Service {
  private jwksUrl: string;
  private audience: string;
  private issuer: string;

  constructor() {
    const domain = ENV.auth0Domain || '';
    this.audience = ENV.auth0Audience || '';
    this.issuer = `https://${domain}/`;
    this.jwksUrl = `${this.issuer}.well-known/jwks.json`;
    
    console.log("[Auth0] Initialized", {
      domain,
      audience: this.audience,
      issuer: this.issuer,
    });
  }

  /**
   * Verificar un token JWT de Auth0
   */
  async verifyAuth0Token(token: string): Promise<any> {
    try {
      const JWKS = createRemoteJWKSet(new URL(this.jwksUrl));
      
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: this.issuer,
        audience: this.audience,
      });

      return payload;
    } catch (error) {
      console.error("[Auth0] Token verification failed:", error);
      return null;
    }
  }

  /**
   * Autenticar una solicitud usando un token de Auth0.
   * Solo identifica al usuario por email. NO modifica roles.
   */
  async authenticateRequest(req: Request): Promise<User> {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn("[Auth0] Missing or invalid Authorization header");
      throw ForbiddenError("Missing Auth0 token");
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    // Verificar el token con Auth0
    const payload = await this.verifyAuth0Token(token);

    if (!payload) {
      console.error("[Auth0] Token verification failed");
      throw ForbiddenError("Invalid Auth0 token");
    }

    // Extraer información del usuario del token
    const auth0UserId = payload.sub as string; // e.g., "google-oauth2|123456"
    
    // Leer email y name de los headers HTTP personalizados
    let email = req.headers['x-user-email'] as string | undefined;
    let name = req.headers['x-user-name'] as string | undefined;
    
    console.log("[Auth0] Token verified", { sub: auth0UserId, email, name });

    // Buscar usuario por openId (sub de Auth0)
    let user = await db.getUserByOpenId(auth0UserId);

    // Si no existe con este sub, buscar por email
    if (!user && email) {
      const existingUserByEmail = await db.getUserByEmail(email);
      if (existingUserByEmail) {
        console.log("[Auth0] Found existing user by email, updating openId", {
          userId: existingUserByEmail.id,
          email,
        });
        
        // Actualizar solo openId, name y lastSignedIn - NO tocar rol
        const updatedName = existingUserByEmail.name && existingUserByEmail.name.trim() 
          ? existingUserByEmail.name 
          : (name || existingUserByEmail.name);
        
        await db.upsertUser({
          openId: existingUserByEmail.openId!,
          name: updatedName,
          email: email,
          lastSignedIn: new Date(),
        });
        
        user = await db.getUserByOpenId(existingUserByEmail.openId!);
        
        if (!user) {
          throw ForbiddenError("Failed to update user");
        }
        
        return user;
      }
    }

    if (!user) {
      // Crear nuevo usuario - role será 'client' por defecto (schema default)
      // El admin lo cambiará desde Gestión de Usuarios si necesita otro rol
      console.log("[Auth0] Creating new user:", email);
      
      await db.upsertUser({
        openId: auth0UserId,
        name: name || null,
        email: email || null,
        lastSignedIn: new Date(),
      });

      user = await db.getUserByOpenId(auth0UserId);
      
      if (!user) {
        throw ForbiddenError("Failed to create user");
      }

      // Auto-vincular proyectos existentes por email del cliente
      if (email) {
        try {
          const { projects, clientProjectAccess } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const dbInst = await db.getDb();
          if (dbInst) {
            const matchingProjects = await dbInst.select({ id: projects.id })
              .from(projects)
              .where(eq(projects.clientEmail, email));
            
            if (matchingProjects.length > 0) {
              for (const proj of matchingProjects) {
                await dbInst.insert(clientProjectAccess).values({
                  clientUserId: user.id,
                  projectId: proj.id,
                  canViewFiles: true,
                  canViewUpdates: true,
                  grantedBy: user.id,
                }).onDuplicateKeyUpdate({ set: { canViewFiles: true } });
              }
              console.log(`[Auth0] Auto-vinculados ${matchingProjects.length} proyectos para ${email}`);
            }
          }
        } catch (err) {
          console.error("[Auth0] Error auto-vinculando proyectos:", err);
        }
      }
    } else {
      // Usuario existente: solo actualizar lastSignedIn y loginMethod
      // NO tocar el rol - se gestiona exclusivamente desde UI admin
      const updatedName = user.name && user.name.trim() ? user.name : (name || user.name);
      
      console.log(`[Auth0] Existing user login: ${email} (role: ${user.role}) - role NOT modified`);
      
      await db.upsertUser({
        openId: auth0UserId,
        name: updatedName,
        email: email || user.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });
      
      // Recargar usuario
      user = await db.getUserByOpenId(auth0UserId);
      
      if (!user) {
        throw ForbiddenError("Failed to reload user");
      }
    }

    return user;
  }
}

export const auth0Service = new Auth0Service();
