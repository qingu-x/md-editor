<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import { EditorView, minimalSetup } from 'codemirror'
import { keymap } from '@codemirror/view'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState, Prec } from '@codemirror/state'
import { githubLight } from '@uiw/codemirror-theme-github'
import { wechatMarkdownHighlighting, wechatMarkdownHighlightingDark } from './markdownTheme'
import { useUIThemeStore } from '../../stores/uiTheme'
import { useEditorStore } from '../../stores/editor'
import { countWords, countLines } from '../../utils/wordCount'
import { rafThrottle } from '../../utils/performance'
import Toolbar from './Toolbar.vue'
import SearchPanel from './SearchPanel.vue'
import { toast } from 'vue-sonner'
import './MarkdownEditor.css'

const SYNC_SCROLL_EVENT = 'wemd-sync-scroll'

interface SyncScrollDetail {
  source: 'editor' | 'preview'
  ratio: number
}

// 辅助函数：用 prefix/suffix 包裹选中文本
function wrapSelection(view: EditorView, prefix: string, suffix: string): boolean {
  const selection = view.state.selection.main
  const selectedText = view.state.doc.sliceString(selection.from, selection.to)
  const wrapped = prefix + (selectedText || '文本') + suffix

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: wrapped },
    selection: selectedText
      ? { anchor: selection.from, head: selection.from + wrapped.length }
      : { anchor: selection.from + prefix.length, head: selection.from + prefix.length + 2 }
  })
  return true
}

// Markdown 格式化快捷键
const markdownKeymap = Prec.highest(keymap.of([
  { key: 'Mod-b', run: (view) => wrapSelection(view, '**', '**') },
  { key: 'Mod-i', run: (view) => wrapSelection(view, '*', '*') },
]))

const editorRef = ref<HTMLDivElement | null>(null)
const viewRef = shallowRef<EditorView | null>(null)
const showSearch = ref(false)
const isSyncingRef = ref(false)

const editorStore = useEditorStore()
const uiThemeStore = useUIThemeStore()

const content = computed(() => editorStore.markdown)
const uiTheme = computed(() => uiThemeStore.theme)

const wordCount = computed(() => countWords(content.value))
const lineCount = computed(() => countLines(content.value))

// Cmd/Ctrl+F 打开搜索面板
function handleKeyDown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault()
    showSearch.value = true
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  initEditor()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (viewRef.value) {
    viewRef.value.destroy()
  }
})

function initEditor() {
  if (!editorRef.value) return

  // 主题切换时使用当前内容，首次加载时使用 store 中的内容
  const currentContent = viewRef.value
    ? viewRef.value.state.doc.toString()
    : content.value

  const startState = EditorState.create({
    doc: currentContent,
    extensions: [
      minimalSetup,
      markdownKeymap,
      markdown({ base: markdownLanguage }),
      uiTheme.value === 'dark' ? wechatMarkdownHighlightingDark : wechatMarkdownHighlighting,
      githubLight,
      EditorView.lineWrapping,
      EditorView.domEventHandlers({
        paste: handlePaste
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString()
          editorStore.setMarkdown(newContent)
        }
      }),
      EditorView.theme({
        '&': { height: '100%', fontSize: '15px' },
        '.cm-scroller': {
          fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
          lineHeight: '1.6',
        },
        '.cm-content': { padding: '16px' },
        '.cm-gutters': { backgroundColor: '#f8f9fa', border: 'none' },
      }),
    ],
  })

  const view = new EditorView({
    state: startState,
    parent: editorRef.value,
  })

  setupScrollSync(view)
  viewRef.value = view
}

