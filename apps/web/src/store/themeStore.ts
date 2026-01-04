/**
 * 主题状态管理
 * 管理主题选择、自定义主题 CRUD、主题持久化
 */
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import {
  builtInThemes,
} from "./themes/builtInThemes";
import type { CustomTheme, DesignerVariables } from "../types/theme";
import { convertCssToWeChatDarkMode } from "@wemd/core";
import { generateCSS } from "../components/Theme/ThemeDesigner/generateCSS";

// 深色转换缓存，避免重复转换同一段 CSS
const darkCssCache = new Map<string, string>();
const DARK_MARK = "/* wemd-wechat-dark-converted */";

const hashCss = (css: string): string => {
  let hash = 0;
  for (let i = 0; i < css.length; i++) {
    hash = (hash << 5) - hash + css.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
};

const buildDarkCacheKey = (themeId: string, css: string) =>
  `${themeId}:${hashCss(css)}`;

// localStorage 键名
const CUSTOM_THEMES_KEY = "wemd-custom-themes";
const SELECTED_THEME_KEY = "wemd-selected-theme";

// 检查 localStorage 是否可用
const canUseLocalStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

// 从 localStorage 加载自定义主题
const loadCustomThemes = (): CustomTheme[] => {
  if (!canUseLocalStorage()) return [];
  try {
    const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!stored) return [];
    const themes = JSON.parse(stored) as CustomTheme[];
    return themes.map((t) => ({
      ...t,
      editorMode: t.editorMode || (t.designerVariables ? "visual" : "css"),
    }));
  } catch (error) {
    console.error("加载自定义主题失败:", error);
    return [];
  }
};

