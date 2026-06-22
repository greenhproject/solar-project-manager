/**
 * SSO (Single Sign-On) Routes
 * Permite a aplicaciones externas (como GHP Center) autenticar usuarios
 * y redirigirlos al portal de cliente con una sesión válida.
 * 
 * Flujo:
 * 1. App externa llama POST /api/sso/token con API Key + email del cliente
 * 2. Se genera un token temporal (válido 5 min) persistido en BD
 * 3. App externa redirige al usuario a /api/sso/login?token=xxx
 * 4. El servidor valida el token, crea sesión y redirige al portal
 * 
 * Seguridad:
 * - Tokens persistidos en BD (no en memoria) para compatibilidad multi-instancia
 * - Validación de redirectTo contra whitelist para prevenir Open Redirect
 * - Tokens de uso único con TTL de 5 minutos
 * - Rate limiting aplicado a nivel de router
 */
import { Router } from "express";
import crypto from "crypto";
import { eq, and, lt } from "drizzle-orm";
import { users, apiKeys, clientProjectAccess, ssoTokens } from "../../drizzle/schema";
import { getDb } from "../db";
import { jwtAuthService, JWT_COOKIE_NAME } from "../_core/jwtAuth";
import { getSessionCookieOptions } from "../_core/cookies";

const ssoRouter = Router();

/**
 * Whitelist de rutas internas permitidas para redirectTo.
 * Solo se permiten rutas relativas que empiecen con / y pertenezcan a la app.
 * Esto previene Open Redirect attacks donde un atacante podría redirigir
 * a un sitio malicioso.
 */
const ALLOWED_REDIRECT_PREFIXES = [
  "/portal",
  "/dashboard",
  "/projects",
  "/profile",
  "/reminders",
  "/milestones",
  "/documents",
  "/settings",
];

/**
 * Valida que una URL de redirección sea segura.
 * Solo permite rutas relativas internas de la aplicación.
 * Retorna la ruta validada o el fallback "/portal".
 */
function validateRedirectTo(redirectTo: string | undefined | null): string {
  if (!redirectTo || typeof redirectTo !== "string") {
    return "/portal";
  }

  // Trim y normalizar
  const cleaned = redirectTo.trim();

  // Rechazar URLs absolutas (http://, https://, //, javascript:, data:, etc.)
  if (/^(https?:\/\/|\/\/|javascript:|data:|vbscript:|file:)/i.test(cleaned)) {
    console.warn(`[SSO] Redirect bloqueado (URL absoluta): ${cleaned}`);
    return "/portal";
  }

  // Solo permitir rutas que empiecen con /
  if (!cleaned.startsWith("/")) {
    console.warn(`[SSO] Redirect bloqueado (no es ruta relativa): ${cleaned}`);
    return "/portal";
  }

  // Verificar contra whitelist de prefijos
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(prefix => 
    cleaned === prefix || cleaned.startsWith(prefix + "/") || cleaned.startsWith(prefix + "?")
  );

  if (!isAllowed) {
    console.warn(`[SSO] Redirect bloqueado (no está en whitelist): ${cleaned}`);
    return "/portal";
  }

  return cleaned;
}

/**
 * Limpia tokens SSO expirados de la base de datos.
 * Se ejecuta periódicamente para mantener la tabla limpia.
 */
async function cleanupExpiredSsoTokens(): Promise<void> {
  try {
    const dbInst = await getDb();
    if (!dbInst) return;
    
    const now = new Date();
    await dbInst.delete(ssoTokens).where(lt(ssoTokens.expiresAt, now));
  } catch (error) {
    console.error("[SSO] Error limpiando tokens expirados:", error);
  }
}

// Limpiar tokens expirados cada 10 minutos
setInterval(cleanupExpiredSsoTokens, 10 * 60 * 1000);

