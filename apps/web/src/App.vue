<template>
  <div class="app" :data-platform="platformName" :data-mobile="isMobile">
    <!-- 更新提示 Modal -->
    <UpdateModal
      v-if="updateInfo"
      :latest-version="updateInfo.latestVersion"
      :current-version="updateInfo.currentVersion"
      :release-notes="updateInfo.releaseNotes"
      @close="updateInfo = null"
      @download="handleDownload"
      @skip-version="handleSkipVersion"
    />

    <!-- 只在存储上下文完全就绪且确认为 IndexedDB 模式时才渲染 HistoryManager -->
    <HistoryManager v-if="!isElectron && ready && storageType === 'indexeddb'" />

    <template v-if="isElectron && !workspacePath">
      <Welcome />
    </template>

    <template v-else>
      <Header />
      
      <button
        class="history-toggle"
        :class="{ 'is-collapsed': !showHistory }"
        @click="showHistory = !showHistory"
        :aria-label="showHistory ? '隐藏列表' : '显示列表'"
      >
        <span class="sr-only">
          {{ showHistory ? '隐藏列表' : '显示列表' }}
        </span>
      </button>

      <main
        class="app-main"
        :style="mainStyle"
        :data-show-history="showHistory"
      >
        <div
          class="history-pane"
          :class="showHistory ? 'is-visible' : 'is-hidden'"
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
          class="workspace"
          :data-mobile-view="isMobile ? activeView : undefined"
        >
          <div class="editor-pane">
            <!-- 存储未就绪或文件/历史加载中显示 loading -->
            <div v-if="!ready || fileLoading || (historyLoading && !isElectron && storageType === 'indexeddb')" class="workspace-loading">
              <Loader2 class="animate-spin" :size="24" />
              <p>正在加载文章</p>
            </div>
            <MarkdownEditor v-else />
          </div>

          <div class="preview-pane">
            <div v-if="!ready || fileLoading || (historyLoading && !isElectron && storageType === 'indexeddb')" class="workspace-loading">
              <Loader2 class="animate-spin" :size="24" />
              <p>正在加载文章</p>
            </div>
            <MarkdownPreview v-else />
          </div>
        </div>

        <!-- 移动端底部工具栏 -->
        <MobileToolbar
          v-if="isMobile"
          :active-view="activeView"
          @view-change="setActiveView"
          @copy-to-wechat="copyToWechat"
          @open-theme="showThemePanel = true"
        />
      </main>

      <!-- 移动端主题选择器 -->
      <MobileThemeSelector
        v-if="isMobile"
        :open="showThemePanel"
        @close="showThemePanel = false"
      />

      <!-- 全局通知 -->
      <Toast />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Loader2 } from 'lucide-vue-next';
import Header from './components/Header/Header.vue';
import FileSidebar from './components/Sidebar/FileSidebar.vue';
import MarkdownEditor from './components/Editor/MarkdownEditor.vue';
import MarkdownPreview from './components/Preview/MarkdownPreview.vue';
import HistoryPanel from './components/History/HistoryPanel.vue';
import HistoryManager from './components/History/HistoryManager.vue';
import Welcome from './components/Welcome/Welcome.vue';
import UpdateModal from './components/UpdateModal/UpdateModal.vue';
import MobileToolbar from './components/common/MobileToolbar.vue';
import MobileThemeSelector from './components/Theme/MobileThemeSelector.vue';
import { Toast } from './components/common';

import { useFileSystem } from './hooks/useFileSystem';
import { useMobileView } from './hooks/useMobileView';
import { useEditorStore } from './store/editorStore';
import { useHistoryStore } from './store/historyStore';
import { useFileStore } from './store/fileStore';
import { useStorageStore } from './store/storageStore';
import { useThemeStore } from './store/themeStore';
import { useUIThemeStore } from './store/uiThemeStore';
import { platform } from './utils/platformAdapter';

import './styles/global.css';
import './App.css';

const { workspacePath, saveFile } = useFileSystem({ registerListeners: true });
const storageStore = useStorageStore();
const historyStore = useHistoryStore();
const fileStore = useFileStore();
const editorStore = useEditorStore();

const ready = computed(() => storageStore.ready);
const storageType = computed(() => storageStore.type);
const historyLoading = computed(() => historyStore.loading);
const fileLoading = computed(() => fileStore.isLoading);

const { isMobile, activeView, setActiveView } = useMobileView();

const themeStore = useThemeStore();
const uiThemeStore = useUIThemeStore();

const copyToWechat = () => {
  const isDarkMode = uiThemeStore.theme === "dark";
  const css = themeStore.getThemeCSS(themeStore.themeId, isDarkMode);
  editorStore.copyToWechat(css);
};

const showThemePanel = ref(false);
const showHistory = ref(
  localStorage.getItem("wemd-show-history") !== "false"
);

const historyWidth = ref(showHistory.value ? "280px" : "0px");

watch(showHistory, (val: boolean) => {
  localStorage.setItem("wemd-show-history", String(val));
  if (val) {
    historyWidth.value = "280px";
  } else {
    setTimeout(() => {
      historyWidth.value = "0px";
    }, 350);
  }
});

const mainStyle = computed(() => ({
  '--history-width': historyWidth.value,
}));

const isElectron = platform.isElectron;
const platformName = platform.name ?? "web";

// 更新提示状态
const updateInfo = ref<{
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
} | null>(null);

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    saveFile();
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
  
  if (isElectron) {
    const electron = (window as any).electron;
    if (electron?.update?.onUpdateAvailable) {
      electron.update.onUpdateAvailable((data: any) => {
        const skippedVersion = localStorage.getItem("wemd-skipped-version");
        if (!data.force && skippedVersion === data.latestVersion) {
          return;
        }
        updateInfo.value = {
          latestVersion: data.latestVersion,
          currentVersion: data.currentVersion,
          releaseNotes: data.releaseNotes || "",
        };
      });
    }
  }
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
});

const handleDownload = () => {
  (window as any).electron?.update?.openReleases?.();
  updateInfo.value = null;
};

const handleSkipVersion = () => {
  if (updateInfo.value) {
    localStorage.setItem("wemd-skipped-version", updateInfo.value.latestVersion);
  }
  updateInfo.value = null;
};
</script>

<style>
/* 可以在这里添加一些基础样式，或者依赖 App.css */
</style>