function setupScrollSync(view: EditorView) {
  const scrollDOM = view.scrollDOM

  // 使用 RAF 节流优化滚动性能
  const handleEditorScroll = rafThrottle(() => {
    if (isSyncingRef.value) {
      isSyncingRef.value = false
      return
    }
    const max = scrollDOM.scrollHeight - scrollDOM.clientHeight
    if (max <= 0) return
    const ratio = scrollDOM.scrollTop / max
    window.dispatchEvent(
      new CustomEvent<SyncScrollDetail>(SYNC_SCROLL_EVENT, {
        detail: { source: 'editor', ratio },
      })
    )
  })

  const handleSync = (event: Event) => {
    const customEvent = event as CustomEvent<SyncScrollDetail>
    const detail = customEvent.detail
    if (!detail || detail.source === 'editor') return
    const max = scrollDOM.scrollHeight - scrollDOM.clientHeight
    if (max <= 0) return
    isSyncingRef.value = true
    scrollDOM.scrollTo({ top: detail.ratio * max })
  }

  scrollDOM.addEventListener('scroll', handleEditorScroll)
  window.addEventListener(SYNC_SCROLL_EVENT, handleSync)
}

function handlePaste(event: ClipboardEvent, view: EditorView) {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (!file) continue

      const MAX_SIZE_MB = 2
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
      if (file.size > MAX_SIZE_BYTES) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1)
        toast.error(`请压缩图片后再试，公众号不支持超过 2MB 的图片外链(当前 ${sizeMB}MB)`, { duration: 4000 })
        continue
      }

      uploadImage(file, view)
    }
  }
}

async function uploadImage(file: File, view: EditorView) {
  const loadingText = `![上传中... ${file.name}]()`
  const range = view.state.selection.main
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: loadingText }
  })

  try {
    const saved = localStorage.getItem('imageHostConfig')
    const imageHostConfig = saved ? JSON.parse(saved) : { type: 'official' }
    const { ImageHostManager } = await import('../../services/image/ImageUploader')
    const manager = new ImageHostManager(imageHostConfig)
    const url = await manager.upload(file)

    const imageText = `![](${url})`
    const currentDoc = view.state.doc.toString()
    const index = currentDoc.indexOf(loadingText)

    if (index !== -1) {
      view.dispatch({
        changes: { from: index, to: index + loadingText.length, insert: imageText }
      })
    }
    toast.success('图片上传成功')
  } catch (err) {
    const currentDoc = view.state.doc.toString()
    const index = currentDoc.indexOf(loadingText)
    if (index !== -1) {
      view.dispatch({
        changes: { from: index, to: index + loadingText.length, insert: '' }
      })
    }
    toast.error(`上传失败: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// 监听主题变化，重建编辑器
watch(uiTheme, () => {
  if (viewRef.value) {
    viewRef.value.destroy()
    viewRef.value = null
  }
  initEditor()
})

// 监听外部内容变化
watch(content, (newContent) => {
  const view = viewRef.value
  if (!view) return
  const currentDoc = view.state.doc.toString()
  if (currentDoc === newContent) return
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newContent },
  })
})

// 处理工具栏文本插入
function handleInsert(prefix: string, suffix: string, placeholder: string) {
  const view = viewRef.value
  if (!view) return

  const selection = view.state.selection.main
  const selectedText = view.state.doc.sliceString(selection.from, selection.to)
  const textToInsert = selectedText || placeholder
  const fullText = prefix + textToInsert + suffix

  view.dispatch({
    changes: { from: selection.from, to: selection.to, insert: fullText },
    selection: {
      anchor: selection.from + prefix.length,
      head: selection.from + prefix.length + textToInsert.length
    }
  })

  view.focus()
}
</script>

<template>
  <div class="markdown-editor">
    <div class="editor-header">
      <span class="editor-title">Markdown 编辑器</span>
    </div>
    <Toolbar @insert="handleInsert" />
    <SearchPanel
      v-if="showSearch && viewRef"
      :view="viewRef"
      @close="showSearch = false"
    />
    <div class="editor-body-wrapper">
      <div
        ref="editorRef"
        class="editor-container"
      ></div>
    </div>
    <div class="editor-footer">
      <span class="editor-stat">行数: {{ lineCount }}</span>
      <span class="editor-stat">字数: {{ wordCount }}</span>
    </div>
  </div>
</template>

