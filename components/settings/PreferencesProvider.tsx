"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type RufoThemeMode = "system" | "light" | "dark";
export type RufoResolvedTheme = "light" | "dark";
export type RufoLanguage = "zh-CN" | "en" | "ja" | "ko";

type PreferencesContextValue = {
  themeMode: RufoThemeMode;
  resolvedTheme: RufoResolvedTheme;
  language: RufoLanguage;
  setThemeMode: (themeMode: RufoThemeMode) => void;
  setLanguage: (language: RufoLanguage) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
);

const THEME_KEY = "rufo.preferences.theme";
const LANGUAGE_KEY = "rufo.preferences.language";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<RufoThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<RufoResolvedTheme>("dark");
  const [language, setLanguageState] = useState<RufoLanguage>("zh-CN");

  useEffect(() => {
    setThemeModeState(readThemeMode());
    setLanguageState(readLanguage());
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      setResolvedTheme(themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode);
    }

    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.dataset.rufoTheme = resolvedTheme;
    document.documentElement.dataset.rufoThemeMode = themeMode;
    document.documentElement.lang = language;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [language, resolvedTheme, themeMode]);

  function setThemeMode(nextThemeMode: RufoThemeMode) {
    setThemeModeState(nextThemeMode);
    window.localStorage.setItem(THEME_KEY, nextThemeMode);
  }

  function setLanguage(nextLanguage: RufoLanguage) {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  }

  const value = useMemo<PreferencesContextValue>(
    () => ({
      themeMode,
      resolvedTheme,
      language,
      setThemeMode,
      setLanguage
    }),
    [language, resolvedTheme, themeMode]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider.");
  }

  return context;
}

function readThemeMode(): RufoThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const value = window.localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function readLanguage(): RufoLanguage {
  if (typeof window === "undefined") {
    return "zh-CN";
  }

  const value = window.localStorage.getItem(LANGUAGE_KEY);
  return value === "en" || value === "ja" || value === "ko" || value === "zh-CN"
    ? value
    : "zh-CN";
}
