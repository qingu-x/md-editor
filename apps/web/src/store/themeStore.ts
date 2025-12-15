/**
 * 主题状态管理
 * 管理主题选择、自定义主题 CRUD、主题持久化
 */
import { create } from 'zustand';
import { builtInThemes, type CustomTheme } from './themes/builtInThemes';

// localStorage 键名
const CUSTOM_THEMES_KEY = 'wemd-custom-themes';
const SELECTED_THEME_KEY = 'wemd-selected-theme';

// 检查 localStorage 是否可用
const canUseLocalStorage = () =>
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// 从 localStorage 加载自定义主题
const loadCustomThemes = (): CustomTheme[] => {
    if (!canUseLocalStorage()) return [];
    try {
        const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error('加载自定义主题失败:', error);
        return [];
    }
};

// 保存自定义主题到 localStorage
const saveCustomThemes = (themes: CustomTheme[]): void => {
    if (!canUseLocalStorage()) return;
    try {
        localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
    } catch (error) {
        console.error('保存自定义主题失败:', error);
    }
};

// 保存选中主题到 localStorage
const saveSelectedTheme = (themeId: string, themeName: string): void => {
    if (!canUseLocalStorage()) return;
    try {
        localStorage.setItem(SELECTED_THEME_KEY, JSON.stringify({ id: themeId, name: themeName }));
    } catch (error) {
        console.error('保存选中主题失败:', error);
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
        console.error('加载选中主题失败:', error);
        return null;
    }
};

// 初始化选中的主题（验证存在性）
const initialSelectedTheme = (() => {
    const saved = loadSelectedTheme();
    if (!saved) return null;
    const allThemes = [...builtInThemes, ...loadCustomThemes()];
    const exists = allThemes.some((t) => t.id === saved.id);
    return exists ? saved : null;
})();

/**
 * 主题 Store 接口
 */
interface ThemeStore {
    // 当前主题
    themeId: string;
    themeName: string;
    customCSS: string;

    // 自定义主题列表
    customThemes: CustomTheme[];

    // 主题操作
    selectTheme: (themeId: string) => void;
    setCustomCSS: (css: string) => void;
    getThemeCSS: (themeId: string) => string;
    getAllThemes: () => CustomTheme[];

    // 主题 CRUD
    createTheme: (name: string, css?: string) => CustomTheme;
    updateTheme: (id: string, updates: Partial<Pick<CustomTheme, 'name' | 'css'>>) => void;
    deleteTheme: (id: string) => void;
    duplicateTheme: (id: string, newName: string) => CustomTheme;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
    themeId: initialSelectedTheme?.id ?? 'default',
    themeName: initialSelectedTheme?.name ?? '默认主题',
    customCSS: '',
    customThemes: loadCustomThemes(),

    selectTheme: (themeId: string) => {
        const allThemes = get().getAllThemes();
        const theme = allThemes.find((t) => t.id === themeId);
        if (theme) {
            set({
                themeId: theme.id,
                themeName: theme.name,
                customCSS: theme.css,
            });
            saveSelectedTheme(theme.id, theme.name);
        }
    },

    setCustomCSS: (css: string) => set({ customCSS: css }),

    getThemeCSS: (themeId: string) => {
        const state = get();

        // 先查找内置主题
        const builtIn = builtInThemes.find((t) => t.id === themeId);
        if (builtIn) return builtIn.css;

        // 再查找自定义主题
        const custom = state.customThemes.find((t) => t.id === themeId);
        if (custom) return custom.css;

        // 回退到默认主题
        return builtInThemes[0].css;
    },

    getAllThemes: () => {
        const state = get();
        return [...builtInThemes, ...state.customThemes];
    },

    createTheme: (name: string, css?: string) => {
        const state = get();
        const trimmedName = name.trim() || '未命名主题';
        const themeCSS = css || state.customCSS || state.getThemeCSS(state.themeId);

        const newTheme: CustomTheme = {
            id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: trimmedName,
            css: themeCSS,
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const nextCustomThemes = [...state.customThemes, newTheme];
        saveCustomThemes(nextCustomThemes);
        set({ customThemes: nextCustomThemes });

        return newTheme;
    },

    updateTheme: (id: string, updates: Partial<Pick<CustomTheme, 'name' | 'css'>>) => {
        const state = get();
        const themeIndex = state.customThemes.findIndex((t) => t.id === id);

        if (themeIndex === -1) {
            console.warn(`主题 ${id} 未找到或为内置主题`);
            return;
        }

        const updatedTheme: CustomTheme = {
            ...state.customThemes[themeIndex],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        const nextCustomThemes = [
            ...state.customThemes.slice(0, themeIndex),
            updatedTheme,
            ...state.customThemes.slice(themeIndex + 1),
        ];

        saveCustomThemes(nextCustomThemes);
        set({ customThemes: nextCustomThemes });

        // 如果是当前主题，更新名称
        if (state.themeId === id) {
            set({ themeName: updatedTheme.name });
        }
    },

    deleteTheme: (id: string) => {
        const state = get();
        const theme = state.customThemes.find((t) => t.id === id);

        if (!theme) {
            console.warn(`主题 ${id} 未找到或为内置主题`);
            return;
        }

        const nextCustomThemes = state.customThemes.filter((t) => t.id !== id);
        saveCustomThemes(nextCustomThemes);
        set({ customThemes: nextCustomThemes });

        // 如果删除的是当前主题，切换到默认
        if (state.themeId === id) {
            set({
                themeId: 'default',
                themeName: '默认主题',
                customCSS: '',
            });
            saveSelectedTheme('default', '默认主题');
        }
    },

    duplicateTheme: (id: string, newName: string) => {
        const state = get();
        const allThemes = state.getAllThemes();
        const sourceTheme = allThemes.find((t) => t.id === id);

        if (!sourceTheme) {
            throw new Error(`主题 ${id} 未找到`);
        }

        return state.createTheme(newName, sourceTheme.css);
    },
}));

// 导出内置主题供其他模块使用
export { builtInThemes };
export type { CustomTheme };
