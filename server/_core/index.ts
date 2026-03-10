import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function runAutoMigrations() {
  try {
    const { drizzle } = await import("drizzle-orm/mysql2");
    const mysql = await import("mysql2/promise");
    const pool = mysql.createPool(process.env.DATABASE_URL!);
    const conn = await pool.getConnection();
    
    // Create email_config table if not exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS email_config (
        id int AUTO_INCREMENT PRIMARY KEY,
        provider varchar(20) NOT NULL DEFAULT 'resend',
        apiKey text,
        smtpHost varchar(255),
        smtpPort int DEFAULT 587,
        smtpUser varchar(255),
        smtpPassword text,
        smtpSecure boolean DEFAULT true,
        fromEmail varchar(255) NOT NULL DEFAULT 'admin@greenhproject.com',
        fromName varchar(255) NOT NULL DEFAULT 'Solar Project Manager',
        enableEmailNotifications boolean DEFAULT true,
        sendCopyToAdmin boolean DEFAULT true,
        adminEmail varchar(255),
        isActive boolean DEFAULT false,
        lastTestedAt timestamp NULL,
        updatedBy int,
        createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    conn.release();
    await pool.end();
    console.log("[AutoMigration] email_config table verified");
  } catch (error) {
    console.warn("[AutoMigration] Warning:", (error as Error).message);
  }
}

async function startServer() {
  // Run auto-migrations before starting the server
  await runAutoMigrations();

  const app = express();
  const server = createServer(app);

  // Trust proxy - Required for Railway and other reverse proxies
  // This allows Express to correctly detect HTTPS and set secure cookies
  app.set('trust proxy', 1);

  // Configure cookie parser
  app.use(cookieParser());

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // OpenSolar webhook endpoint
  const { registerWebhookRoutes } = await import("../webhookHandler");
  registerWebhookRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
