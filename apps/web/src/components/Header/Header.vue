<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { useUIThemeStore } from '../../stores/uiTheme'
import ThemePanel from '../Theme/ThemePanel.vue'
import StorageModeSelector from '../Settings/StorageModeSelector.vue'
import ImageHostSettings from '../Settings/ImageHostSettings.vue'
import { Layers, Palette, Send, ImageIcon, Sun, Moon } from 'lucide-vue-next'
import './Header.css'

const editorStore = useEditorStore()
const uiThemeStore = useUIThemeStore()

const showThemePanel = ref(false)
const showStorageModal = ref(false)
const showImageHostModal = ref(false)

const isStructuralismUI = computed(() => uiThemeStore.theme === 'dark')

const isElectron = computed(() => {
  return typeof window !== 'undefined' && !!(window as unknown as { electron?: unknown }).electron
})

const structuralismLogoSrc = `${import.meta.env.BASE_URL}favicon-light.svg`

function toggleTheme() {
  uiThemeStore.setTheme(uiThemeStore.theme === 'dark' ? 'default' : 'dark')
}

function handleCopyToWechat() {
  editorStore.copyToWechat()
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <div class="logo">
        <!-- Logo -->
        <img
          v-if="isStructuralismUI"
          :src="structuralismLogoSrc"
          alt="WeMD Logo"
          width="40"
          height="40"
          style="display: block"
        />
        <svg
          v-else
          width="40"
          height="40"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M40 20 H160 C171 20 180 29 180 40 V140 C180 151 171 160 160 160 H140 L140 185 L110 160 H40 C29 160 20 151 20 140 V40 C20 29 29 20 40 20 Z"
            fill="#1A1A1A"
          />
          <rect
            x="50"
            y="50"
            width="100"
            height="12"
            rx="6"
            fill="#07C160"
          />
          <path
            d="M60 85 L60 130 H80 L80 110 L100 130 L120 110 L120 130 H140 L140 85 L120 85 L100 105 L80 85 Z"
            fill="#FFFFFF"
          />
        </svg>
        <div class="logo-info">
          <span class="logo-text">WeMD</span>
          <span class="logo-subtitle">公众号 Markdown 排版编辑器</span>
        </div>
      </div>
    </div>

    <div class="header-right">
      <button
        class="btn-icon-only"
        :aria-label="uiThemeStore.theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
        :title="uiThemeStore.theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
        @click="toggleTheme"
      >
        <Sun
          v-if="uiThemeStore.theme === 'dark'"
          :size="18"
          :stroke-width="2"
        />
        <Moon
          v-else
          :size="18"
          :stroke-width="2"
        />
      </button>

      <button
        v-if="!isElectron"
        class="btn-secondary"
        @click="showStorageModal = true"
      >
        <Layers
          :size="18"
          :stroke-width="2"
        />
        <span>存储模式</span>
      </button>

      <button
        class="btn-secondary"
        @click="showImageHostModal = true"
      >
        <ImageIcon
          :size="18"
          :stroke-width="2"
        />
        <span>图床设置</span>
      </button>

      <button
        class="btn-secondary"
        @click="showThemePanel = true"
      >
        <Palette
          :size="18"
          :stroke-width="2"
        />
        <span>主题管理</span>
      </button>

      <button
        class="btn-primary"
        @click="handleCopyToWechat"
      >
        <Send
          :size="18"
          :stroke-width="2"
        />
        <span>复制到公众号</span>
      </button>
    </div>
  </header>

  <!-- Theme Panel -->
  <ThemePanel
    :open="showThemePanel"
    @close="showThemePanel = false"
  />

  <!-- Storage Modal -->
  <div
    v-if="showStorageModal"
    class="storage-modal-overlay"
    @click="showStorageModal = false"
  >
    <div
      class="storage-modal-panel"
      @click.stop
    >
      <div class="storage-modal-header">
        <h3>选择存储模式</h3>
        <button
          class="storage-modal-close"
          aria-label="关闭"
          @click="showStorageModal = false"
        >
          ×
        </button>
      </div>
      <StorageModeSelector />
    </div>
  </div>

  <!-- Image Host Modal -->
  <ImageHostSettings
    :open="showImageHostModal"
    @close="showImageHostModal = false"
  />
</template>

