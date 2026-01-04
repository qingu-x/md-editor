<template>
  <div>
    <!-- 隐藏状态下的持久化窗口控制 (Windows only) -->
    <WindowControls v-if="autoHide && isWindows" fixed />

    <!-- 隐藏状态下的浮动工具栏 -->
    <div v-if="autoHide" :class="['floating-toolbar', isWindows ? 'floating-toolbar-win' : '']">
      <FloatingToolbarButton
        label="显示标题栏"
        @click="autoHide = false"
        highlight
      >
        <template #icon><ChevronsUp :size="18" :strokeWidth="2" /></template>
      </FloatingToolbarButton>
      
      <FloatingToolbarButton
        :label="uiTheme === 'dark' ? '亮色模式' : '暗色模式'"
        @click="setTheme(uiTheme === 'dark' ? 'default' : 'dark')"
      >
        <template #icon>
          <Sun v-if="uiTheme === 'dark'" :size="18" :strokeWidth="2" />
          <Moon v-else :size="18" :strokeWidth="2" />
        </template>
      </FloatingToolbarButton>

      <FloatingToolbarButton
        v-if="!isElectron"
        label="存储模式"
        @click="showStorageModal = true"
      >
        <template #icon><Layers :size="18" :strokeWidth="2" /></template>
      </FloatingToolbarButton>

      <FloatingToolbarButton
        label="图床设置"
        @click="showImageHostModal = true"
      >
        <template #icon><ImageIcon :size="18" :strokeWidth="2" /></template>
      </FloatingToolbarButton>

      <FloatingToolbarButton
        label="主题管理"
        @click="showThemePanel = true"
      >
        <template #icon><Palette :size="18" :strokeWidth="2" /></template>
      </FloatingToolbarButton>

      <FloatingToolbarButton
        label="复制到公众号"
        @click="copyToWechat"
        primary
      >
        <template #icon><Send :size="18" :strokeWidth="2" /></template>
      </FloatingToolbarButton>
    </div>

    <header
      :class="['app-header', autoHide ? 'header-auto-hide' : '']"
      :style="headerStyle"
    >
      <div class="header-left">
        <div class="logo">
          <StructuralismLogoMark v-if="isStructuralismUI" />
          <DefaultLogoMark v-else />
          <div class="logo-info">
            <span class="logo-text">WeMD</span>
            <span class="logo-subtitle">公众号 Markdown 排版编辑器</span>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <div class="header-right">
          <button
            class="btn-icon-only"
            @click="setTheme(uiTheme === 'dark' ? 'default' : 'dark')"
            :aria-label="uiTheme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
            :title="uiTheme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
          >
            <Sun v-if="uiTheme === 'dark'" :size="18" :strokeWidth="2" />
            <Moon v-else :size="18" :strokeWidth="2" />
          </button>
          
          <button
            v-if="!isElectron"
            class="btn-secondary"
            @click="showStorageModal = true"
          >
            <Layers :size="18" :strokeWidth="2" />
            <span>存储模式</span>
          </button>

          <button
            class="btn-secondary"
            @click="showImageHostModal = true"
          >
            <ImageIcon :size="18" :strokeWidth="2" />
            <span>图床设置</span>
          </button>

          <button
            class="btn-secondary"
            @click="showThemePanel = true"
          >
            <Palette :size="18" :strokeWidth="2" />
            <span>主题管理</span>
          </button>

          <button class="btn-primary" @click="copyToWechat">
            <Send :size="18" :strokeWidth="2" />
            <span>复制到公众号</span>
          </button>

          <button
            class="btn-ghost"
            @click="autoHide = true"
            aria-label="隐藏标题栏"
            title="隐藏标题栏"
          >
            <ChevronsDown :size="18" :strokeWidth="2" />
          </button>
        </div>

        <!-- Windows 自定义标题栏按钮 -->
        <WindowControls v-if="isWindows" />
      </div>
    </header>

    <ThemePanel
      v-if="showThemePanel"
      :open="showThemePanel"
      @close="showThemePanel = false"
    />

    <Modal
      v-if="showStorageModal"
      :open="showStorageModal"
      @close="showStorageModal = false"
      title="选择存储模式"
    >
      <StorageModeSelector />
    </Modal>

    <Modal
      v-if="showImageHostModal"
      :open="showImageHostModal"
      @close="showImageHostModal = false"
      title="图床设置"
      className="modal-narrow"
    >
      <ImageHostSettings />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent, onMounted, h } from 'vue';
