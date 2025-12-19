<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { Search, Plus, Trash2, MoreHorizontal, Edit2, Copy } from 'lucide-vue-next'
import { useEditorStore } from '../../stores/editor'
import { useThemeStore } from '../../stores/theme'
import { useHistoryStore, type HistorySnapshot } from '../../stores/history'
import './HistoryPanel.css'

const PAGE_SIZE = 50

const historyStore = useHistoryStore()
const editorStore = useEditorStore()
const themeStore = useThemeStore()

const renamingId = ref<string | null>(null)
const tempTitle = ref('未命名文章')
const actionMenuId = ref<string | null>(null)
const menuPosition = ref({ top: 0, left: 0 })
const menuEntry = ref<HistorySnapshot | null>(null)
const visibleCount = ref(PAGE_SIZE)
const loadMoreRef = ref<HTMLDivElement | null>(null)
const showClearConfirm = ref(false)
const clearing = ref(false)
const deleteTarget = ref<HistorySnapshot | null>(null)
const deleting = ref(false)

const history = computed(() => historyStore.history)
const loading = computed(() => historyStore.loading)
const filter = computed({
  get: () => historyStore.filter,
  set: (val) => historyStore.setFilter(val)
})
const activeId = computed(() => historyStore.activeId)
const themeName = computed(() => themeStore.themeName)

const keyword = computed(() => filter.value.trim().toLowerCase())
const filteredHistory = computed(() => {
  if (!keyword.value) return history.value
  return history.value.filter((entry) =>
    (entry.title || '未命名文章').toLowerCase().includes(keyword.value)
  )
})

const visibleHistory = computed(() => filteredHistory.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filteredHistory.value.length)
const hasEntries = computed(() => filteredHistory.value.length > 0)

function loadMore() {
  if (hasMore.value) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filteredHistory.value.length)
  }
}

// Intersection Observer
let observer: IntersectionObserver | null = null

onMounted(() => {
  historyStore.loadHistory()

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value) {
        loadMore()
      }
    },
    { threshold: 0.1 }
  )

  if (loadMoreRef.value) {
    observer.observe(loadMoreRef.value)
  }

  window.addEventListener('click', closeActionMenu)
  window.addEventListener('scroll', closeActionMenu, true)
})

onUnmounted(() => {
  observer?.disconnect()
  window.removeEventListener('click', closeActionMenu)
  window.removeEventListener('scroll', closeActionMenu, true)
})

watch(filter, () => {
  visibleCount.value = PAGE_SIZE
})

async function handleRestore(entry?: HistorySnapshot) {
  if (!entry) return
  await historyStore.persistActiveSnapshot({
    markdown: editorStore.markdown,
    theme: themeStore.themeId,
    customCSS: themeStore.customCSS,
    themeName: themeName.value,
  })
  editorStore.setMarkdown(entry.markdown)
  themeStore.selectTheme(entry.theme)
  themeStore.setCustomCSS(entry.customCSS)
  historyStore.setActiveId(entry.id)
  renamingId.value = null
  actionMenuId.value = null
}

async function handleDelete(id: string) {
  await historyStore.deleteEntry(id)
  if (renamingId.value === id) {
    renamingId.value = null
  }
  if (activeId.value === id) {
    const nextActive = historyStore.activeId
    if (nextActive) {
      const nextEntry = historyStore.history.find((item) => item.id === nextActive)
      if (nextEntry) {
        editorStore.setMarkdown(nextEntry.markdown)
        themeStore.selectTheme(nextEntry.theme)
        themeStore.setCustomCSS(nextEntry.customCSS)
      }
    } else {
      editorStore.resetDocument()
    }
  }
}

async function handleCreateArticle() {
  const initial = '# 新文章\n\n'
  await historyStore.persistActiveSnapshot({
    markdown: editorStore.markdown,
    theme: themeStore.themeId,
    customCSS: themeStore.customCSS,
    themeName: themeName.value,
  })
  editorStore.resetDocument({ markdown: initial, theme: 'default', customCSS: '', themeName: themeName.value })
  const newEntry = await historyStore.saveSnapshot(
    { markdown: initial, theme: 'default', customCSS: '', title: '新文章', themeName: themeName.value },
    { force: true }
  )
  if (newEntry) {
    historyStore.setActiveId(newEntry.id)
  }
  toast.success('已创建新文章')
}

function startRename(entry: HistorySnapshot) {
  renamingId.value = entry.id
  tempTitle.value = entry.title || '未命名文章'
  closeActionMenu()
}

async function confirmRename(entry: HistorySnapshot) {
  await historyStore.updateTitle(entry.id, tempTitle.value)
  toast.success('标题已更新')
  renamingId.value = null
}

async function copyTitle(entry: HistorySnapshot) {
  try {
    await navigator.clipboard.writeText(entry.title || '未命名文章')
    toast.success('标题已复制')
  } catch {
    toast.error('复制失败')
  }
}

