<template>
  <aside class="history-sidebar">
    <div class="history-header">
      <h3>文件列表</h3>
      <div class="history-actions">
        <button class="btn-secondary btn-icon-only" @click="handleCreate" data-tooltip="新建文章">
          <Plus :size="16" />
        </button>
        <button class="btn-secondary btn-icon-only" @click="handleSave" :disabled="!activePath || saving" data-tooltip="保存当前">
          <Save :size="16" />
        </button>
      </div>
    </div>
    <div class="history-body">
      <div v-if="loading" class="history-empty">正在加载...</div>
      <div v-else-if="files.length === 0" class="history-empty">暂无文件</div>
      <div v-else class="history-list">
        <div
          v-for="file in files"
          :key="file.path"
          :class="['history-item', activePath === file.path ? 'active' : '']"
          @click="handleOpen(file)"
        >
          <div class="history-item-main">
            <div class="history-title-block">
              <span class="history-time">{{ new Date(file.updatedAt || '').toLocaleString() }}</span>
              <div v-if="renamingPath === file.path" class="history-rename" @click.stop>
                <input
                  v-model="renameValue"
                  v-focus
                  @keydown.enter="submitRename"
                  @keydown.esc="renamingPath = null"
                />
                <button @click="submitRename">确认</button>
                <button @click="renamingPath = null">取消</button>
              </div>
              <span v-else class="history-title">{{ file.name }}</span>
            </div>
            <div class="history-actions-menu-wrapper">
              <button
                class="history-action-trigger"
                @click.stop="(e: MouseEvent) => handleMenuToggle(e, file)"
              >
                <MoreHorizontal :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>

  <!-- Action Menu Portal -->
  <Teleport to="body">
    <div
      v-if="actionMenuId && menuFile"
      class="history-action-menu"
      :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
      @click.stop
    >
      <button @click="copyTitle(menuFile); closeActionMenu()">
        <Copy :size="14" />
        复制标题
      </button>
      <button @click="startRename(menuFile); closeActionMenu()">
        <Edit2 :size="14" />
        重命名
      </button>
      <button class="danger" @click="deleteTarget = menuFile; closeActionMenu()">
        <Trash2 :size="14" />
        删除
      </button>
    </div>
  </Teleport>

  <!-- Delete Confirm Portal -->
  <Teleport to="body">
    <div v-if="deleteTarget" class="history-confirm-backdrop" @click="!deleting && (deleteTarget = null)">
      <div class="history-confirm-modal" @click.stop>
        <h4>删除文件</h4>
        <p>确定要删除“{{ deleteTarget.name }}”吗？此操作不可撤销。</p>
        <div class="history-confirm-actions">
          <button class="btn-secondary" @click="deleteTarget = null" :disabled="deleting">
            取消
          </button>
          <button
            class="btn-danger"
            @click="handleDeleteConfirm"
            :disabled="deleting"
          >
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Plus, Save, MoreHorizontal, Copy, Edit2, Trash2 } from 'lucide-vue-next';
import { useEditorStore } from '../../store/editorStore';
import { useThemeStore } from '../../store/themeStore';
import { toast } from '../../hooks/useToast';
import type { StorageAdapter } from '../../storage/StorageAdapter';
import type { FileItem as StorageFileItem } from '../../storage/types';

const props = defineProps<{
  adapter: StorageAdapter;
}>();

const editorStore = useEditorStore();
const themeStore = useThemeStore();

const files = ref<StorageFileItem[]>([]);
const loading = ref(true);
const activePath = ref<string | null>(null);
const renamingPath = ref<string | null>(null);
const renameValue = ref('');
const saving = ref(false);
const deleteTarget = ref<StorageFileItem | null>(null);
const deleting = ref(false);

const actionMenuId = ref<string | null>(null);
const menuFile = ref<StorageFileItem | null>(null);
const menuPosition = ref({ top: 0, left: 0 });

const defaultFsContent = `---
theme: default
themeName: 默认主题
---

# 新文章

`;

