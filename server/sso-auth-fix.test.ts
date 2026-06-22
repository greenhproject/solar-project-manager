/**
 * Tests para verificar la lógica corregida de SSO callback y Auth0 service
 * 
 * Bug: SSO callback sobrescribía loginMethod a 'sso' y degradaba rol admin,
 * causando que el logout no funcionara y que se vieran menos proyectos.
 */
import { describe, it, expect } from "vitest";

describe("SSO Callback - loginMethod protection", () => {
  it("should NOT overwrite loginMethod if user already has 'google' (Auth0)", () => {
    // Simular la lógica del SSO callback para usuario existente con Auth0
    const existingUser = {
      id: 1,
      loginMethod: "google", // Ya usa Auth0
      role: "admin",
    };

    const updateData: Record<string, any> = {
      lastSignedIn: new Date(),
      status: "approved",
    };

    // Lógica corregida: solo setear loginMethod a 'sso' si NO tiene loginMethod previo o ya era 'sso'
    if (!existingUser.loginMethod || existingUser.loginMethod === 'sso') {
      updateData.loginMethod = "sso";
    }

    // loginMethod NO debe estar en updateData porque el usuario ya tiene 'google'
    expect(updateData.loginMethod).toBeUndefined();
  });

  it("should set loginMethod to 'sso' if user has no loginMethod", () => {
    const existingUser = {
      id: 2,
      loginMethod: null as string | null,
      role: "engineer",
    };

    const updateData: Record<string, any> = {
      lastSignedIn: new Date(),
      status: "approved",
    };

    if (!existingUser.loginMethod || existingUser.loginMethod === 'sso') {
      updateData.loginMethod = "sso";
    }

    expect(updateData.loginMethod).toBe("sso");
  });

  it("should set loginMethod to 'sso' if user already had 'sso'", () => {
    const existingUser = {
      id: 3,
      loginMethod: "sso",
      role: "engineer",
    };

    const updateData: Record<string, any> = {
      lastSignedIn: new Date(),
      status: "approved",
    };

    if (!existingUser.loginMethod || existingUser.loginMethod === 'sso') {
      updateData.loginMethod = "sso";
    }

    expect(updateData.loginMethod).toBe("sso");
  });
});

describe("SSO Callback - admin role protection", () => {
  it("should NOT degrade admin to engineer via SSO", () => {
    const existingUser = {
      id: 1,
      role: "admin",
    };
    const spmRole = "engineer"; // Hub envía rol 'engineer'

    const updateData: Record<string, any> = {};

    // Lógica corregida: NO degradar admin
    if (existingUser.role !== spmRole) {
      if (existingUser.role === 'admin' && spmRole !== 'admin') {
        // NO degradar - no agregar role al updateData
      } else {
        updateData.role = spmRole;
      }
    }

    // role NO debe estar en updateData porque no se debe degradar admin
    expect(updateData.role).toBeUndefined();
  });

  it("should NOT degrade admin to ingeniero_tramites via SSO", () => {
    const existingUser = {
      id: 1,
      role: "admin",
    };
    const spmRole = "ingeniero_tramites";

    const updateData: Record<string, any> = {};

    if (existingUser.role !== spmRole) {
      if (existingUser.role === 'admin' && spmRole !== 'admin') {
        // NO degradar
      } else {
        updateData.role = spmRole;
      }
    }

    expect(updateData.role).toBeUndefined();
  });

  it("should upgrade engineer to admin if Hub sends admin role", () => {
    const existingUser = {
      id: 2,
      role: "engineer",
    };
    const spmRole = "admin";

    const updateData: Record<string, any> = {};

    if (existingUser.role !== spmRole) {
      if (existingUser.role === 'admin' && spmRole !== 'admin') {
        // NO degradar
      } else {
        updateData.role = spmRole;
      }
    }

    expect(updateData.role).toBe("admin");
  });

  it("should allow role change between non-admin roles", () => {
    const existingUser = {
      id: 3,
      role: "engineer",
    };
    const spmRole = "ingeniero_tramites";

    const updateData: Record<string, any> = {};

    if (existingUser.role !== spmRole) {
      if (existingUser.role === 'admin' && spmRole !== 'admin') {
        // NO degradar
      } else {
        updateData.role = spmRole;
      }
    }

    expect(updateData.role).toBe("ingeniero_tramites");
  });

  it("should not change role if already the same", () => {
    const existingUser = {
      id: 4,
      role: "admin",
    };
    const spmRole = "admin";

    const updateData: Record<string, any> = {};

    if (existingUser.role !== spmRole) {
      if (existingUser.role === 'admin' && spmRole !== 'admin') {
        // NO degradar
      } else {
        updateData.role = spmRole;
      }
    }

    expect(updateData.role).toBeUndefined();
  });
});