/**
 * POST /api/sso/token
 * Genera un token SSO temporal para un usuario
 * Requiere API Key con permiso 'admin', 'sso' o '*'
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

    // Validar redirectTo contra whitelist
    const safeRedirectTo = validateRedirectTo(redirectTo);

    // Generar token SSO y persistir en BD
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await dbInst.insert(ssoTokens).values({
      token,
      userId: user.id,
      email: user.email || email,
      name: user.name || email.split("@")[0],
      redirectTo: safeRedirectTo,
      expiresAt,
      used: false,
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

    const dbInst = await getDb();
    if (!dbInst) {
      return res.status(500).json({ error: "Error de base de datos" });
    }

    // Buscar token en BD (no usado y no expirado)
    const now = new Date();
    const [tokenRecord] = await dbInst.select().from(ssoTokens).where(
      and(
        eq(ssoTokens.token, token),
        eq(ssoTokens.used, false)
      )
    );

    if (!tokenRecord) {
      return res.status(401).json({ error: "Token inválido o ya fue utilizado" });
    }

    // Verificar expiración
    if (tokenRecord.expiresAt < now) {
      // Marcar como usado para limpieza
      await dbInst.update(ssoTokens).set({ used: true }).where(eq(ssoTokens.id, tokenRecord.id));
      return res.status(401).json({ error: "Token expirado" });
    }

    // Consumir token (uso único) - marcar como usado
    await dbInst.update(ssoTokens).set({ used: true }).where(eq(ssoTokens.id, tokenRecord.id));

    // Obtener usuario
    const [user] = await dbInst.select().from(users).where(eq(users.id, tokenRecord.userId));
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Actualizar último acceso
    await dbInst.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

    // Crear sesión JWT usando el servicio existente
    const jwtToken = await jwtAuthService.createJWTSessionToken(
      user.id,
      user.email || tokenRecord.email,
      user.name || tokenRecord.name
    );
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(JWT_COOKIE_NAME, jwtToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    // Redirigir según el rol del usuario si no hay redirectTo explícito
    // Esto permite que admins/engineers lleguen a su dashboard correcto
    let redirectTo = tokenRecord.redirectTo;
    if (!redirectTo || redirectTo === "/portal") {
      // Si no hay redirectTo o es el default /portal, usar redirección por rol
      redirectTo = getRedirectByRole(user.role as string);
    }
    console.log(`[SSO Login] Redirigiendo ${user.email} (${user.role}) → ${redirectTo}`);
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

/**
 * GET /api/sso/callback?token=xxx
 * Endpoint receptor de SSO desde el Hub GHP.
 * Recibe un JWT firmado con CRM_SSO_SECRET directamente del Hub.
 * 
 * Flujo:
 * 1. El Hub genera un JWT firmado con CRM_SSO_SECRET conteniendo: sub, email, name, role
 * 2. El Hub redirige al usuario a https://spm.ghp.center/api/sso/callback?token=JWT
 * 3. SPM verifica la firma del JWT con CRM_SSO_SECRET
 * 4. SPM busca o crea el usuario basado en el email
 * 5. SPM crea sesión local (cookie) y redirige al dashboard
 */
