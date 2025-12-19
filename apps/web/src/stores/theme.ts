/**
 * 主题状态管理
 * 管理主题选择、自定义主题 CRUD、主题持久化
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { builtInThemes, type CustomTheme } from '../store/themes/builtInThemes'
import { convertCssToWeChatDarkMode } from '@wemd/core'

// 深色转换缓存，避免重复转换同一段 CSS
const darkCssCache = new Map<string, string>()
const DARK_MARK = '/* wemd-wechat-dark-converted */'

const hashCss = (css: string): string => {
  let hash = 0
  for (let i = 0; i < css.length; i++) {
    hash = (hash << 5) - hash + css.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(16)
}

const buildDarkCacheKey = (themeId: string, css: string) => `${themeId}:${hashCss(css)}`
const clearDarkCssCache = () => darkCssCache.clear()

// localStorage 键名
const CUSTOM_THEMES_KEY = 'wemd-custom-themes'
const SELECTED_THEME_KEY = 'wemd-selected-theme'

// 检查 localStorage 是否可用
const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

// 从 localStorage 加载自定义主题
const loadCustomThemes = (): CustomTheme[] => {
  if (!canUseLocalStorage()) return []
  try {
    const stored = localStorage.getItem(CUSTOM_THEMES_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('加载自定义主题失败:', error)
    return []
  }
}

// 保存自定义主题到 localStorage
const saveCustomThemes = (themes: CustomTheme[]): void => {
  if (!canUseLocalStorage()) return
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
  } catch (error) {
    console.error('保存自定义主题失败:', error)
  }
}

// 保存选中主题到 localStorage
const saveSelectedTheme = (themeId: string, themeName: string): void => {
  if (!canUseLocalStorage()) return
  try {
    localStorage.setItem(SELECTED_THEME_KEY, JSON.stringify({ id: themeId, name: themeName }))
  } catch (error) {
    console.error('保存选中主题失败:', error)
  }
}

// 从 localStorage 加载选中主题
const loadSelectedTheme = (): { id: string; name: string } | null => {
  if (!canUseLocalStorage()) return null
  try {
    const stored = localStorage.getItem(SELECTED_THEME_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('加载选中主题失败:', error)
    return null
  }
}

// 初始化选中的主题（验证存在性）
const initialSelectedTheme = (() => {
  const saved = loadSelectedTheme()
  if (!saved) return null
  const allThemes = [...builtInThemes, ...loadCustomThemes()]
  const exists = allThemes.some((t) => t.id === saved.id)
  return exists ? saved : null
})()

export const useThemeStore = defineStore('theme', () => {
  // 当前主题
  const themeId = ref(initialSelectedTheme?.id ?? 'default')
  const themeName = ref(initialSelectedTheme?.name ?? '默认主题')
  const customCSS = ref('')

  // 自定义主题列表
  const customThemes = ref<CustomTheme[]>(loadCustomThemes())

  // 获取所有主题（内置 + 自定义）
  function getAllThemes(): CustomTheme[] {
    return [...builtInThemes, ...customThemes.value]
  }

  function selectTheme(id: string) {
    const allThemes = getAllThemes()
    const theme = allThemes.find((t) => t.id === id)
    if (theme) {
      clearDarkCssCache()
      themeId.value = theme.id
      themeName.value = theme.name
      customCSS.value = theme.css
      saveSelectedTheme(theme.id, theme.name)
    }
  }

  function setCustomCSS(css: string) {
    clearDarkCssCache()
    customCSS.value = css
  }

  function getThemeCSS(id: string, darkMode?: boolean): string {
    // 先查找内置主题
    const builtIn = builtInThemes.find((t) => t.id === id)
    let css = builtIn ? builtIn.css : ''

    // 再查找自定义主题
    if (!css) {
      const custom = customThemes.value.find((t) => t.id === id)
      css = custom ? custom.css : builtInThemes[0].css
    }

    // 深色模式下：使用微信颜色转换算法
    if (darkMode) {
      const cacheKey = buildDarkCacheKey(id, css)
      if (darkCssCache.has(cacheKey)) {
        return darkCssCache.get(cacheKey) as string
      }
      const converted = css.includes(DARK_MARK) ? css : convertCssToWeChatDarkMode(css)
      darkCssCache.set(cacheKey, converted)
      return converted
    }

    return css
  }

  function createTheme(name: string, css?: string): CustomTheme {
    const trimmedName = name.trim() || '未命名主题'
    const themeCSS = css || customCSS.value || getThemeCSS(themeId.value)

    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: trimmedName,
      css: themeCSS,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    customThemes.value = [...customThemes.value, newTheme]
    saveCustomThemes(customThemes.value)
    clearDarkCssCache()

    return newTheme
  }

  function updateTheme(id: string, updates: Partial<Pick<CustomTheme, 'name' | 'css'>>) {
    const themeIndex = customThemes.value.findIndex((t) => t.id === id)

    if (themeIndex === -1) {
      console.warn(`主题 ${id} 未找到或为内置主题`)
      return
    }

    const updatedTheme: CustomTheme = {
      ...customThemes.value[themeIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    customThemes.value = [
      ...customThemes.value.slice(0, themeIndex),
      updatedTheme,
      ...customThemes.value.slice(themeIndex + 1),
    ]

    saveCustomThemes(customThemes.value)
    clearDarkCssCache()

    // 如果是当前主题，更新名称和 CSS
    if (themeId.value === id) {
      themeName.value = updatedTheme.name
      if (updates.css !== undefined) {
        customCSS.value = updates.css
      }
    }
  }

  function deleteTheme(id: string) {
    const theme = customThemes.value.find((t) => t.id === id)

    if (!theme) {
      console.warn(`主题 ${id} 未找到或为内置主题`)
      return
    }

    customThemes.value = customThemes.value.filter((t) => t.id !== id)
    saveCustomThemes(customThemes.value)
    clearDarkCssCache()

    // 如果删除的是当前主题，切换到默认
    if (themeId.value === id) {
      themeId.value = 'default'
      themeName.value = '默认主题'
      customCSS.value = ''
      saveSelectedTheme('default', '默认主题')
    }
  }

  function duplicateTheme(id: string, newName: string): CustomTheme {
    const allThemes = getAllThemes()
    const sourceTheme = allThemes.find((t) => t.id === id)

    if (!sourceTheme) {
      throw new Error(`主题 ${id} 未找到`)
    }

    return createTheme(newName, sourceTheme.css)
  }

  return {
    themeId,
    themeName,
    customCSS,
    customThemes,
    getAllThemes,
    selectTheme,
    setCustomCSS,
    getThemeCSS,
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
  }
})

// 导出内置主题供其他模块使用
export { builtInThemes }
export type { CustomTheme }
