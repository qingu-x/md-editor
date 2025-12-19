import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 图床上传配置类型
export interface GithubConfig {
  token: string
  repo: string // 例如 'username/repo'
  branch?: string
  useJsDelivr?: boolean
}

export interface LocalConfig {
  serverUrl: string // 例如 'http://localhost:4000/api'
}

const STORAGE_KEY = 'wemd-settings'

// 从 localStorage 加载设置
const loadSettings = (): { githubConfig?: GithubConfig; localConfig?: LocalConfig } => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored)
  } catch {
    return {}
  }
}

// 保存设置到 localStorage
const saveSettings = (settings: { githubConfig?: GithubConfig; localConfig?: LocalConfig }) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

const initialSettings = loadSettings()

export const useSettingsStore = defineStore('settings', () => {
  const githubConfig = ref<GithubConfig | undefined>(initialSettings.githubConfig)
  const localConfig = ref<LocalConfig | undefined>(initialSettings.localConfig)

  // 自动持久化
  watch(
    [githubConfig, localConfig],
    () => {
      saveSettings({
        githubConfig: githubConfig.value,
        localConfig: localConfig.value,
      })
    },
    { deep: true }
  )

  function setGithubConfig(config: GithubConfig | undefined) {
    githubConfig.value = config
  }

  function setLocalConfig(config: LocalConfig | undefined) {
    localConfig.value = config
  }

  return {
    githubConfig,
    localConfig,
    setGithubConfig,
    setLocalConfig,
  }
})
