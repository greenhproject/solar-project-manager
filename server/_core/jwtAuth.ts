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
    cookieValue: string | undefined | null
  ): Promise<JWTSessionPayload | null> {
    if (!cookieValue) {
      console.warn("[JWT Auth] Missing session cookie");
      return null;
    }

    try {
      const secretKey = this.getJWTSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
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
   * Authenticate a request using JWT
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(JWT_COOKIE_NAME);

    console.log("[JWT Auth] Authenticate Request", {
      hasCookieHeader: !!req.headers.cookie,
      cookieHeader: req.headers.cookie?.substring(0, 100),
      cookiesFound: cookies.size,
      hasSessionCookie: !!sessionCookie,
      sessionCookieLength: sessionCookie?.length,
    });

    const session = await this.verifyJWTSession(sessionCookie);

    if (!session) {
      console.error("[JWT Auth] Session verification failed");
      throw ForbiddenError("Invalid JWT session cookie");
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
