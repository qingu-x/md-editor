<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { minimalSetup } from "codemirror";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import {
  wechatMarkdownHighlighting,
  wechatMarkdownHighlightingDark,
} from "./markdownTheme";
import { useUIThemeStore } from "../../store/uiThemeStore";
import { useEditorStore } from "../../store/editorStore";
import { countWords, countLines } from "../../utils/wordCount";
import Toolbar from "./Toolbar.vue";
import SearchPanel from "./SearchPanel.vue";
import SaveIndicator from "./SaveIndicator.vue";

import { SYNC_SCROLL_EVENT, type SyncScrollDetail } from '../Preview/MarkdownPreview.vue';
import { toast } from '../../hooks/useToast';
import { customKeymap } from "./editorShortcuts";

const props = defineProps<{
  initialValue?: string;
}>();

const editorRef = ref<HTMLDivElement | null>(null);
const viewRef = ref<EditorView | null>(null);
const editorStore = useEditorStore();
const uiThemeStore = useUIThemeStore();
const isSyncing = ref(false);
const showSearch = ref(false);

const wordCount = ref(0);
const lineCount = ref(0);

// Cmd/Ctrl+F 打开搜索面板
const handleGlobalKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "f") {
    e.preventDefault();
    showSearch.value = true;
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeyDown);
  initEditor();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleGlobalKeyDown);
  if (viewRef.value) {
    viewRef.value.destroy();
  }
});

function initEditor() {
  if (!editorRef.value) return;

  // 如果已经有编辑器实例，先获取当前内容并销毁
  const currentContent = viewRef.value
    ? viewRef.value.state.doc.toString()
    : editorStore.markdown;

  if (viewRef.value) {
    viewRef.value.destroy();
  }

  const startState = EditorState.create({
    doc: currentContent,
    extensions: [
      minimalSetup,
      customKeymap,
      markdown({ base: markdownLanguage }),
      uiThemeStore.theme === "dark"
        ? wechatMarkdownHighlightingDark
        : wechatMarkdownHighlighting,
      uiThemeStore.theme === "dark" ? githubDark : githubLight,
      EditorView.lineWrapping,
      EditorView.domEventHandlers({
        paste: (event: ClipboardEvent, view: EditorView) => {
          const items = event.clipboardData?.items;
          if (!items) return;

          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) continue;

              // 检查图片大小，超过 2MB 拒绝上传
              const MAX_SIZE_MB = 2;
              const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
              if (file.size > MAX_SIZE_BYTES) {
                const sizeMB = (file.size / 1024 / 1024).toFixed(1);
                toast.error(`请压缩图片后再试，公众号不支持超过 2MB 的图片外链(当前 ${sizeMB}MB)`, 4000);
                continue;
              }

              handleImageUpload(file, view);
            }
          }
        },
      }),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          editorStore.setMarkdown(newContent);
          wordCount.value = countWords(newContent);
          lineCount.value = countLines(newContent);
        }
      }),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "15px",
        },
        ".cm-scroller": {
          fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
          lineHeight: "1.6",
        },
        ".cm-content": {
          padding: "40px 0",
        },
        ".cm-gutters": {
          backgroundColor: uiThemeStore.theme === "dark" ? "transparent" : "#f8f9fa",
          color: uiThemeStore.theme === "dark" ? "#6e7681" : "#adb5bd",
          border: "none",
        },
      }),
    ],
  });

  const view = new EditorView({
    state: startState,
    parent: editorRef.value,
  });

  const scrollDOM = view.scrollDOM;
  const handleEditorScroll = () => {
    if (isSyncing.value) {
      isSyncing.value = false;
      return;
    }
    const max = scrollDOM.scrollHeight - scrollDOM.clientHeight;
    if (max <= 0) return;
    const ratio = scrollDOM.scrollTop / max;
    window.dispatchEvent(
      new CustomEvent<SyncScrollDetail>(SYNC_SCROLL_EVENT, {
        detail: { source: "editor", ratio },
      }),
    );
  };

  const handleSync = (event: Event) => {
    const customEvent = event as CustomEvent<SyncScrollDetail>;
    const detail = customEvent.detail;
    if (!detail || detail.source === "editor") return;
    const max = scrollDOM.scrollHeight - scrollDOM.clientHeight;
    if (max <= 0) return;
    isSyncing.value = true;
    scrollDOM.scrollTo({ top: detail.ratio * max });
  };

  scrollDOM.addEventListener("scroll", handleEditorScroll);
  window.addEventListener(SYNC_SCROLL_EVENT, handleSync as EventListener);

  viewRef.value = view;
  wordCount.value = countWords(editorStore.markdown);
  lineCount.value = countLines(editorStore.markdown);
}

