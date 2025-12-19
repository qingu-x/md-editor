import type { StorageAdapter } from './StorageAdapter'
import type { StorageAdapterContext, StorageInitResult, StorageType } from './types'

type AdapterFactory = () => Promise<StorageAdapter>

interface PersistedAdapterInfo {
  type: StorageType
  identifier?: string
  ts: number
}

const STORAGE_KEY = 'wemd-storage-adapter'

const uniqueId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export class StorageManager {
  private adapter: StorageAdapter | null = null
  private factories: Partial<Record<StorageType, AdapterFactory>> = {}

  constructor() {
    this.factories.indexeddb = async () => {
      const module = await import('./adapters/IndexedDBAdapter')
      return new module.IndexedDBAdapter()
    }
    this.factories.filesystem = async () => {
      const module = await import('./adapters/FileSystemAdapter')
      return new module.FileSystemAdapter()
    }
  }

  static isFileSystemSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window
  }

  get currentAdapter() {
    return this.adapter
  }

  async setAdapter(type: StorageType, context?: StorageAdapterContext): Promise<StorageInitResult> {
    const factory = this.factories[type]
    if (!factory) {
      throw new Error(`Adapter ${type} not registered`)
    }

    // 清理旧适配器
    if (this.adapter?.teardown) {
      await this.adapter.teardown()
    }

    // 创建新适配器
    this.adapter = await factory()

    // 准备上下文
    let adapterContext = context
    if (type === 'filesystem') {
      const identifier = adapterContext?.identifier ?? uniqueId()
      adapterContext = { ...(adapterContext ?? {}), identifier }
    }

    // 初始化适配器
    const result = await this.adapter.init(adapterContext)

    // 持久化适配器信息
    if (result.ready) {
      try {
        const info: PersistedAdapterInfo = {
          type,
          identifier: adapterContext?.identifier,
          ts: Date.now(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(info))
      } catch {
        // 忽略存储错误
      }
    }

    return result
  }

  async restoreLastAdapter(): Promise<StorageAdapter | null> {
    if (this.adapter) {
      return this.adapter
    }

    // 尝试从 localStorage 恢复适配器信息
    let persisted: PersistedAdapterInfo | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        persisted = JSON.parse(raw) as PersistedAdapterInfo
      }
    } catch {
      // 解析失败,使用默认值
      persisted = null
    }

    // 确定适配器类型和上下文
    const type: StorageType = persisted?.type ?? 'indexeddb'
    const context: StorageAdapterContext | undefined =
      type === 'filesystem' ? { identifier: persisted?.identifier ?? uniqueId() } : undefined

    // 设置适配器
    const result = await this.setAdapter(type, context)
    return result.ready ? this.adapter : null
  }
}
