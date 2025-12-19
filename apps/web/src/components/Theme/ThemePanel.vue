<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Copy, Trash2, X, AlertTriangle } from 'lucide-vue-next'
import { createMarkdownParser, processHtml, convertCssToWeChatDarkMode } from '@wemd/core'
import { useEditorStore } from '../../stores/editor'
import { useThemeStore } from '../../stores/theme'
import { useHistoryStore } from '../../stores/history'
import { useUIThemeStore } from '../../stores/uiTheme'
import './ThemePanel.css'

const PREVIEW_MARKDOWN = `# 标题示例

这是一段**加粗文本**和*斜体文本*。

## 二级标题

> 这是一段引用文本

- 列表项 1
- 列表项 2

\`\`\`js
const hello = "world";
\`\`\`
`

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const editorStore = useEditorStore()
const themeStore = useThemeStore()
const historyStore = useHistoryStore()
const uiThemeStore = useUIThemeStore()

const isElectron = computed(() => typeof window !== 'undefined' && !!(window as unknown as { electron?: unknown }).electron)

const selectedThemeId = ref('')
const nameInput = ref('')
const cssInput = ref('')
const isCreating = ref(false)
const showDeleteConfirm = ref(false)

const allThemes = computed(() => themeStore.getAllThemes())
const selectedTheme = computed(() => allThemes.value.find((t) => t.id === selectedThemeId.value))
const isCustomTheme = computed(() => selectedTheme.value && !selectedTheme.value.isBuiltIn)
const builtInThemes = computed(() => allThemes.value.filter((t) => t.isBuiltIn))
const customThemes = computed(() => allThemes.value.filter((t) => !t.isBuiltIn))

// 实时预览
const parser = createMarkdownParser()
const isDarkMode = computed(() => uiThemeStore.theme === 'dark')

const previewHtml = computed(() => {
  const rawHtml = parser.render(PREVIEW_MARKDOWN)
  const finalCss = isDarkMode.value ? convertCssToWeChatDarkMode(cssInput.value) : cssInput.value
  return processHtml(rawHtml, finalCss, true)
})