const parseFsFrontmatter = (content: string) => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {
      body: content,
      theme: 'default',
      themeName: '默认主题',
    };
  }
  const raw = match[1];
  const body = content.slice(match[0].length).trimStart();
  const theme = raw.match(/theme:\s*(.+)/)?.[1]?.trim() ?? 'default';
  const themeName = raw.match(/themeName:\s*(.+)/)?.[1]?.trim()?.replace(/^['"]|['"]$/g, '') ?? '默认主题';
  return { body, theme, themeName };
};

const refreshFiles = async () => {
  loading.value = true;
  try {
    const list = await props.adapter.listFiles();
    files.value = list;
    if (activePath.value && !list.find((item: StorageFileItem) => item.path === activePath.value)) {
      activePath.value = null;
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleOpen = async (file: StorageFileItem) => {
  try {
    const content = await props.adapter.readFile(file.path);
    const parsed = parseFsFrontmatter(content);
    editorStore.setMarkdown(parsed.body);
    themeStore.selectTheme(parsed.theme);
    themeStore.setCustomCSS('');
    editorStore.setFilePath(file.path);
    activePath.value = file.path;
  } catch (error) {
    console.error(error);
  }
};

const handleCreate = async () => {
  try {
    const fileName = `文稿-${Date.now()}.md`;
    await props.adapter.writeFile(fileName, defaultFsContent);
    await refreshFiles();
    await handleOpen({ path: fileName, name: fileName } as StorageFileItem);
    toast.success('已创建新文章');
  } catch (error) {
    console.error(error);
    toast.error('创建失败');
  }
};

const handleSave = async () => {
  if (!activePath.value) return;
  try {
    saving.value = true;
    const frontmatter = `---
theme: ${themeStore.themeId}
themeName: ${themeStore.themeName}
---
`;
    await props.adapter.writeFile(activePath.value, `${frontmatter}\n${editorStore.markdown}`);
    await refreshFiles();
  } catch (error) {
    console.error(error);
  } finally {
    saving.value = false;
  }
};

const handleMenuToggle = (event: MouseEvent, file: StorageFileItem) => {
  const button = event.currentTarget as HTMLElement;
  const rect = button.getBoundingClientRect();
  const width = 180;
  const padding = 12;
  const maxLeft = window.innerWidth - width - padding;
  const minLeft = padding;
  const desiredLeft = rect.right - width;
  const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));
  const top = rect.bottom + 8;

  if (actionMenuId.value === file.path) {
    closeActionMenu();
    return;
  }

  actionMenuId.value = file.path;
  menuFile.value = file;
  menuPosition.value = { top, left };
};

const closeActionMenu = () => {
  actionMenuId.value = null;
  menuFile.value = null;
};

const copyTitle = async (file: StorageFileItem) => {
  try {
    await navigator.clipboard.writeText(file.name.replace('.md', ''));
  } catch (error) {
    console.error(error);
  }
};

const startRename = (file: StorageFileItem) => {
  renamingPath.value = file.path;
  renameValue.value = file.name.replace('.md', '');
  actionMenuId.value = null;
  menuFile.value = null;
};

const submitRename = async () => {
  if (!renamingPath.value || !renameValue.value.trim()) return;
  const nextName = renameValue.value.trim().endsWith('.md') ? renameValue.value.trim() : `${renameValue.value.trim()}.md`;
  try {
    await props.adapter.renameFile(renamingPath.value, nextName);
    if (activePath.value === renamingPath.value) {
      activePath.value = nextName;
      editorStore.setFilePath(nextName);
    }
    renamingPath.value = null;
    renameValue.value = '';
    await refreshFiles();
  } catch (error) {
    console.error(error);
  }
};

const handleDeleteConfirm = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await props.adapter.deleteFile(deleteTarget.value.path);
    if (activePath.value === deleteTarget.value.path) {
      activePath.value = null;
      editorStore.setFilePath(undefined);
      editorStore.setMarkdown('');
    }
    await refreshFiles();
  } finally {
    deleting.value = false;
    deleteTarget.value = null;
  }
};

onMounted(() => {
  refreshFiles();
  const handleWindowClick = () => closeActionMenu();
  const handleWindowScroll = () => closeActionMenu();
  window.addEventListener('click', handleWindowClick);
  window.addEventListener('scroll', handleWindowScroll, true);

  onUnmounted(() => {
    window.removeEventListener('click', handleWindowClick);
    window.removeEventListener('scroll', handleWindowScroll, true);
  });
});
</script>

<style scoped>
@import "./HistoryPanel.css";
</style>