ssoRouter.get("/callback", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token JWT requerido" });
    }

    // Verificar que tenemos el secret configurado (prioridad: BD > env)
    let ssoSecret = process.env.CRM_SSO_SECRET || process.env.SSO_SECRET || "";
    
    // Intentar leer desde app_settings en BD como fuente primaria
    try {
      const dbInstForSecret = await getDb();
      if (dbInstForSecret) {
        const { appSettings } = await import("../../drizzle/schema");
        const [secretRow] = await dbInstForSecret
          .select()
          .from(appSettings)
          .where(eq(appSettings.settingKey, "crm_sso_secret"))
          .limit(1);
        if (secretRow?.settingValue) {
          ssoSecret = secretRow.settingValue;
        }
      }
    } catch (e) {
      // Si falla leer de BD, usar env variable
    }
    
    if (!ssoSecret) {
      console.error("[SSO Callback] CRM_SSO_SECRET no configurado ni en BD ni en env");
      return res.status(500).json({ error: "SSO no configurado en el servidor" });
    }

    // Verificar y decodificar el JWT del Hub
    const { jwtVerify } = await import("jose");
    const secretKey = new TextEncoder().encode(ssoSecret);
    
    let payload: any;
    try {
      const result = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"],
      });
      payload = result.payload;
    } catch (jwtError: any) {
      console.error("[SSO Callback] JWT inválido:", jwtError.message);
      return res.status(401).json({ error: "Token JWT inválido o expirado" });
    }

    // Extraer datos del usuario del token
    // SIMPLIFICADO: Solo usamos email y name. NO tocamos roles.
    // Los roles se gestionan exclusivamente desde Gestión de Usuarios (UI admin).
    const email = payload.email || payload.sub;
    const name = payload.name || payload.nombre || email?.split("@")[0] || "Usuario";
    console.log(`[SSO Callback] Email: ${email}, Name: ${name}`);

    if (!email) {
      return res.status(400).json({ error: "Token no contiene email del usuario" });
    }

    // Buscar o crear usuario en SPM
    const dbInst = await getDb();
    if (!dbInst) {
      return res.status(500).json({ error: "Error de base de datos" });
    }

    let [user] = await dbInst.select().from(users).where(eq(users.email, email));

    if (!user) {
      // Crear usuario nuevo con rol 'client' por defecto
      // El admin lo cambiará desde Gestión de Usuarios si necesita otro rol
      const result = await dbInst.insert(users).values({
        email,
        name,
        role: "client",
        status: "approved",
        loginMethod: "sso",
      });
      const insertId = (result as any)[0]?.insertId || (result as any).insertId;
      [user] = await dbInst.select().from(users).where(eq(users.id, insertId));
      console.log(`[SSO Callback] Usuario creado: ${email} con rol client (default)`);
    } else {
      // Usuario existente: solo actualizar lastSignedIn y status
      // NUNCA tocar el rol - se gestiona desde UI admin
      const updateData: Record<string, any> = {
        lastSignedIn: new Date(),
        status: "approved",
      };
      
      // Solo setear loginMethod a 'sso' si no tiene uno previo o ya era 'sso'
      if (!user.loginMethod || user.loginMethod === 'sso') {
        updateData.loginMethod = "sso";
      }
      
      // Actualizar nombre si viene del Hub y el usuario no tiene nombre
      if (name && name !== email.split("@")[0] && (!user.name || !user.name.trim())) {
        updateData.name = name;
      }
      
      await dbInst.update(users).set(updateData).where(eq(users.id, user.id));
      
      // Re-leer el usuario actualizado
      [user] = await dbInst.select().from(users).where(eq(users.id, user.id));
      console.log(`[SSO Callback] Login exitoso: ${email} (rol: ${user.role}) - rol NO modificado`);
    }

    if (!user) {
      return res.status(500).json({ error: "Error al obtener/crear usuario" });
    }

    // ÚNICA EXCEPCIÓN: greenhproject@gmail.com siempre es admin (safety net)
    if (email === "greenhproject@gmail.com" && user.role !== "admin") {
      await dbInst.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
      user = { ...user, role: "admin" };
      console.log(`[SSO Callback] Safety net: forced admin for master user ${email}`);
    }

    // Verificar que el usuario no esté rechazado
    if ((user as any).status === "rejected") {
      return res.status(403).json({ error: "Usuario rechazado en esta aplicación" });
    }

    // Crear sesión JWT local de SPM
    const jwtToken = await jwtAuthService.createJWTSessionToken(
      user.id,
      user.email || email,
      user.name || name
    );
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(JWT_COOKIE_NAME, jwtToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    // Redirigir según el rol
    const redirectPath = getRedirectByRole(user.role);
    console.log(`[SSO Callback] Login exitoso: ${email} (${user.role}) → ${redirectPath}`);
    return res.redirect(redirectPath);
  } catch (error: any) {
    console.error("[SSO Callback] Error:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});


/**
 * Determina la ruta de redirección según el rol del usuario
 */
function getRedirectByRole(role: string): string {
  switch (role) {
    case "admin":
      return "/dashboard";
    case "engineer":
    case "ingeniero_tramites":
      return "/projects";
    case "client":
      return "/portal";
    default:
      return "/dashboard";
  }
}

export { ssoRouter };