const iframeContent = computed(() => {
  const bgColor = isDarkMode.value ? '#252526' : '#fff'
  const textColor = isDarkMode.value ? '#d4d4d4' : '#000'
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; font-size: 14px; line-height: 1.6; background: ${bgColor}; color: ${textColor}; }</style></head><body>${previewHtml.value}</body></html>`
})

watch(() => props.open, (open) => {
  if (open) {
    const currentTheme = allThemes.value.find((t) => t.id === themeStore.themeId)
    if (currentTheme) {
      selectedThemeId.value = currentTheme.id
      nameInput.value = currentTheme.name
      cssInput.value = currentTheme.css
    }
    isCreating.value = false
    showDeleteConfirm.value = false
  }
})

function handleSelectTheme(themeId: string) {
  const theme = allThemes.value.find((t) => t.id === themeId)
  if (!theme) return
  selectedThemeId.value = themeId
  nameInput.value = theme.name
  cssInput.value = theme.css
  isCreating.value = false
  showDeleteConfirm.value = false
}

function handleCreateNew() {
  isCreating.value = true
  selectedThemeId.value = ''
  nameInput.value = ''
  cssInput.value = ''
  showDeleteConfirm.value = false
}

async function handleApply() {
  themeStore.selectTheme(selectedThemeId.value)
  if (!isElectron.value) {
    await historyStore.persistActiveSnapshot({
      markdown: editorStore.markdown,
      theme: selectedThemeId.value,
      customCSS: '',
      themeName: selectedTheme.value?.name || '默认主题',
    })
  }
  emit('close')
}

async function handleSave() {
  if (isCreating.value) {
    const newTheme = themeStore.createTheme(nameInput.value, cssInput.value)
    themeStore.selectTheme(newTheme.id)
    if (!isElectron.value) {
      await historyStore.persistActiveSnapshot({
        markdown: editorStore.markdown,
        theme: newTheme.id,
        customCSS: '',
        themeName: newTheme.name,
      })
    }
    selectedThemeId.value = newTheme.id
    isCreating.value = false
    toast.success('主题创建成功')
  } else if (isCustomTheme.value) {
    themeStore.updateTheme(selectedThemeId.value, {
      name: nameInput.value.trim() || '未命名主题',
      css: cssInput.value,
    })
    if (!isElectron.value && themeStore.themeId === selectedThemeId.value) {
      await historyStore.persistActiveSnapshot({
        markdown: editorStore.markdown,
        theme: selectedThemeId.value,
        customCSS: '',
        themeName: nameInput.value.trim() || '未命名主题',
      })
    }
    toast.success('主题已保存')
  }
}

function handleConfirmDelete() {
  if (!isCustomTheme.value) return
  themeStore.deleteTheme(selectedThemeId.value)
  themeStore.selectTheme('default')
  handleSelectTheme('default')
  showDeleteConfirm.value = false
  toast.success('主题已删除')
}

function handleDuplicate() {
  if (!selectedTheme.value) return
  const newName = `${selectedTheme.value.name} (副本)`
  const duplicated = themeStore.duplicateTheme(selectedThemeId.value, newName)
  handleSelectTheme(duplicated.id)
  toast.success('主题已复制')
}
</script>

<template>
  <div
    v-if="open"
    class="theme-overlay"
    @click="emit('close')"
  >
    <div
      class="theme-modal"
      @click.stop
    >
      <div class="theme-header">
        <h3>主题管理</h3>
        <button
          class="close-btn"
          aria-label="关闭"
          @click="emit('close')"
        >
          <X :size="20" />
        </button>
      </div>

      <div class="theme-body">
        <div class="theme-sidebar">
          <button
            class="btn-new-theme"
            @click="handleCreateNew"
          >
            <Plus :size="16" /> 新建自定义主题
          </button>

          <div class="theme-list-scroll">
            <div
              v-if="customThemes.length > 0"
              class="theme-group"
            >
              <div class="theme-group-title">
                自定义主题
              </div>
              <button
                v-for="item in customThemes"
                :key="item.id"
                :class="['theme-item', { active: item.id === selectedThemeId }]"
                @click="handleSelectTheme(item.id)"
              >
                {{ item.name }}
              </button>
            </div>

            <div class="theme-group">
              <div class="theme-group-title">
                内置主题
              </div>
              <button
                v-for="item in builtInThemes"
                :key="item.id"
                :class="['theme-item', { active: item.id === selectedThemeId }]"
                @click="handleSelectTheme(item.id)"
              >
                {{ item.name }}
              </button>
            </div>
          </div>
        </div>

        <div
          class="theme-editor"
          style="position: relative"
        >
          <div
            v-if="showDeleteConfirm"
            class="delete-confirm-overlay"
          >
            <div class="delete-confirm-box">
              <div class="confirm-icon-wrapper">
                <AlertTriangle
                  :size="24"
                  color="#ef4444"
                />
              </div>
              <h4>确认删除</h4>
              <p>确定要删除主题 "{{ selectedTheme?.name }}" 吗？此操作无法撤销。</p>
              <div class="delete-confirm-actions">
                <button
                  class="btn-secondary"
                  @click="showDeleteConfirm = false"
                >
                  取消
                </button>
                <button
                  class="btn-primary"
                  style="background: #ef4444; box-shadow: none"
                  @click="handleConfirmDelete"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>

          <div class="theme-form">
            <div class="theme-form-preview">
              <div class="theme-live-preview">
                <div class="preview-header-mini">
                  <span>实时预览</span>
                </div>
                <iframe
                  class="preview-iframe"
                  :srcdoc="iframeContent"
                  title="主题预览"
                  sandbox="allow-same-origin"
                ></iframe>
              </div>
            </div>

            <div class="theme-form-fields">
              <label>主题名称</label>
              <input
                v-model="nameInput"
                placeholder="输入主题名称..."
                :disabled="!isCreating && !isCustomTheme"
              />

              <label>CSS 样式</label>
              <textarea
                v-model="cssInput"
                placeholder="输入 CSS 样式代码..."
                spellcheck="false"
                :disabled="!isCreating && !isCustomTheme"
              ></textarea>

              <p
                v-if="!isCreating && !isCustomTheme"
                class="info-hint"
              >
                💡 内置主题不可编辑，点击"复制"按钮可以基于此主题创建自定义主题
              </p>
            </div>
          </div>

          <div class="theme-actions">
            <template v-if="isCreating">
              <button
                class="btn-secondary"
                @click="isCreating = false; handleSelectTheme(themeStore.themeId)"
              >
                取消
              </button>
              <button
                class="btn-primary"
                :disabled="!nameInput.trim() || !cssInput.trim()"
                @click="handleSave"
              >
                保存新主题
              </button>
            </template>
            <template v-else-if="isCustomTheme">
              <button
                class="btn-icon-text"
                @click="handleDuplicate"
              >
                <Copy :size="16" /> 复制
              </button>
              <button
                class="btn-icon-text btn-danger"
                @click="showDeleteConfirm = true"
              >
                <Trash2 :size="16" /> 删除
              </button>
              <div class="flex-spacer"></div>
              <button
                class="btn-secondary"
                @click="emit('close')"
              >
                取消
              </button>
              <button
                class="btn-primary"
                @click="handleSave"
              >
                保存修改
              </button>
              <button
                class="btn-primary"
                @click="handleApply"
              >
                应用主题
              </button>
            </template>
            <template v-else>
              <button
                class="btn-icon-text"
                @click="handleDuplicate"
              >
                <Copy :size="16" /> 复制
              </button>
              <div class="flex-spacer"></div>
              <button
                class="btn-secondary"
                @click="emit('close')"
              >
                取消
              </button>
              <button
                class="btn-primary"
                @click="handleApply"
              >
                应用主题
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

