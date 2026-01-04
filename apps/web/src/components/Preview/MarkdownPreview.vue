<script lang="ts">
export const SYNC_SCROLL_EVENT = "wemd-sync-scroll";

export interface SyncScrollDetail {
  source: "editor" | "preview";
  ratio: number;
}
</script>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from "vue";
import { createMarkdownParser, processHtml } from "@wemd/core";
import { useEditorStore } from "../../store/editorStore";
import { useThemeStore } from "../../store/themeStore";
import { useUIThemeStore } from "../../store/uiThemeStore";
import { hasMathFormula, renderMathInElement } from "../../utils/katexRenderer";
import { convertLinksToFootnotes } from "../../utils/linkFootnote";
import {
  getLinkToFootnoteEnabled,
  LINK_TO_FOOTNOTE_EVENT,
} from "../Editor/ToolbarState";
import "./MarkdownPreview.css";

const editorStore = useEditorStore();
const themeStore = useThemeStore();
const uiThemeStore = useUIThemeStore();

const html = ref("");
const linkToFootnoteEnabled = ref(getLinkToFootnoteEnabled());
const previewRef = ref<HTMLDivElement | null>(null);
const scrollContainerRef = ref<HTMLDivElement | null>(null);
const isSyncing = ref(false);

// 创建 parser 实例
const parser = createMarkdownParser();

const themeCSS = computed(() => {
  return themeStore.getThemeCSS(themeStore.themeId, uiThemeStore.theme === "dark");
});

watch(
  [
    () => editorStore.markdown,
    () => themeStore.themeId,
    () => themeStore.customCSS,
    () => uiThemeStore.theme,
    linkToFootnoteEnabled,
  ],
  () => {
    const rawHtml = parser.render(editorStore.markdown);
    const previewHtml = linkToFootnoteEnabled.value
      ? convertLinksToFootnotes(rawHtml)
      : rawHtml;

    const isDarkMode = uiThemeStore.theme === "dark";
    const css = themeStore.getThemeCSS(themeStore.themeId, isDarkMode);
    const styledHtml = processHtml(previewHtml, css, false);

    html.value = styledHtml;
  },
  { immediate: true }
);

// KaTeX 渲染
watch(html, () => {
  if (!previewRef.value || !html.value) return;

  if (!hasMathFormula(editorStore.markdown)) return;

  nextTick(() => {
    setTimeout(() => {
      if (previewRef.value) {
        renderMathInElement(previewRef.value);
      }
    }, 100);
  });
});

// 处理预览栏滚动事件
const handlePreviewScroll = () => {
  if (isSyncing.value || !scrollContainerRef.value) return;

  const container = scrollContainerRef.value;
  const scrollTop = container.scrollTop;
  const scrollHeight = container.scrollHeight - container.clientHeight;

  if (scrollHeight <= 0) return;

  const ratio = scrollTop / scrollHeight;

  window.dispatchEvent(
    new CustomEvent<SyncScrollDetail>(SYNC_SCROLL_EVENT, {
      detail: { source: "preview", ratio },
    })
  );
};

// 接收编辑器的同步事件
const handleSync = (event: Event) => {
  const customEvent = event as CustomEvent<SyncScrollDetail>;
  const { source, ratio } = customEvent.detail;

  if (source === "preview" || !scrollContainerRef.value) return;

  const container = scrollContainerRef.value;
  const scrollHeight = container.scrollHeight - container.clientHeight;

  if (scrollHeight <= 0) return;

  isSyncing.value = true;
  container.scrollTop = scrollHeight * ratio;

  setTimeout(() => {
    isSyncing.value = false;
  }, 100);
};

const handleLinkToFootnoteChange = (event: Event) => {
  const customEvent = event as CustomEvent<boolean>;
  linkToFootnoteEnabled.value = customEvent.detail;
};

onMounted(() => {
  if (scrollContainerRef.value) {
    scrollContainerRef.value.addEventListener("scroll", handlePreviewScroll);
  }
  window.addEventListener(SYNC_SCROLL_EVENT, handleSync as EventListener);
  window.addEventListener(
    LINK_TO_FOOTNOTE_EVENT,
    handleLinkToFootnoteChange as EventListener
  );
});

onUnmounted(() => {
  if (scrollContainerRef.value) {
    scrollContainerRef.value.removeEventListener("scroll", handlePreviewScroll);
  }
  window.removeEventListener(SYNC_SCROLL_EVENT, handleSync as EventListener);
  window.removeEventListener(
    LINK_TO_FOOTNOTE_EVENT,
    handleLinkToFootnoteChange as EventListener
  );
});
</script>

<template>
  <div class="markdown-preview">
    <div class="preview-header">
      <span class="preview-title">实时预览</span>
      <span class="preview-subtitle">微信排版效果</span>
    </div>
    <div class="preview-container" ref="scrollContainerRef">
      <div class="preview-content">
        <component is="style" v-html="themeCSS"></component>
        <div ref="previewRef" v-html="html"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.markdown-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.preview-container {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.preview-content {
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-primary);
  padding: 40px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  min-height: calc(100% - 48px);
}

/* 响应式 */
@media (max-width: 768px) {
  .preview-container {
    padding: 16px;
  }

  .preview-content {
    padding: 24px 20px;
  }
}

/* 深色模式 */
[data-ui-theme="dark"] .markdown-preview,
[data-ui-theme="dark"] .preview-container,
[data-ui-theme="dark"] .preview-content {
  background: #0f1113;
}

[data-ui-theme="dark"] .preview-content {
  box-shadow: none;
}
</style>

<style>
/* 以下样式需要全局生效，以便作用于 v-html 注入的内容 */

/* 确保斜体样式生效 */
#wemd em {
  font-style: italic !important;
  font-synthesis: style;
}

/* 强制图片自适应 */
#wemd img {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 10px auto;
}

/* 针对整个预览容器启用字体合成 */
#wemd {
  font-synthesis: style weight;
}
</style>
