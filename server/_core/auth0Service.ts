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
   * 
   * Flujo:
   * 1. Verificar token JWT de Auth0
   * 2. Buscar usuario por openId (sub de Auth0)
   * 3. Si no existe por openId, buscar por email
   *    - Si existe por email: MIGRAR su openId al nuevo sub de Auth0 (UPDATE directo)
   *    - Si no existe: crear nuevo usuario
   * 4. Si existe por openId: actualizar lastSignedIn
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

    // PASO 1: Buscar usuario por openId (sub de Auth0)
    let user = await db.getUserByOpenId(auth0UserId);

    if (user) {
      // Usuario ya existe con este openId de Auth0 - solo actualizar lastSignedIn
      const updatedName = user.name && user.name.trim() ? user.name : (name || user.name);
      
      console.log(`[Auth0] Existing user login (by openId): ${user.email} (role: ${user.role}) - role NOT modified`);
      
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
      
      return user;
    }

    // PASO 2: No existe por openId - buscar por email
    if (email) {
      const existingUserByEmail = await db.getUserByEmail(email);
      if (existingUserByEmail) {
        // Usuario existe con OTRO openId (ej: creado por SSO con jwt_xxx)
        // MIGRAR: actualizar su openId al nuevo sub de Auth0 usando UPDATE directo
        // Esto evita el conflicto de UNIQUE en email al intentar INSERT
        console.log("[Auth0] Migrating user openId from SSO to Auth0", {
          userId: existingUserByEmail.id,
          email,
          oldOpenId: existingUserByEmail.openId,
          newOpenId: auth0UserId,
          role: existingUserByEmail.role,
        });
        
        const updatedName = existingUserByEmail.name && existingUserByEmail.name.trim() 
          ? existingUserByEmail.name 
          : (name || existingUserByEmail.name);
        
        // UPDATE directo por ID - no upsert (evita conflicto UNIQUE en email)
        await db.updateUserOpenIdAndLogin(existingUserByEmail.id, {
          openId: auth0UserId,
          name: updatedName,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
        
        // Recargar usuario con el nuevo openId
        user = await db.getUserByOpenId(auth0UserId);
        
        if (!user) {
          // Fallback: buscar por ID
          user = await db.getUserById(existingUserByEmail.id);
        }
        
        if (!user) {
          throw ForbiddenError("Failed to migrate user openId");
        }
        
        console.log(`[Auth0] User migrated successfully: ${email} (role: ${user.role})`);
        return user;
      }
    }

    // PASO 3: Usuario completamente nuevo - crear
    // Solo crear si tenemos email (sin email no podemos identificar al usuario)
    if (!email) {
      console.error("[Auth0] Cannot create user without email", { sub: auth0UserId });
      throw ForbiddenError("Email required for new user registration");
    }
    
    console.log("[Auth0] Creating new user:", email);
    
    await db.upsertUser({
      openId: auth0UserId,
      name: name || null,
      email: email,
      loginMethod: "google",
      lastSignedIn: new Date(),
    });

    user = await db.getUserByOpenId(auth0UserId);
    
    if (!user) {
      throw ForbiddenError("Failed to create user");
    }

    // Auto-vincular proyectos existentes por email del cliente
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

    return user;
  }
}

export const auth0Service = new Auth0Service();
