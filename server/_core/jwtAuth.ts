import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const JWT_COOKIE_NAME = "jwt_session";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type JWTSessionPayload = {
  userId: number;
  email: string;
  name: string;
};

class JWTAuthService {
  private getJWTSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  /**
   * Create a JWT session token for a user
   */
  async createJWTSessionToken(
    userId: number,
    email: string,
    name: string,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? 30 * 24 * 60 * 60 * 1000; // 30 days
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getJWTSecret();

    return new SignJWT({
      userId,
      email,
      name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * Verify a JWT session token
   */
  async verifyJWTSession(
    token: string | undefined | null
  ): Promise<JWTSessionPayload | null> {
    if (!token) {
      console.warn("[JWT Auth] Missing session token");
      return null;
    }

    try {
      const secretKey = this.getJWTSecret();
      const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"],
      });
      const { userId, email, name } = payload as Record<string, unknown>;

      if (
        typeof userId !== "number" ||
        !isNonEmptyString(email) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[JWT Auth] Session payload missing required fields");
        return null;
      }

      return {
        userId,
        email,
        name,
      };
    } catch (error) {
      console.warn("[JWT Auth] Session verification failed", String(error));
      return null;
    }
  }

  /**
   * Authenticate a request using JWT (cookies o Authorization header)
   */
  async authenticateRequest(req: Request): Promise<User> {
    // Intentar obtener el token de la cookie primero
    const cookies = this.parseCookies(req.headers.cookie);
    let token = cookies.get(JWT_COOKIE_NAME);

    // Si no hay cookie, intentar obtener del header Authorization
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remover 'Bearer '
      }
    }

    console.log("[JWT Auth] Authenticate Request", {
      hasCookieHeader: !!req.headers.cookie,
      hasAuthHeader: !!req.headers.authorization,
      cookiesFound: cookies.size,
      hasSessionCookie: !!cookies.get(JWT_COOKIE_NAME),
      hasAuthToken: !!token,
      tokenLength: token?.length,
      source: cookies.get(JWT_COOKIE_NAME) ? 'cookie' : (req.headers.authorization ? 'header' : 'none'),
    });

    const session = await this.verifyJWTSession(token);

    if (!session) {
      console.error("[JWT Auth] Session verification failed");
      throw ForbiddenError("Invalid JWT session");
    }

    const user = await db.getUserById(session.userId);

    if (!user) {
      throw ForbiddenError("User not found");
    }

    // Update last signed in
    const signedInAt = new Date();
    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const jwtAuthService = new JWTAuthService();
export { JWT_COOKIE_NAME };
