<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useFileSystem } from '../../composables/useFileSystem'
import { useThemeStore } from '../../stores/theme'
import { useFileStore } from '../../stores/file'
import { Search, Plus, Trash2, FolderOpen, Edit2, MoreHorizontal, Copy } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { FileItem } from '../../store/fileTypes'
import './FileSidebar.css'

const PAGE_SIZE = 50

const { openFile, createFile, renameFile, deleteFile, selectWorkspace, workspacePath } = useFileSystem()
const themeStore = useThemeStore()
const fileStore = useFileStore()

const currentThemeName = computed(() => themeStore.themeName)
const filter = ref('')
const renamingPath = ref<string | null>(null)
const renameValue = ref('')
const visibleCount = ref(PAGE_SIZE)
const loadMoreRef = ref<HTMLDivElement | null>(null)

// 右键菜单状态
const menuOpen = ref(false)
const menuPos = ref({ x: 0, y: 0 })
const menuTarget = ref<FileItem | null>(null)
const deleteTarget = ref<FileItem | null>(null)
const deleting = ref(false)

const filteredFiles = computed(() => {
  const fileList = fileStore.files
  if (!filter.value) return fileList
  return fileList.filter(f => f.name.toLowerCase().includes(filter.value.toLowerCase()))
})

const visibleFiles = computed(() => filteredFiles.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filteredFiles.value.length)

function loadMore() {
  if (hasMore.value) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filteredFiles.value.length)
  }
}

// Intersection Observer
let observer: IntersectionObserver | null = null

onMounted(() => {
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
})

onUnmounted(() => {
  observer?.disconnect()
})

watch(filter, () => {
  visibleCount.value = PAGE_SIZE
})

function handleContextMenu(e: MouseEvent, file: FileItem) {
  e.preventDefault()
  e.stopPropagation()
  menuTarget.value = file
  menuPos.value = { x: e.clientX, y: e.clientY }
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
  menuTarget.value = null
}

function startRename(file: FileItem) {
  renamingPath.value = file.path
  renameValue.value = file.name.replace('.md', '')
  closeMenu()
}

async function copyTitle(file: FileItem) {
  try {
    const title = file.name.replace('.md', '')
    await navigator.clipboard.writeText(title)
    toast.success('标题已复制')
  } catch {
    toast.error('复制失败')
  }
  closeMenu()
}

async function submitRename() {
  if (renamingPath.value && renameValue.value) {
    const file = fileStore.files.find(f => f.path === renamingPath.value)
    if (file) {
      await renameFile(file, renameValue.value)
    }
  }
  renamingPath.value = null
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteFile(deleteTarget.value)
  } finally {
    deleting.value = false
    deleteTarget.value = null
    closeMenu()
  }
}
</script>

<template>
  <aside class="file-sidebar">
    <div class="fs-header">
      <div
        class="fs-workspace-info"
        :title="workspacePath || '选择工作区'"
        @click="selectWorkspace"
      >
        <FolderOpen :size="14" />
        <span>{{ workspacePath ? workspacePath.split('/').pop() : '选择工作区' }}</span>
      </div>
      <div class="fs-actions">
        <button
          class="fs-btn-secondary fs-btn-icon-only"
          title="新建文章"
          @click="createFile"
        >
          <Plus :size="16" />
        </button>
      </div>
    </div>

    <div class="fs-search">
      <div class="fs-search-wrapper">
        <Search
          :size="14"
          class="fs-search-icon"
        />
        <input
          v-model="filter"
          type="text"
          placeholder="搜索文件..."
        />
      </div>
    </div>

    <div class="fs-body">
      <div class="fs-list">
        <div
          v-for="file in visibleFiles"
          :key="file.path"
          :class="['fs-item', { active: fileStore.currentFile?.path === file.path }]"
          @click="openFile(file)"
          @contextmenu="handleContextMenu($event, file)"
        >
          <div class="fs-item-main">
            <div class="fs-title-block">
              <span class="fs-time">{{ new Date(file.updatedAt).toLocaleString() }}</span>
              <div
                v-if="renamingPath === file.path"
                class="fs-rename"
                @click.stop
              >
                <input
                  v-model="renameValue"
                  autofocus
                  @keydown.enter="submitRename"
                  @keydown.escape="renamingPath = null"
                />
                <button @click="submitRename">
                  确认
                </button>
                <button @click="renamingPath = null">
                  取消
                </button>
              </div>
              <template v-else>
                <span
                  class="fs-title"
                  :title="file.name"
                >{{ file.name }}</span>
                <span class="fs-theme-info">
                  {{ fileStore.currentFile?.path === file.path ? currentThemeName : (file.themeName || '默认主题') }}
                </span>
              </template>
            </div>
            <button
              class="fs-action-trigger"
              @click.stop="handleContextMenu($event, file)"
            >
              <MoreHorizontal :size="16" />
            </button>
          </div>
        </div>

        <div
          v-if="hasMore"
          ref="loadMoreRef"
          class="fs-load-more"
        >
          <span>加载更多...</span>
        </div>
        <div
          v-if="filteredFiles.length === 0"
          class="fs-empty"
        >
          暂无文件
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="menuOpen"
        class="fs-context-menu-overlay"
        @click="closeMenu"
      >
        <div
          class="fs-context-menu"
          :style="{ top: menuPos.y + 'px', left: menuPos.x + 'px' }"
        >
          <button @click="copyTitle(menuTarget!)">
            <Copy :size="14" /> 复制标题
          </button>
          <button @click="startRename(menuTarget!)">
            <Edit2 :size="14" /> 重命名
          </button>
          <button
            class="danger"
            @click="deleteTarget = menuTarget; closeMenu()"
          >
            <Trash2 :size="14" /> 删除
          </button>
        </div>
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
          <h4>删除文件</h4>
          <p>确定要删除"{{ deleteTarget.name }}"吗？此操作不可撤销。</p>
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
              @click="confirmDelete"
            >
              {{ deleting ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

