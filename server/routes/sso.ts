/**
 * SSO (Single Sign-On) Routes
 * Permite a aplicaciones externas (como GHP Center) autenticar usuarios
 * y redirigirlos al portal de cliente con una sesión válida.
 * 
 * Flujo:
 * 1. App externa llama POST /api/sso/token con API Key + email del cliente
 * 2. Se genera un token temporal (válido 5 min)
 * 3. App externa redirige al usuario a /api/sso/login?token=xxx
 * 4. El servidor valida el token, crea sesión y redirige al portal
 */
import { Router } from "express";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { users, apiKeys, clientProjectAccess } from "../../drizzle/schema";
import { getDb } from "../db";
import { jwtAuthService, JWT_COOKIE_NAME } from "../_core/jwtAuth";
import { getSessionCookieOptions } from "../_core/cookies";

const ssoRouter = Router();

// Store temporal de tokens SSO (en memoria, expiran en 5 min)
const ssoTokens = new Map<string, { userId: number; email: string; name: string; createdAt: number; redirectTo?: string }>();

// Limpiar tokens expirados cada 5 minutos
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(ssoTokens.entries());
  for (const [token, data] of entries) {
    if (now - data.createdAt > 5 * 60 * 1000) {
      ssoTokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * POST /api/sso/token
 * Genera un token SSO temporal para un usuario
 * Requiere API Key con permiso 'admin' o '*'
 * 
 * Body: { email: string, redirectTo?: string }
 * Response: { token: string, loginUrl: string }
 */
ssoRouter.post("/token", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"] as string || 
                   (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);

    if (!apiKey) {
      return res.status(401).json({ error: "API Key requerida" });
    }

    // Validar API Key
    const dbInst = await getDb();
    if (!dbInst) {
      return res.status(500).json({ error: "Error de base de datos" });
    }

    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const [keyRecord] = await dbInst.select().from(apiKeys).where(
      and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true))
    );

    if (!keyRecord) {
      return res.status(401).json({ error: "API Key inválida" });
    }

    // Verificar permisos (necesita admin, sso o *)
    const permissions = JSON.parse(keyRecord.permissions || "[]");
    if (!permissions.includes("*") && !permissions.includes("admin") && !permissions.includes("sso")) {
      return res.status(403).json({ error: "API Key sin permisos de SSO (requiere 'admin', 'sso' o '*')" });
    }

    // Obtener email del body
    const { email, redirectTo } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email requerido" });
    }

    // Buscar o crear usuario cliente
    let [user] = await dbInst.select().from(users).where(eq(users.email, email));

    if (!user) {
      // Crear usuario cliente automáticamente (ya aprobado porque viene de SSO)
      const result = await dbInst.insert(users).values({
        email: email,
        name: email.split("@")[0],
        role: "client",
        status: "approved",
        loginMethod: "sso",
      });
      const insertId = (result as any)[0]?.insertId || (result as any).insertId;
      [user] = await dbInst.select().from(users).where(eq(users.id, insertId));
    }

    if (!user) {
      return res.status(500).json({ error: "Error al crear usuario" });
    }

    // Verificar que el usuario está aprobado
    if ((user as any).status === "rejected") {
      return res.status(403).json({ error: "Usuario rechazado" });
    }

    // Generar token SSO temporal
    const token = crypto.randomBytes(32).toString("hex");
    ssoTokens.set(token, {
      userId: user.id,
      email: user.email || email,
      name: user.name || email.split("@")[0],
      createdAt: Date.now(),
      redirectTo,
    });

    // Construir la URL de login
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const loginUrl = `${baseUrl}/api/sso/login?token=${token}`;

    return res.json({
      success: true,
      token,
      loginUrl,
      userId: user.id,
      userName: user.name,
    });
  } catch (error: any) {
    console.error("SSO token error:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * GET /api/sso/login?token=xxx
 * Consume el token SSO, crea sesión y redirige al portal
 */
ssoRouter.get("/login", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token requerido" });
    }

    // Validar token
    const tokenData = ssoTokens.get(token);
    if (!tokenData) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // Verificar que no haya expirado (5 min)
    if (Date.now() - tokenData.createdAt > 5 * 60 * 1000) {
      ssoTokens.delete(token);
      return res.status(401).json({ error: "Token expirado" });
    }

    // Consumir token (uso único)
    ssoTokens.delete(token);

    // Obtener usuario
    const dbInst = await getDb();
    if (!dbInst) {
      return res.status(500).json({ error: "Error de base de datos" });
    }

    const [user] = await dbInst.select().from(users).where(eq(users.id, tokenData.userId));
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Actualizar último acceso
    await dbInst.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

    // Crear sesión JWT usando el servicio existente
    const jwtToken = await jwtAuthService.createJWTSessionToken(
      user.id,
      user.email || tokenData.email,
      user.name || tokenData.name
    );
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(JWT_COOKIE_NAME, jwtToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    // Redirigir al portal
    const redirectTo = tokenData.redirectTo || "/portal";
    return res.redirect(redirectTo);
  } catch (error: any) {
    console.error("SSO login error:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * POST /api/sso/validate
 * Valida si un usuario tiene sesión activa (para iframes/embeds)
 * Retorna info básica del usuario si está autenticado
 */
ssoRouter.post("/validate", async (req, res) => {
  try {
    // La sesión se verifica por la cookie JWT
    const jwtCookie = req.cookies?.[JWT_COOKIE_NAME];
    if (!jwtCookie) {
      return res.json({ authenticated: false });
    }

    // Verificar JWT
    const payload = await jwtAuthService.verifyJWTSession(jwtCookie);
    if (!payload) {
      return res.json({ authenticated: false });
    }

    const dbInst = await getDb();
    if (!dbInst) {
      return res.json({ authenticated: false });
    }

    const [user] = await dbInst.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    }).from(users).where(eq(users.id, (payload as any).userId));

    if (!user) {
      return res.json({ authenticated: false });
    }

    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.json({ authenticated: false });
  }
});

export { ssoRouter };
