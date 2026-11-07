"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const THEME_STORAGE_KEY = "gechhub-theme";
const THEME_CHANGE_EVENT = "gechhub-theme-change";
const ThemeContext = createContext<{ isDark: boolean; setIsDark: (value: boolean) => void } | null>(null);

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
}

function getThemeSnapshot() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) !== "light";
}

function getServerThemeSnapshot() {
  return true;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  function updateTheme(nextIsDark: boolean) {
    document.documentElement.classList.toggle("dark", nextIsDark);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ThemeToggle must be used inside ThemeProvider");

  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <Sun aria-hidden="true" className="size-4 text-muted-foreground" />
      <Switch
        aria-label="Toggle dark mode"
        checked={theme.isDark}
        onCheckedChange={theme.setIsDark}
      />
      <Moon aria-hidden="true" className="size-4 text-muted-foreground" />
    </span>
  );
}
