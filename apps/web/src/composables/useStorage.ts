import { ref, computed, onMounted } from 'vue'
import type { StorageAdapter } from '../storage/StorageAdapter'
import { StorageManager } from '../storage/StorageManager'
import type { StorageType, StorageInitResult } from '../storage/types'

const manager = new StorageManager()
const adapter = ref<StorageAdapter | null>(null)
const type = ref<StorageType>('indexeddb')
const ready = ref(false)
const message = ref('')

// 初始化标志，确保只初始化一次
let initialized = false

async function initStorage() {
  if (initialized) return
  initialized = true

  try {
    const instance = await manager.restoreLastAdapter()
    if (instance) {
      adapter.value = instance
      type.value = instance.type
      ready.value = true
      message.value =
        instance.type === 'filesystem' ? '已启用本地文件夹模式' : '已启用浏览器存储模式'
    }
  } catch (error: unknown) {
    message.value = error instanceof Error ? error.message : String(error)
  }
}

export function useStorage() {
  onMounted(() => {
    initStorage()
  })

  async function select(nextType: StorageType): Promise<StorageInitResult> {
    const result = await manager.setAdapter(nextType)
    adapter.value = manager.currentAdapter
    type.value = nextType
    ready.value = result.ready
    if (result.ready) {
      message.value =
        nextType === 'filesystem' ? '已切换到本地文件夹模式' : '已切换到浏览器存储模式'
    } else {
      message.value = result.message ?? '初始化失败，请重试'
    }
    return result
  }

  // 别名：storageMode 和 setStorageMode
  const storageMode = type
  async function setStorageMode(mode: StorageType) {
    await select(mode)
  }

  const isFileSystemSupported = computed(() => StorageManager.isFileSystemSupported())

  return {
    adapter,
    type,
    ready,
    message,
    select,
    storageMode,
    setStorageMode,
    isFileSystemSupported,
  }
}

// 导出单例状态供全局使用
export { adapter, type, ready, message }