async function handleImageUpload(file: File, view: EditorView) {
  const loadingText = `![上传中... ${file.name}]()`;
  const range = view.state.selection.main;

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: loadingText },
  });

  const uploadPromise = (async () => {
    const saved = localStorage.getItem("imageHostConfig");
    const imageHostConfig = saved ? JSON.parse(saved) : { type: "official" };
    const { ImageHostManager } = await import(
      "../../services/image/ImageUploader"
    );
    const manager = new ImageHostManager(imageHostConfig);
    const url = await manager.upload(file);
    return { url, filename: file.name };
  })();

  toast.promise(uploadPromise, {
    loading: "正在上传图片...",
    success: (result: any) => {
      const imageText = `![](${result.url})`;
      const currentDoc = view.state.doc.toString();
      const index = currentDoc.indexOf(loadingText);

      if (index !== -1) {
        view.dispatch({
          changes: {
            from: index,
            to: index + loadingText.length,
            insert: imageText,
          },
        });
      }
      return "图片上传成功";
    },
    error: (err: any) => {
      const currentDoc = view.state.doc.toString();
      const index = currentDoc.indexOf(loadingText);
      if (index !== -1) {
        view.dispatch({
          changes: { from: index, to: index + loadingText.length, insert: "" },
        });
      }
      return `上传失败: ${err.message}`;
    },
  });
}

// 监听主题变化，重新初始化编辑器
watch(() => uiThemeStore.theme, () => {
  if (viewRef.value) {
    viewRef.value.destroy();
    initEditor();
  }
});

// 监听外部内容变化
watch(() => editorStore.markdown, (newContent: string) => {
  const view = viewRef.value;
  if (!view) return;
  const currentDoc = view.state.doc.toString();
  if (currentDoc === newContent) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newContent },
  });
});

// 处理工具栏文本插入
const handleInsert = (prefix: string, suffix: string, placeholder: string) => {
  const view = viewRef.value;
  if (!view) return;

  const selection = view.state.selection.main;
  const selectedText = view.state.doc.sliceString(selection.from, selection.to);
  const textToInsert = selectedText || placeholder;
  const fullText = prefix + textToInsert + suffix;

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: fullText },
    selection: {
      anchor: selection.from + prefix.length,
      head: selection.from + prefix.length + textToInsert.length,
    },
  });

  view.focus();
};
</script>

<template>
  <div class="markdown-editor" :data-ui-theme="uiThemeStore.theme">
    <div class="editor-header">
      <span class="editor-title">Markdown 编辑器</span>
    </div>
    <Toolbar @insert="handleInsert" />
    <SearchPanel
      v-if="showSearch && viewRef"
      :view="(viewRef as any)"
      :on-close="() => (showSearch = false)"
    />
    <div class="editor-body-wrapper">
      <div ref="editorRef" class="editor-container" />
    </div>
    <div class="editor-footer">
      <div class="editor-stats">
        <span class="editor-stat">行数: {{ lineCount }}</span>
        <span class="editor-stat">字数: {{ wordCount }}</span>
      </div>
      <SaveIndicator />
    </div>
  </div>
</template>

<style>
@import "./MarkdownEditor.css";
</style>
