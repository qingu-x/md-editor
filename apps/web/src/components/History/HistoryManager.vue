<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useEditorStore, defaultMarkdown } from '../../stores/editor'
import { useThemeStore } from '../../stores/theme'
import { useHistoryStore } from '../../stores/history'

const AUTO_SAVE_INTERVAL = 10 * 1000 // 10 秒
const UNTITLED_TITLE = '未命名文章'

function deriveTitle(markdown: string) {
  const trimmed = markdown.trim()
  if (!trimmed) return UNTITLED_TITLE
  const headingMatch = trimmed.match(/^(#+)\s*(.+)$/m)
  if (headingMatch) {
    return headingMatch[2].trim().slice(0, 50) || UNTITLED_TITLE
  }
  const firstLine = trimmed.split(/\r?\n/).find((line) => line.trim())
  return firstLine ? firstLine.trim().slice(0, 50) : UNTITLED_TITLE
}

const editorStore = useEditorStore()
const themeStore = useThemeStore()
const historyStore = useHistoryStore()

const latestRef = ref({
  markdown: editorStore.markdown,
  theme: themeStore.themeId,
  customCSS: themeStore.customCSS,
  themeName: themeStore.themeName,
})
const prevMarkdownRef = ref(editorStore.markdown)
const isInitialMountRef = ref(true)
const isRestoringRef = ref(false)
const hasUserEditedRef = ref(false)
const hasAppliedInitialHistoryRef = ref(false)
const creatingInitialSnapshotRef = ref(false)
const hasLoadedHistoryRef = ref(false)
const wasLoadingRef = ref(false)
const restoringContentRef = ref<string | null>(null)

let intervalId: number | null = null

onMounted(() => {
  historyStore.loadHistory()

  intervalId = window.setInterval(() => {
    void persistLatestSnapshot()
  }, AUTO_SAVE_INTERVAL)

  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  if (intervalId) {
    window.clearInterval(intervalId)
  }
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function handleBeforeUnload() {
  void persistLatestSnapshot()
}

async function persistLatestSnapshot() {
  const snapshot = latestRef.value
  if (!snapshot.markdown.trim()) return

  if (!hasUserEditedRef.value || isRestoringRef.value) return

  if (historyStore.loading) return

  if (!historyStore.activeId) {
    if (historyStore.history.length === 0) {
      await historyStore.saveSnapshot(
        {
          markdown: snapshot.markdown,
          theme: snapshot.theme,
          customCSS: snapshot.customCSS,
          title: deriveTitle(snapshot.markdown),
          themeName: snapshot.themeName,
        },
        { force: true }
      )
    }
    return
  }

  await historyStore.persistActiveSnapshot({
    markdown: snapshot.markdown,
    theme: snapshot.theme,
    customCSS: snapshot.customCSS,
    themeName: snapshot.themeName,
  })
}

// 跟踪加载生命周期
watch(
  () => historyStore.loading,
  (loading) => {
    if (loading) {
      wasLoadingRef.value = true
    } else if (wasLoadingRef.value) {
      hasLoadedHistoryRef.value = true
    }
  },
  { immediate: true }
)

// 监听编辑器内容变化
watch(
  () => [editorStore.markdown, themeStore.themeId, themeStore.customCSS, themeStore.themeName] as const,
  ([markdown, theme, customCSS, themeName]) => {
    latestRef.value = { markdown, theme, customCSS, themeName }

    const markdownChanged = markdown !== prevMarkdownRef.value
    prevMarkdownRef.value = markdown

    if (isInitialMountRef.value) {
      isInitialMountRef.value = false
      return
    }

    if (restoringContentRef.value !== null && markdown === restoringContentRef.value) {
      restoringContentRef.value = null
      return
    }

    if (markdownChanged && !isRestoringRef.value && !historyStore.loading && hasLoadedHistoryRef.value) {
      hasUserEditedRef.value = true
    }

    if (creatingInitialSnapshotRef.value) return

    if (!historyStore.activeId && historyStore.history.length === 0 && markdown.trim()) {
      creatingInitialSnapshotRef.value = true
      historyStore.saveSnapshot(
        { markdown, theme, customCSS, title: deriveTitle(markdown), themeName },
        { force: true }
      ).then(() => {
        creatingInitialSnapshotRef.value = false
      }).catch(() => {
        creatingInitialSnapshotRef.value = false
      })
    }
  }
)

// 监听历史记录变化，恢复内容
watch(
  () => [historyStore.history, historyStore.activeId] as const,
  ([history, activeId]) => {
    if (!history.length) {
      hasAppliedInitialHistoryRef.value = false
      if (hasLoadedHistoryRef.value) {
        const latest = latestRef.value
        if (latest.markdown !== defaultMarkdown) {
          editorStore.setMarkdown(defaultMarkdown)
        }
      }
      return
    }

    const candidateEntry = history.find((entry) => entry.id === activeId) ?? history[0]
    if (!candidateEntry) return

    const latest = latestRef.value
    const matchesLatest =
      latest.markdown === candidateEntry.markdown &&
      latest.theme === candidateEntry.theme &&
      latest.customCSS === candidateEntry.customCSS &&
      latest.themeName === candidateEntry.themeName

    if (matchesLatest) {
      if (candidateEntry.id !== activeId) {
        historyStore.setActiveId(candidateEntry.id)
      }
      hasAppliedInitialHistoryRef.value = true
      return
    }

    if (candidateEntry.id !== activeId) {
      historyStore.setActiveId(candidateEntry.id)
    }

    isRestoringRef.value = true
    restoringContentRef.value = candidateEntry.markdown
    editorStore.setMarkdown(candidateEntry.markdown)
    themeStore.selectTheme(candidateEntry.theme)
    themeStore.setCustomCSS(candidateEntry.customCSS)
    editorStore.setFilePath(candidateEntry.filePath)

    if (candidateEntry.filePath) {
      const last = Math.max(candidateEntry.filePath.lastIndexOf('/'), candidateEntry.filePath.lastIndexOf('\\'))
      if (last >= 0) {
        const dir = candidateEntry.filePath.slice(0, last)
        if (dir) {
          editorStore.setWorkspaceDir(dir)
        }
      }
    }

    latestRef.value = {
      markdown: candidateEntry.markdown,
      theme: candidateEntry.theme,
      customCSS: candidateEntry.customCSS,
      themeName: candidateEntry.themeName,
    }
    hasUserEditedRef.value = false
    isRestoringRef.value = false
    hasAppliedInitialHistoryRef.value = true
  }
)
</script>

<template>
  <div style="display: none"></div>
</template>

