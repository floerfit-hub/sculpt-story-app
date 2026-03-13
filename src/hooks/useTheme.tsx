import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", setTheme: () => {} });

const STORAGE_KEY = "fittrack-theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "midnight") return saved;
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "midnight");
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "midnight") {
      root.classList.add("dark", "midnight");
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