function handleMenuToggle(event: MouseEvent, entry: HistorySnapshot) {
  event.stopPropagation()
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const width = 180
  const padding = 12
  const maxLeft = window.innerWidth - width - padding
  const minLeft = padding
  const desiredLeft = rect.right - width
  const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft))
  const top = rect.bottom + 8

  if (actionMenuId.value === entry.id) {
    closeActionMenu()
    return
  }

  actionMenuId.value = entry.id
  menuEntry.value = entry
  menuPosition.value = { top, left }
}

function closeActionMenu() {
  actionMenuId.value = null
  menuEntry.value = null
}
</script>

<template>
  <div class="history-wrapper">
    <aside class="history-sidebar">
      <div class="history-header">
        <h3>历史记录</h3>
        <div class="history-actions">
          <button
            class="btn-secondary btn-icon-only"
            data-tooltip="新增文章"
            @click="handleCreateArticle"
          >
            <Plus :size="16" />
          </button>
          <button
            class="btn-secondary btn-icon-only"
            data-tooltip="清空历史"
            @click="showClearConfirm = true"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
      <div class="history-search">
        <div class="search-wrapper">
          <Search
            :size="14"
            class="search-icon"
          />
          <input
            v-model="filter"
            type="text"
            placeholder="搜索..."
          />
        </div>
      </div>

      <div
        v-if="loading"
        class="history-empty"
      >
        正在加载...
      </div>
      <div
        v-else-if="!hasEntries"
        class="history-empty"
      >
        {{ filter ? '无匹配结果' : '暂无记录' }}
      </div>
      <div
        v-else
        class="history-body"
      >
        <div class="history-list">
          <div
            v-for="entry in visibleHistory"
            :key="entry.id"
            :class="['history-item', { active: activeId === entry.id }]"
            @click="handleRestore(entry)"
          >
            <div class="history-item-main">
              <div class="history-title-block">
                <span class="history-time">{{ new Date(entry.savedAt).toLocaleString() }}</span>
                <div
                  v-if="renamingId === entry.id"
                  class="history-rename"
                  @click.stop
                >
                  <input
                    v-model="tempTitle"
                    autofocus
                  />
                  <button @click="confirmRename(entry)">
                    确认
                  </button>
                  <button @click="renamingId = null">
                    取消
                  </button>
                </div>
                <span
                  v-else
                  class="history-title"
                >{{ entry.title || '未命名文章' }}</span>
                <span class="history-theme">{{ entry.themeName || '未命名主题' }}</span>
              </div>
              <div class="history-actions-menu-wrapper">
                <button
                  class="history-action-trigger"
                  aria-label="操作菜单"
                  @click="handleMenuToggle($event, entry)"
                >
                  <MoreHorizontal :size="16" />
                </button>
              </div>
            </div>
          </div>
          <div
            v-if="hasMore"
            ref="loadMoreRef"
            class="history-load-more"
          >
            <span>加载更多...</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Action Menu -->
    <Teleport to="body">
      <div
        v-if="actionMenuId && menuEntry"
        class="history-action-menu"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
        @click.stop
      >
        <button @click="menuEntry && copyTitle(menuEntry); closeActionMenu()">
          <Copy :size="14" /> 复制标题
        </button>
        <button @click="menuEntry && startRename(menuEntry); closeActionMenu()">
          <Edit2 :size="14" /> 重命名
        </button>
        <button
          class="danger"
          @click="deleteTarget = menuEntry; closeActionMenu()"
        >
          <Trash2 :size="14" /> 删除
        </button>
      </div>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div
        v-if="deleteTarget"
        class="history-confirm-backdrop"
        @click="!deleting && (deleteTarget = null)"
      >
        <div
          class="history-confirm-modal"
          @click.stop
        >
          <h4>删除记录</h4>
          <p>确定要删除"{{ deleteTarget.title || '未命名文章' }}"吗？此操作不可撤销。</p>
          <div class="history-confirm-actions">
            <button
              class="btn-secondary"
              :disabled="deleting"
              @click="deleteTarget = null"
            >
              取消
            </button>
            <button
              class="btn-danger"
              :disabled="deleting"
              @click="async () => { if (!deleteTarget) return; deleting = true; try { await handleDelete(deleteTarget.id); toast.success('已删除该记录'); } finally { deleting = false; deleteTarget = null; } }"
            >
              {{ deleting ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Clear Confirm Modal -->
    <Teleport to="body">
      <div
        v-if="showClearConfirm"
        class="history-confirm-backdrop"
        @click="!clearing && (showClearConfirm = false)"
      >
        <div
          class="history-confirm-modal"
          @click.stop
        >
          <h4>清空历史</h4>
          <p>确定要清空所有历史记录吗？此操作不可撤销。</p>
          <div class="history-confirm-actions">
            <button
              class="btn-secondary"
              :disabled="clearing"
              @click="showClearConfirm = false"
            >
              取消
            </button>
            <button
              class="btn-danger"
              :disabled="clearing"
              @click="async () => { clearing = true; try { await historyStore.clearHistory(); editorStore.resetDocument(); toast.success('历史记录已清空'); } finally { clearing = false; showClearConfirm = false; } }"
            >
              {{ clearing ? '清空中...' : '确认清空' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

