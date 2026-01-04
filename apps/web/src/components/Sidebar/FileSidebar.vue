<template>
  <aside class="file-sidebar">
    <div class="fs-header">
      <div
        class="fs-workspace-info"
        @click="selectWorkspace"
        :title="workspacePath || '选择工作区'"
      >
        <FolderOpen :size="14" />
        <span>
          {{ workspacePath ? workspacePath.split("/").pop() : "选择工作区" }}
        </span>
      </div>
      <div class="fs-actions">
        <button
          class="fs-btn-secondary fs-btn-icon-only"
          @click="createFile"
          title="新建文章"
        >
          <Plus :size="16" />
        </button>
      </div>
    </div>

    <div class="fs-search">
      <div class="fs-search-wrapper">
        <Search :size="14" class="fs-search-icon" />
        <input
          type="text"
          placeholder="搜索文件..."
          v-model="filter"
        />
      </div>
    </div>

    <div class="fs-body">
      <div class="fs-list">
        <div
          v-for="file in visibleFiles"
          :key="file.path"
          :class="['fs-item', currentFile?.path === file.path ? 'active' : '']"
          @click="openFile(file)"
          @contextmenu.prevent="handleContextMenu($event, file)"
        >
          <div class="fs-item-main">
            <div class="fs-title-block">
              <span class="fs-time">
                {{ new Date(file.updatedAt).toLocaleString() }}
              </span>
              <div
                v-if="renamingPath === file.path"
                class="fs-rename"
                @click.stop
              >
                <input
                  v-model="renameValue"
                  @keydown.enter="submitRename"
                  @keydown.esc="renamingPath = null"
                  v-focus
                />
                <button @click="submitRename">确认</button>
                <button @click="renamingPath = null">取消</button>
              </div>
              <span v-else class="fs-title" :title="file.name">
                {{ file.name }}
              </span>
              <span v-if="renamingPath !== file.path" class="fs-theme-info">
                {{ currentFile?.path === file.path ? currentThemeName : (file.themeName || "默认主题") }}
              </span>
            </div>
            <button
              class="fs-action-trigger"
              @click.stop="handleContextMenu($event, file)"
            >
              <MoreHorizontal :size="16" />
            </button>
          </div>
        </div>

        <!-- 无限滚动触发器 -->
        <div v-if="hasMore" ref="loadMoreRef" class="fs-load-more">
          <span>加载更多...</span>
        </div>
        <div v-if="filteredFiles.length === 0" class="fs-empty">暂无文件</div>
      </div>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div v-if="menuOpen" class="fs-context-menu-overlay" @click="closeMenu">
        <div
          class="fs-context-menu"
          :style="{ top: menuPos.y + 'px', left: menuPos.x + 'px' }"
        >
          <button @click="copyTitleAction">
            <Copy :size="14" /> 复制标题
          </button>
          <button @click="startRenameAction">
            <Edit2 :size="14" /> 重命名
          </button>
          <button class="danger" @click="confirmDelete">
            <Trash2 :size="14" /> 删除
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="history-confirm-backdrop" @click="!deleting && (deleteTarget = null)">
        <div class="history-confirm-modal" @click.stop>
          <h4>删除文件</h4>
          <p>确定要删除“{{ deleteTarget.name }}”吗？此操作不可撤销。</p>
          <div class="history-confirm-actions">
            <button class="btn-secondary" @click="deleteTarget = null" :disabled="deleting">取消</button>
            <button class="btn-danger" @click="handleDelete" :disabled="deleting">
              {{ deleting ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useFileSystem } from "../../hooks/useFileSystem";
import { toast } from "../../hooks/useToast";
import { useThemeStore } from "../../store/themeStore";
import {
  Search,
  Plus,
  Trash2,
  FolderOpen,
  Edit2,
  MoreHorizontal,
  Copy,
} from "lucide-vue-next";
import type { FileItem } from "../../store/fileTypes";

const PAGE_SIZE = 50;

const {
  files,
  currentFile,
  openFile,
  createFile,
  renameFile,
  deleteFile,
  selectWorkspace,
  workspacePath,
} = useFileSystem();

const themeStore = useThemeStore();
const currentThemeName = computed(() => themeStore.themeName);

const filter = ref("");
const renamingPath = ref<string | null>(null);
const renameValue = ref("");
const visibleCount = ref(PAGE_SIZE);
const loadMoreRef = ref<HTMLElement | null>(null);

const menuOpen = ref(false);
const menuPos = ref({ x: 0, y: 0 });
const menuTarget = ref<FileItem | null>(null);
const deleteTarget = ref<FileItem | null>(null);
const deleting = ref(false);

const filteredFiles = computed(() => {
  if (!filter.value) return files.value;
  return (files.value || []).filter((f: FileItem) =>
    f.name.toLowerCase().includes(filter.value.toLowerCase())
  );
});

const visibleFiles = computed(() => {
  return filteredFiles.value.slice(0, visibleCount.value);
});

const hasMore = computed(() => {
  return visibleCount.value < filteredFiles.value.length;
});

const loadMore = () => {
  if (hasMore.value) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filteredFiles.value.length);
  }
};

let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value) {
        loadMore();
      }
    },
    { threshold: 0.1 }
  );

  watch(loadMoreRef, (el: HTMLElement | null) => {
    if (el) observer?.observe(el);
  }, { immediate: true });
});

onUnmounted(() => {
  observer?.disconnect();
});

watch(filter, () => {
  visibleCount.value = PAGE_SIZE;
});

const handleContextMenu = (e: MouseEvent, file: FileItem) => {
  menuTarget.value = file;
  menuPos.value = { x: e.clientX, y: e.clientY };
  menuOpen.value = true;
};

const closeMenu = () => {
  menuOpen.value = false;
  menuTarget.value = null;
};

const copyTitleAction = async () => {
  if (!menuTarget.value) return;
  try {
    const title = menuTarget.value.name.replace(".md", "");
    await navigator.clipboard.writeText(title);
    toast.success("标题已复制");
  } catch {
    toast.error("复制失败");
  }
  closeMenu();
};

const startRenameAction = () => {
  if (!menuTarget.value) return;
  renamingPath.value = menuTarget.value.path;
  renameValue.value = menuTarget.value.name.replace(".md", "");
  closeMenu();
};

const submitRename = async () => {
  if (renamingPath.value && renameValue.value) {
    const file = files.value.find((f: FileItem) => f.path === renamingPath.value);
    if (file) {
      await renameFile(file.path, renameValue.value);
    }
  }
  renamingPath.value = null;
};

const confirmDelete = () => {
  deleteTarget.value = menuTarget.value;
  closeMenu();
};

const handleDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await deleteFile(deleteTarget.value.path);
  } finally {
    deleting.value = false;
    deleteTarget.value = null;
  }
};

// Custom directive for auto-focus
const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus()
};
</script>

<style scoped>
@import "./FileSidebar.css";
</style>