// 从 localStorage 加载选中主题
const loadSelectedTheme = (): { id: string; name: string } | null => {
  if (!canUseLocalStorage()) return null;
  try {
    const stored = localStorage.getItem(SELECTED_THEME_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("加载选中主题失败:", error);
    return null;
  }
};

export const useThemeStore = defineStore('theme', () => {
  const customThemes = ref<CustomTheme[]>(loadCustomThemes());
  
  const savedSelected = loadSelectedTheme();
  const initialTheme = (() => {
    if (savedSelected) {
      const found = [...builtInThemes, ...customThemes.value].find(
        (t) => t.id === savedSelected.id
      );
      if (found) return found;
    }
    return builtInThemes[0];
  })();

  const selectedThemeId = ref(initialTheme.id);
  const selectedThemeName = ref(initialTheme.name);
  const customCSS = ref(initialTheme.css);
  const designerVariables = ref<DesignerVariables | undefined>(initialTheme.designerVariables);

  // 计算属性
  const allThemes = computed(() => [...builtInThemes, ...customThemes.value]);
  
  const currentTheme = computed(() => 
    allThemes.value.find(t => t.id === selectedThemeId.value) || builtInThemes[0]
  );

  const isBuiltIn = computed(() => 
    builtInThemes.some(t => t.id === selectedThemeId.value)
  );

  // 持久化
  watch(customThemes, (newThemes) => {
    if (canUseLocalStorage()) {
      localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(newThemes));
    }
  }, { deep: true });

  watch([selectedThemeId, selectedThemeName], ([newId, newName]) => {
    if (canUseLocalStorage()) {
      localStorage.setItem(SELECTED_THEME_KEY, JSON.stringify({ id: newId, name: newName }));
    }
  });

  // 方法
  function setTheme(themeId: string) {
    const theme = allThemes.value.find((t) => t.id === themeId);
    if (theme) {
      selectedThemeId.value = theme.id;
      selectedThemeName.value = theme.name;
      customCSS.value = theme.css;
      designerVariables.value = theme.designerVariables;
    }
  }

  function addCustomTheme(theme: CustomTheme) {
    customThemes.value.push(theme);
  }

  function updateCustomTheme(id: string, updates: Partial<CustomTheme>) {
    const index = customThemes.value.findIndex((t: CustomTheme) => t.id === id);
    if (index !== -1) {
      customThemes.value[index] = { ...customThemes.value[index], ...updates };
      if (selectedThemeId.value === id) {
        if (updates.css !== undefined) customCSS.value = updates.css;
        if (updates.name !== undefined) selectedThemeName.value = updates.name;
        if (updates.designerVariables !== undefined) designerVariables.value = updates.designerVariables;
      }
    }
  }

  function deleteCustomTheme(id: string) {
    customThemes.value = customThemes.value.filter((t: CustomTheme) => t.id !== id);
    if (selectedThemeId.value === id) {
      setTheme(builtInThemes[0].id);
    }
  }

  function getWechatDarkCss(css: string): string {
    if (css.includes(DARK_MARK)) return css;
    const cacheKey = buildDarkCacheKey(selectedThemeId.value, css);
    if (darkCssCache.has(cacheKey)) return darkCssCache.get(cacheKey)!;

    const darkCss = convertCssToWeChatDarkMode(css);
    const result = `${css}\n${DARK_MARK}\n${darkCss}`;
    darkCssCache.set(cacheKey, result);
    return result;
  }

  function getThemeCSS(themeId: string, isDarkMode: boolean) {
    const theme = allThemes.value.find((t) => t.id === themeId) || currentTheme.value;
    if (isDarkMode) {
      return getWechatDarkCss(theme.css);
    }
    return theme.css;
  }

  function selectTheme(themeId: string) {
    setTheme(themeId);
  }

  function setCustomCSS(css: string) {
    customCSS.value = css;
  }

  function duplicateTheme(id: string, newName: string) {
    const theme = allThemes.value.find((t) => t.id === id);
    if (!theme) throw new Error(`主题 ${id} 未找到`);

    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: newName,
      css: theme.css,
      editorMode: theme.editorMode || "css",
      designerVariables: theme.designerVariables,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addCustomTheme(newTheme);
    return newTheme;
  }

  function exportTheme(id: string) {
    const theme = allThemes.value.find((t) => t.id === id);
    if (!theme || theme.editorMode !== "visual" || !theme.designerVariables) {
      console.warn("只能导出可视化编辑的主题");
      return;
    }

    const exportData = {
      version: 1,
      name: theme.name,
      editorMode: "visual",
      designerVariables: theme.designerVariables,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${theme.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importTheme(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 验证必要字段
      if (
        typeof data.version !== "number" ||
        typeof data.name !== "string" ||
        !data.designerVariables
      ) {
        console.error("无效的主题文件格式：缺少必要字段");
        return false;
      }

      // 检查重名并添加后缀
      const existingNames = allThemes.value.map((t) => t.name);
      let finalName = data.name;
      if (existingNames.includes(finalName)) {
        let suffix = 1;
        while (existingNames.includes(`${data.name} (${suffix})`)) {
          suffix++;
        }
        finalName = `${data.name} (${suffix})`;
      }

      const css = generateCSS(data.designerVariables);
      const newTheme: CustomTheme = {
        id: `custom-${Date.now()}`,
        name: finalName,
        css,
        editorMode: "visual",
        designerVariables: data.designerVariables,
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addCustomTheme(newTheme);
      return true;
    } catch (error) {
      console.error("导入主题失败:", error);
      return false;
    }
  }

  return {
    customThemes,
    selectedThemeId,
    themeId: selectedThemeId, // 别名以兼容部分组件
    selectedThemeName,
    themeName: selectedThemeName, // 别名
    customCSS,
    designerVariables,
    allThemes,
    currentTheme,
    isBuiltIn,
    setTheme,
    selectTheme,
    setCustomCSS,
    addCustomTheme,
    updateTheme: updateCustomTheme,
    deleteTheme: deleteCustomTheme,
    duplicateTheme,
    exportTheme,
    importTheme,
    getThemeCSS,
    getWechatDarkCss,
    createTheme: (name: string, editorMode: string, css: string, vars?: DesignerVariables) => {
      const newTheme: CustomTheme = {
        id: `custom-${Date.now()}`,
        name,
        css,
        editorMode: editorMode as any,
        designerVariables: vars,
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addCustomTheme(newTheme);
      return newTheme;
    },
  };
});
