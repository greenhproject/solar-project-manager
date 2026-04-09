import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Detectar preferencia del sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateResolvedTheme = () => {
      let resolved: ResolvedTheme;

      if (theme === "system") {
        resolved = mediaQuery.matches ? "dark" : "light";
      } else {
        resolved = theme as ResolvedTheme;
      }

      setResolvedTheme(resolved);

      // Aplicar clase al documento
      const root = document.documentElement;
      if (resolved === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    updateResolvedTheme();

    // Escuchar cambios en la preferencia del sistema
    mediaQuery.addEventListener("change", updateResolvedTheme);
    return () => mediaQuery.removeEventListener("change", updateResolvedTheme);
  }, [theme]);

  // Sincronizar con el tema guardado en localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('user-theme') as Theme | null;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('user-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
