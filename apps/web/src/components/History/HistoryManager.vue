<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useEditorStore, defaultMarkdown } from '../../store/editorStore';
import { useThemeStore } from '../../store/themeStore';
import { useHistoryStore } from '../../store/historyStore';

const AUTO_SAVE_INTERVAL = 10 * 1000; // 10 秒
const UNTITLED_TITLE = "未命名文章";

function deriveTitle(markdown: string) {
  const trimmed = markdown.trim();
  if (!trimmed) return UNTITLED_TITLE;
  const headingMatch = trimmed.match(/^(#+)\s*(.+)$/m);
  if (headingMatch) {
    return headingMatch[2].trim().slice(0, 50) || UNTITLED_TITLE;
  }
  const firstLine = trimmed.split(/\r?\n/).find((line) => line.trim());
  return firstLine ? firstLine.trim().slice(0, 50) : UNTITLED_TITLE;
}

const editorStore = useEditorStore();
const themeStore = useThemeStore();
const historyStore = useHistoryStore();

const isInitialMount = ref(true);
const isRestoring = ref(false);
const hasUserEdited = ref(false);
const hasAppliedInitialHistory = ref(false);
const creatingInitialSnapshot = ref(false);
const hasLoadedHistory = ref(false);
const wasLoading = ref(false);
const restoringContent = ref<string | null>(null);

const prevMarkdown = ref(editorStore.markdown);

// 加载历史记录
onMounted(() => {
  historyStore.loadHistory();
});

// 跟踪加载生命周期
watch(() => historyStore.loading, (loading: boolean) => {
  if (loading) {
    wasLoading.value = true;
  } else if (wasLoading.value) {
    hasLoadedHistory.value = true;
  }
});

// 监听内容变化并保存快照
watch(
  [() => editorStore.markdown, () => themeStore.themeId, () => themeStore.customCSS, () => themeStore.themeName] as const,
  ([markdown, themeId, customCSS, themeName]) => {
    const markdownChanged = markdown !== prevMarkdown.value;
    prevMarkdown.value = markdown;

    if (isInitialMount.value) {
      isInitialMount.value = false;
      return;
    }

    // 检查当前变化是否与正在恢复的内容匹配
    if (restoringContent.value !== null && markdown === restoringContent.value) {
      restoringContent.value = null;
      return;
    }

    if (
      markdownChanged &&
      !isRestoring.value &&
      !historyStore.loading &&
      hasLoadedHistory.value
    ) {
      hasUserEdited.value = true;
    }

    if (creatingInitialSnapshot.value) return;

    if (historyStore.loading) return;

    if (!historyStore.activeId && historyStore.history.length === 0 && markdown.trim()) {
      creatingInitialSnapshot.value = true;
      historyStore.saveSnapshot(
        {
          markdown,
          theme: themeId,
          customCSS,
          title: deriveTitle(markdown),
          themeName,
        },
        { force: true }
      ).finally(() => {
        creatingInitialSnapshot.value = false;
      });
    }
  }
);

const persistLatestSnapshot = async () => {
  const markdown = editorStore.markdown;
  if (!markdown.trim()) return;

  if (!hasUserEdited.value || isRestoring.value) {
    return;
  }

  if (historyStore.loading) return;

  if (!historyStore.activeId) {
    if (historyStore.history.length === 0) {
      await historyStore.saveSnapshot(
        {
          markdown,
          theme: themeStore.themeId,
          customCSS: themeStore.customCSS,
          title: deriveTitle(markdown),
          themeName: themeStore.themeName,
        },
        { force: true }
      );
    }
    return;
  }

  await historyStore.persistActiveSnapshot({
    markdown,
    theme: themeStore.themeId,
    customCSS: themeStore.customCSS,
    themeName: themeStore.themeName,
  });
};

let intervalId: number;
onMounted(() => {
  intervalId = window.setInterval(() => {
    void persistLatestSnapshot();
  }, AUTO_SAVE_INTERVAL);

  const handleBeforeUnload = () => {
    void persistLatestSnapshot();
  };
  window.addEventListener("beforeunload", handleBeforeUnload);

  onUnmounted(() => {
    window.clearInterval(intervalId);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  });
});

// 应用历史记录
watch(
  [() => historyStore.history, () => historyStore.activeId] as const,
  ([history, activeId]) => {
    if (!history.length) {
      hasAppliedInitialHistory.value = false;
      if (hasLoadedHistory.value) {
        if (editorStore.markdown !== defaultMarkdown) {
          editorStore.setMarkdown(defaultMarkdown);
        }
      }
      return;
    }

    const candidateEntry = history.find((entry: any) => entry.id === activeId) ?? history[0];
    if (!candidateEntry) return;

    const matchesLatest =
      editorStore.markdown === candidateEntry.markdown &&
      themeStore.themeId === candidateEntry.theme &&
      themeStore.customCSS === candidateEntry.customCSS &&
      themeStore.themeName === candidateEntry.themeName;

    if (matchesLatest) {
      if (candidateEntry.id !== activeId) {
        historyStore.setActiveId(candidateEntry.id);
      }
      hasAppliedInitialHistory.value = true;
      return;
    }

    if (candidateEntry.id !== activeId) {
      historyStore.setActiveId(candidateEntry.id);
    }

    isRestoring.value = true;
    restoringContent.value = candidateEntry.markdown;
    editorStore.setMarkdown(candidateEntry.markdown);
    themeStore.selectTheme(candidateEntry.theme);
    themeStore.setCustomCSS(candidateEntry.customCSS);
    editorStore.setFilePath(candidateEntry.filePath || undefined);
    
    if (candidateEntry.filePath) {
      const last = Math.max(
        candidateEntry.filePath.lastIndexOf("/"),
        candidateEntry.filePath.lastIndexOf("\\")
      );
      if (last >= 0) {
        const dir = candidateEntry.filePath.slice(0, last);
        if (dir) {
          editorStore.setWorkspaceDir(dir);
        }
      }
    }
    
    hasUserEdited.value = false;
    isRestoring.value = false;
    hasAppliedInitialHistory.value = true;
  },
  { immediate: true }
);
</script>

<template>
  <!-- Renderless component -->
</template>
