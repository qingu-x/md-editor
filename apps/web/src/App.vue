<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { Toaster } from 'vue-sonner'
import { Loader2 } from 'lucide-vue-next'
import { useFileSystem } from './composables/useFileSystem'
import { useStorage } from './composables/useStorage'
import { useHistoryStore } from './stores/history'
import { useFileStore } from './stores/file'
import './styles/global.css'

// 核心组件 - 同步加载
import Header from './components/Header/Header.vue'
import MarkdownEditor from './components/Editor/MarkdownEditor.vue'
import MarkdownPreview from './components/Preview/MarkdownPreview.vue'

// 非核心组件 - 异步加载
const FileSidebar = defineAsyncComponent(() => import('./components/Sidebar/FileSidebar.vue'))
const HistoryPanel = defineAsyncComponent(() => import('./components/History/HistoryPanel.vue'))
const Welcome = defineAsyncComponent(() => import('./components/Welcome/Welcome.vue'))
const HistoryManager = defineAsyncComponent(
  () => import('./components/History/HistoryManager.vue')
)

const { saveFile } = useFileSystem()
const { type: storageType, ready } = useStorage()
const historyStore = useHistoryStore()
const fileStore = useFileStore()

// 检查是否在 Electron 中运行
const isElectron = computed(() => {
  // @ts-expect-error Electron 类型定义
  return typeof window !== 'undefined' && window.electron?.isElectron
})

const showHistory = ref((() => {
  if (typeof window === 'undefined') return true
  const saved = localStorage.getItem('wemd-show-history')
  return saved !== 'false'
})())

const historyWidth = ref(showHistory.value ? '280px' : '0px')

// 全局保存快捷键
function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    saveFile(true)
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// 持久化 showHistory
watch(showHistory, (val) => {
  try {
    localStorage.setItem('wemd-show-history', String(val))
  } catch {
    /* 忽略持久化错误 */
  }
})

// 动画宽度
watch(showHistory, (val) => {
  if (val) {
    historyWidth.value = '280px'
  } else {
    setTimeout(() => {
      historyWidth.value = '0px'
    }, 350)
  }
})

const mainStyle = computed(() => ({
  '--history-width': historyWidth.value,
}))

const workspacePath = computed(() => fileStore.workspacePath)
const historyLoading = computed(() => historyStore.loading)
const fileLoading = computed(() => fileStore.isLoading)

const isLoading = computed(() => {
  return !ready.value || fileLoading.value || (historyLoading.value && !isElectron.value && storageType.value === 'indexeddb')
})

function toggleHistory() {
  showHistory.value = !showHistory.value
}
</script>

<template>
  <!-- Electron 模式：强制选择工作区 -->
  <template v-if="isElectron && !workspacePath">
    <Toaster position="top-center" />
    <Welcome />
  </template>

  <template v-else>
    <div class="app">
      <!-- 只在存储上下文完全就绪且确认为 IndexedDB 模式时才渲染 HistoryManager -->
      <HistoryManager v-if="!isElectron && ready && storageType === 'indexeddb'" />

      <Toaster
        position="top-center"
        :toast-options="{
          class: 'premium-toast',
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#1a1a1a',
            boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.12)',
            borderRadius: '50px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid rgba(0, 0, 0, 0.05)',
            maxWidth: '400px',
          },
        }"
      />

      <Header />

      <main
        class="app-main"
        :style="mainStyle"
        :data-show-history="showHistory"
      >
        <button
          :class="['history-toggle', { 'is-collapsed': !showHistory }]"
          :aria-label="showHistory ? '隐藏列表' : '显示列表'"
          @click="toggleHistory"
        >
          <span class="sr-only">{{ showHistory ? '隐藏列表' : '显示列表' }}</span>
        </button>

        <div
          :class="['history-pane', showHistory ? 'is-visible' : 'is-hidden']"
          :aria-hidden="!showHistory"
        >
          <div class="history-pane__content">
            <!-- ready 后渲染，防止闪烁 -->
            <template v-if="ready">
              <FileSidebar v-if="isElectron || storageType === 'filesystem'" />
              <HistoryPanel v-else />
            </template>
          </div>
        </div>

        <div
          v-if="isElectron"
          class="window-drag-region"
        ></div>

        <div class="workspace">
          <div class="editor-pane">
            <div
              v-if="isLoading"
              class="workspace-loading"
            >
              <Loader2
                class="animate-spin"
                :size="24"
              />
              <p>正在加载文章</p>
            </div>
            <MarkdownEditor v-else />
          </div>

          <div class="preview-pane">
            <div
              v-if="isLoading"
              class="workspace-loading"
            >
              <Loader2
                class="animate-spin"
                :size="24"
              />
              <p>正在加载文章</p>
            </div>
            <MarkdownPreview v-else />
          </div>
        </div>
      </main>
    </div>
  </template>
</template>

<style src="./App.css"></style>

