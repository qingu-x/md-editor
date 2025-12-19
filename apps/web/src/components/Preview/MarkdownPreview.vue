<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { createMarkdownParser, processHtml } from '@wemd/core'
import { useEditorStore } from '../../stores/editor'
import { useThemeStore } from '../../stores/theme'
import { useUIThemeStore } from '../../stores/uiTheme'
import { hasMathFormula, renderMathInElement } from '../../utils/katexRenderer'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { debounce, rafThrottle } from '../../utils/performance'
import './MarkdownPreview.css'

const SYNC_SCROLL_EVENT = 'wemd-sync-scroll'

interface SyncScrollDetail {
  source: 'editor' | 'preview'
  ratio: number
}

const editorStore = useEditorStore()
const themeStore = useThemeStore()
const uiThemeStore = useUIThemeStore()

const previewRef = ref<HTMLDivElement | null>(null)
const scrollContainerRef = ref<HTMLDivElement | null>(null)
const isSyncingRef = ref(false)

const markdown = computed(() => editorStore.markdown)
const theme = computed(() => themeStore.themeId)
const customCSS = computed(() => themeStore.customCSS)
const customThemes = computed(() => themeStore.customThemes)
const uiTheme = computed(() => uiThemeStore.theme)

// 缓存 parser 实例
const parser = createMarkdownParser()

const html = ref('')
const themeCSS = ref('')

// 渲染 HTML 的函数
const renderHTML = () => {
  const rawHtml = parser.render(markdown.value)
  const isDarkMode = uiTheme.value === 'dark'
  const css = themeStore.getThemeCSS(theme.value, isDarkMode)
  // 预览模式不使用内联样式,直接注入 style 标签
  const styledHtml = processHtml(rawHtml, css, false)
  // 使用 DOMPurify 清理 HTML,防止 XSS 攻击
  html.value = sanitizeHtml(styledHtml)
  // 保存 CSS 用于动态注入
  themeCSS.value = css
}

// 防抖渲染 - Markdown 内容变化时使用防抖
const debouncedRender = debounce(renderHTML, 150)

// 计算 HTML - Markdown 变化时防抖,主题变化时立即渲染
watch(markdown, debouncedRender)
watch([theme, customCSS, customThemes, uiTheme], renderHTML, { immediate: true, deep: true })

// KaTeX 渲染
watch(html, () => {
  if (!previewRef.value || !html.value) return

  // 检测是否包含数学公式
  if (!hasMathFormula(markdown.value)) return

  // 延迟渲染，避免频繁触发
  const timer = setTimeout(() => {
    if (previewRef.value) {
      renderMathInElement(previewRef.value)
    }
  }, 100)

  return () => clearTimeout(timer)
})

// 处理预览栏滚动事件 - 使用 RAF 节流优化性能
const handlePreviewScroll = rafThrottle(() => {
  if (isSyncingRef.value || !scrollContainerRef.value) return

  const container = scrollContainerRef.value
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight - container.clientHeight

  if (scrollHeight <= 0) return

  const ratio = scrollTop / scrollHeight

  // 发送同步事件给编辑器
  const event = new CustomEvent<SyncScrollDetail>(SYNC_SCROLL_EVENT, {
    detail: { source: 'preview', ratio },
  })
  window.dispatchEvent(event)
})

// 接收编辑器的同步事件
function handleSync(event: Event) {
  const customEvent = event as CustomEvent<SyncScrollDetail>
  const { source, ratio } = customEvent.detail

  if (source === 'preview' || !scrollContainerRef.value) return

  const container = scrollContainerRef.value
  const scrollHeight = container.scrollHeight - container.clientHeight

  if (scrollHeight <= 0) return

  isSyncingRef.value = true
  container.scrollTop = scrollHeight * ratio

  setTimeout(() => {
    isSyncingRef.value = false
  }, 100)
}

// 动态注入样式
let styleElement: HTMLStyleElement | null = null

watch(
  themeCSS,
  (css) => {
    if (!css) return

    // 移除旧的 style 元素
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement)
    }

    // 创建新的 style 元素
    styleElement = document.createElement('style')
    styleElement.textContent = css
    styleElement.setAttribute('data-wemd-theme', 'true')
    document.head.appendChild(styleElement)
  },
  { immediate: true }
)

onMounted(() => {
  const container = scrollContainerRef.value
  if (container) {
    container.addEventListener('scroll', handlePreviewScroll)
  }
  window.addEventListener(SYNC_SCROLL_EVENT, handleSync)
})

onUnmounted(() => {
  const container = scrollContainerRef.value
  if (container) {
    container.removeEventListener('scroll', handlePreviewScroll)
  }
  window.removeEventListener(SYNC_SCROLL_EVENT, handleSync)

  // 清理样式元素
  if (styleElement && styleElement.parentNode) {
    styleElement.parentNode.removeChild(styleElement)
    styleElement = null
  }
})
</script>

<template>
  <div class="markdown-preview">
    <div class="preview-header">
      <span class="preview-title">实时预览</span>
      <span class="preview-subtitle">微信排版效果</span>
    </div>
    <div
      ref="scrollContainerRef"
      class="preview-container"
      @scroll="handlePreviewScroll"
    >
      <div class="preview-content">
        <!-- HTML 已通过 DOMPurify 清理,防止 XSS 攻击 -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          ref="previewRef"
          v-html="html"
        ></div>
        <!-- eslint-enable vue/no-v-html -->
      </div>
    </div>
  </div>
</template>
