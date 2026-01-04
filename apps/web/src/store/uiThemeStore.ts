import { defineStore } from 'pinia';
import { ref } from 'vue';

export type UITheme = "default" | "dark";

const THEME_STORAGE_KEY = "wemd-ui-theme";

const FAVICON_MAP: Record<UITheme, string> = {
  default: "favicon-dark.svg",
  dark: "favicon-dark.svg",
};

const resolveAssetHref = (filename: string) => {
  if (typeof document === "undefined") return filename;
  return new URL(filename, document.baseURI).toString();
};

const applyThemeSideEffects = (theme: UITheme) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-ui-theme", theme);
  const faviconEl = document.querySelector<HTMLLinkElement>(
    "link[rel='icon'], link[rel='shortcut icon']",
  );
  if (faviconEl) {
    const file = FAVICON_MAP[theme] ?? FAVICON_MAP.default;
    faviconEl.href = resolveAssetHref(file);
  }
};

const hydrateThemeFromStorage = (): UITheme => {
  if (typeof window === "undefined") return "default";
  try {
    const stored = window.localStorage?.getItem(THEME_STORAGE_KEY);
    // 兼容旧值 structuralism 迁移到 dark
    if (stored === "structuralism") {
      applyThemeSideEffects("dark");
      return "dark";
    }
    if (stored === "default" || stored === "dark") {
      applyThemeSideEffects(stored as UITheme);
      return stored as UITheme;
    }
  } catch {
    /* ignore hydration errors */
  }
  applyThemeSideEffects("default");
  return "default";
};

export const useUIThemeStore = defineStore('uiTheme', () => {
  const theme = ref<UITheme>(hydrateThemeFromStorage());

  function setTheme(newTheme: UITheme) {
    theme.value = newTheme;
    applyThemeSideEffects(newTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  }

  return {
    theme,
    setTheme,
  };
});