import { useEditorStore } from "../../store/editorStore";
import { useThemeStore } from "../../store/themeStore";
import { useUIThemeStore } from "../../store/uiThemeStore";
import { useWindowControls } from "../../hooks/useWindowControls";
import WindowControls from "./WindowControls.vue";
import { Modal, FloatingToolbarButton } from "../common";
import {
  Layers,
  Palette,
  Send,
  ImageIcon,
  Sun,
  Moon,
  ChevronsUp,
  ChevronsDown,
} from "lucide-vue-next";

// Components
const ThemePanel = defineAsyncComponent(() => import("../Theme/ThemePanel.vue"));

const AsyncLoading = () => h('div', { 
  style: { padding: "20px", textAlign: "center", color: "var(--text-secondary)" } 
}, '正在加载...');

const StorageModeSelector = defineAsyncComponent({
  loader: () => import("../StorageModeSelector/StorageModeSelector.vue"),
  loadingComponent: AsyncLoading,
  delay: 200,
});

const ImageHostSettings = defineAsyncComponent({
  loader: () => import("../Settings/ImageHostSettings.vue"),
  loadingComponent: AsyncLoading,
  delay: 200,
});

// SVG components as functional components
const DefaultLogoMark = () => h('svg', {
  width: "40", height: "40", viewBox: "0 0 200 200", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true"
}, [
  h('path', { d: "M40 20 H160 C171 20 180 29 180 40 V140 C180 151 171 160 160 160 H140 L140 185 L110 160 H40 C29 160 20 151 20 140 V40 C20 29 29 20 40 20 Z", fill: "#1A1A1A" }),
  h('rect', { x: "50", y: "50", width: "100", height: "12", rx: "6", fill: "#07C160" }),
  h('path', { d: "M60 85 L60 130 H80 L80 110 L100 130 L120 110 L120 130 H140 L140 85 L120 85 L100 105 L80 85 Z", fill: "#FFFFFF" })
]);

const structuralismLogoSrc = (import.meta as any).env.BASE_URL + "favicon-light.svg";
const StructuralismLogoMark = () => h('img', {
  src: structuralismLogoSrc, alt: "WeMD Logo", width: "40", height: "40", style: { display: "block" }
});

const editorStore = useEditorStore();
const themeStore = useThemeStore();
const uiThemeStore = useUIThemeStore();
const { isElectron, isWindows, platform } = useWindowControls();

const showThemePanel = ref(false);
const showStorageModal = ref(false);
const showImageHostModal = ref(false);

const uiTheme = computed(() => uiThemeStore.theme);
const isStructuralismUI = computed(() => uiTheme.value === "dark");

const setTheme = (theme: 'default' | 'dark') => uiThemeStore.setTheme(theme);
const copyToWechat = () => {
  const isDarkMode = uiThemeStore.theme === "dark";
  const css = themeStore.getThemeCSS(themeStore.themeId, isDarkMode);
  editorStore.copyToWechat(css);
};

const autoHide = ref(false);

onMounted(() => {
  try {
    autoHide.value = localStorage.getItem("wemd-header-autohide") === "true";
  } catch {
    autoHide.value = false;
  }
});

watch(autoHide, (newVal: boolean) => {
  try {
    localStorage.setItem("wemd-header-autohide", String(newVal));
  } catch {}
});

const headerStyle = computed(() => {
  return platform === "darwin" ? { paddingLeft: "100px" } : undefined;
});
</script>

<style scoped>
@import "./Header.css";
</style>