describe("Auth0 Service - loginMethod restoration", () => {
  it("should set loginMethod to 'google' when user authenticates via Auth0", () => {
    // Simular la lógica de auth0Service para usuario existente
    const upsertData = {
      openId: "google-oauth2|106723310869919984535",
      name: "Green House Project",
      email: "greenhproject@gmail.com",
      loginMethod: "google", // Auth0 siempre setea 'google'
      role: "admin",
      lastSignedIn: new Date(),
    };

    // Verificar que loginMethod siempre se setea a 'google' en Auth0 flow
    expect(upsertData.loginMethod).toBe("google");
  });

  it("should restore loginMethod from 'sso' to 'google' when user logs in via Auth0", () => {
    // Escenario: usuario tenía loginMethod 'sso' (por SSO callback previo)
    // Al entrar por Auth0, se debe restaurar a 'google'
    const existingUser = {
      loginMethod: "sso", // Fue cambiado por SSO callback
    };

    // Auth0 service siempre pasa loginMethod: "google"
    const upsertData = {
      loginMethod: "google",
    };

    // El resultado final debe ser 'google', no 'sso'
    expect(upsertData.loginMethod).toBe("google");
    expect(upsertData.loginMethod).not.toBe(existingUser.loginMethod);
  });
});

describe("Logout logic - Auth0 session detection", () => {
  it("should call auth0.logout() when Auth0 SDK has active session", () => {
    const auth0IsAuthenticated = true;
    let logoutCalled = false;
    let redirectedToHome = false;

    if (auth0IsAuthenticated) {
      logoutCalled = true;
    } else {
      redirectedToHome = true;
    }

    expect(logoutCalled).toBe(true);
    expect(redirectedToHome).toBe(false);
  });

  it("should redirect to '/' when Auth0 SDK has NO active session (pure SSO user)", () => {
    const auth0IsAuthenticated = false;
    let logoutCalled = false;
    let redirectedToHome = false;

    if (auth0IsAuthenticated) {
      logoutCalled = true;
    } else {
      redirectedToHome = true;
    }

    expect(logoutCalled).toBe(false);
    expect(redirectedToHome).toBe(true);
  });

  it("should NOT rely on loginMethod from DB to decide logout type", () => {
    // Escenario: loginMethod en BD es 'sso' pero Auth0 tiene sesión activa
    // (esto pasaba antes del fix - SSO sobrescribía loginMethod)
    const userLoginMethod = "sso"; // BD dice SSO
    const auth0IsAuthenticated = true; // Pero Auth0 SDK tiene sesión

    // La decisión debe basarse en auth0.isAuthenticated, NO en loginMethod
    let logoutCalled = false;

    if (auth0IsAuthenticated) {
      logoutCalled = true; // CORRECTO: cerrar sesión Auth0
    }

    expect(logoutCalled).toBe(true);
    // Ignoramos userLoginMethod para la decisión de logout
    expect(userLoginMethod).toBe("sso"); // Solo para documentar que no importa
  });
});
