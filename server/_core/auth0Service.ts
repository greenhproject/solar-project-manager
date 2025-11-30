/**
 * Servicio de autenticación con Auth0
 * 
 * Este servicio valida tokens JWT de Auth0 y gestiona usuarios
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
   * Autenticar una solicitud usando un token de Auth0
   */
  async authenticateRequest(req: Request): Promise<User> {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn("[Auth0] Missing or invalid Authorization header");
      throw ForbiddenError("Missing Auth0 token");
    }

    const token = authHeader.substring(7); // Remover 'Bearer '
    
    console.log("[Auth0] Authenticating request", {
      hasToken: !!token,
      tokenLength: token?.length,
    });

    // Verificar el token con Auth0
    const payload = await this.verifyAuth0Token(token);

    if (!payload) {
      console.error("[Auth0] Token verification failed");
      throw ForbiddenError("Invalid Auth0 token");
    }

    // Extraer información del usuario del token
    const auth0UserId = payload.sub as string; // e.g., "auth0|123456"
    
    // Auth0 puede enviar email y name como custom claims con namespace
    // Intentar leer tanto los claims estándar como los custom claims
    let email = payload.email as string | undefined;
    let name = payload.name as string | undefined;
    
    // Si no están en los claims estándar, buscar en custom claims
    if (!email || !name) {
      // Buscar en todos los claims del payload
      for (const [key, value] of Object.entries(payload)) {
        if (key.includes('email') && typeof value === 'string') {
          email = value;
        }
        if (key.includes('name') && typeof value === 'string') {
          name = value;
        }
      }
    }

    console.log("[Auth0] Token verified", {
      sub: auth0UserId,
      email,
      name,
    });

    // Buscar o crear el usuario en la base de datos
    // Usamos el sub de Auth0 como openId para compatibilidad
    let user = await db.getUserByOpenId(auth0UserId);

    // Si no existe usuario con este sub, pero existe con el email, fusionar
    if (!user && email) {
      const existingUserByEmail = await db.getUserByEmail(email);
      if (existingUserByEmail) {
        console.log("[Auth0] Found existing user with email, merging accounts", {
          existingUserId: existingUserByEmail.id,
          email,
        });
        
        // Actualizar el usuario existente con el openId de Auth0
        const ADMIN_SUB = "google-oauth2|106723310869919984535";
        const role = auth0UserId === ADMIN_SUB ? "admin" : existingUserByEmail.role;
        
        await db.upsertUser({
          openId: auth0UserId,
          name: name || existingUserByEmail.name,
          email: email,
          role: role,
          lastSignedIn: new Date(),
        });
        
        console.log("[Auth0] User accounts merged successfully");
        
        user = await db.getUserByOpenId(auth0UserId);
        
        if (!user) {
          throw ForbiddenError("Failed to merge user accounts");
        }
        
        return user;
      }
    }

    if (!user) {
      console.log("[Auth0] User not found, creating new user");
      
      // Crear nuevo usuario
      // Asignar rol admin al sub específico de greenhproject@gmail.com
      const ADMIN_SUB = "google-oauth2|106723310869919984535";
      const role = auth0UserId === ADMIN_SUB ? "admin" : "engineer";
      
      await db.upsertUser({
        openId: auth0UserId,
        name: name || null,
        email: email || null,
        role: role,
        lastSignedIn: new Date(),
      });
      
      console.log("[Auth0] User created with role:", role);

      user = await db.getUserByOpenId(auth0UserId);
      
      if (!user) {
        throw ForbiddenError("Failed to create user");
      }
    } else {
      // Actualizar última vez que inició sesión
      // Si es el sub de greenhproject@gmail.com, actualizar rol a admin
      const ADMIN_SUB = "google-oauth2|106723310869919984535";
      const role = auth0UserId === ADMIN_SUB ? "admin" : user.role;
      
      await db.upsertUser({
        openId: auth0UserId,
        name: name || user.name,
        email: email || user.email,
        role: role,
        lastSignedIn: new Date(),
      });
      
      if (role === "admin" && user.role !== "admin") {
        console.log("[Auth0] User role updated to admin for sub:", auth0UserId);
      }
      
      // Recargar usuario para obtener el rol actualizado
      user = await db.getUserByOpenId(auth0UserId);
      
      if (!user) {
        throw ForbiddenError("Failed to reload user");
      }
    }

    return user;
  }
}

export const auth0Service = new Auth0Service();
