<template>
  <aside class="history-sidebar">
    <div class="history-header">
      <h3>历史记录</h3>
      <div class="history-actions">
        <button class="btn-secondary btn-icon-only" @click="handleCreateArticle" data-tooltip="新增文章">
          <Plus :size="16" />
        </button>
        <button
          class="btn-secondary btn-icon-only"
          @click="showClearConfirm = true"
          data-tooltip="清空历史"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>
    <div class="history-search">
      <div class="search-wrapper">
        <Search :size="14" class="search-icon" />
        <input
          type="text"
          placeholder="搜索..."
          :value="filter"
          @input="e => setFilter((e.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div v-if="loading" class="history-empty">正在加载...</div>
    <div v-else-if="!hasEntries" class="history-empty">
      {{ filter ? '无匹配结果' : '暂无记录' }}
    </div>
    <div v-else class="history-body">
      <div class="history-list">
        <div
          v-for="entry in visibleHistory"
          :key="entry.id"
          :class="['history-item', activeId === entry.id ? 'active' : '']"
          @click="handleRestore(entry)"
        >
          <div class="history-item-main">
            <div class="history-title-block">
              <span class="history-time">{{ new Date(entry.savedAt).toLocaleString() }}</span>
              <div v-if="renamingId === entry.id" class="history-rename" @click.stop>
                <input
                  v-model="tempTitle"
                  v-focus
                  @keydown.enter="confirmRename(entry)"
                  @keydown.esc="renamingId = null"
                />
                <button @click="confirmRename(entry)">确认</button>
                <button @click="renamingId = null">取消</button>
              </div>
              <span v-else class="history-title">{{ entry.title || '未命名文章' }}</span>
              <span class="history-theme">{{ entry.themeName || '未命名主题' }}</span>
            </div>
            <div class="history-actions-menu-wrapper">
              <button
                class="history-action-trigger"
                @click.stop="e => handleMenuToggle(e, entry)"
                aria-label="操作菜单"
              >
                <MoreHorizontal :size="16" />
              </button>
            </div>
          </div>
        </div>
        <!-- 无限滚动触发器 -->
        <div v-if="hasMore" ref="loadMoreRef" class="history-load-more">
          <span>加载更多...</span>
        </div>
      </div>
    </div>
  </aside>

  <!-- Action Menu Portal -->
  <Teleport to="body">
    <div
      v-if="actionMenuId && menuEntry"
      class="history-action-menu"
      :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
      @click.stop
    >
      <button @click="copyTitle(menuEntry); closeActionMenu()">
        <Copy :size="14" />
        复制标题
      </button>
      <button @click="startRename(menuEntry); closeActionMenu()">
        <Edit2 :size="14" />
        重命名
      </button>
      <button class="danger" @click="deleteTarget = menuEntry; closeActionMenu()">
        <Trash2 :size="14" />
        删除
      </button>
    </div>
  </Teleport>

  <!-- Delete Confirm Portal -->
  <Teleport to="body">
    <div v-if="deleteTarget" class="history-confirm-backdrop" @click="!deleting && (deleteTarget = null)">
      <div class="history-confirm-modal" @click.stop>
        <h4>删除记录</h4>
        <p>确定要删除“{{ deleteTarget.title || '未命名文章' }}”吗？此操作不可撤销。</p>
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

  <!-- Clear Confirm Portal -->
  <Teleport to="body">
    <div v-if="showClearConfirm" class="history-confirm-backdrop" @click="!clearing && (showClearConfirm = false)">
      <div class="history-confirm-modal" @click.stop>
        <h4>清空历史</h4>
        <p>确定要清空所有历史记录吗？此操作不可撤销。</p>
        <div class="history-confirm-actions">
          <button class="btn-secondary" @click="showClearConfirm = false" :disabled="clearing">
            取消
          </button>
          <button
            class="btn-danger"
            @click="handleClearConfirm"
            :disabled="clearing"
          >
            {{ clearing ? '清空中...' : '确认清空' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Search, Plus, Trash2, MoreHorizontal, Edit2, Copy } from 'lucide-vue-next';
import { useEditorStore } from '../../store/editorStore';
import { useThemeStore } from '../../store/themeStore';
import { useHistoryStore } from '../../store/historyStore';
import { toast } from '../../hooks/useToast';
import type { HistorySnapshot } from '../../store/historyTypes';

const PAGE_SIZE = 50;

const editorStore = useEditorStore();
const themeStore = useThemeStore();
const historyStore = useHistoryStore();

const history = computed(() => historyStore.history);
const loading = computed(() => historyStore.loading);
const filter = computed(() => historyStore.filter);
const activeId = computed(() => historyStore.activeId);

const setFilter = (val: string) => historyStore.setFilter(val);

const renamingId = ref<string | null>(null);
const tempTitle = ref('未命名文章');
const actionMenuId = ref<string | null>(null);
const menuPosition = ref({ top: 0, left: 0 });
const menuEntry = ref<HistorySnapshot | null>(null);

const visibleCount = ref(PAGE_SIZE);
const loadMoreRef = ref<HTMLElement | null>(null);
const showClearConfirm = ref(false);
const clearing = ref(false);
const deleteTarget = ref<HistorySnapshot | null>(null);
const deleting = ref(false);

const handleRestore = async (entry: HistorySnapshot) => {
  try {
    await historyStore.persistActiveSnapshot({
      markdown: editorStore.markdown,
      theme: themeStore.themeId,
      customCSS: themeStore.customCSS,
      themeName: themeStore.themeName,
    });
    editorStore.setMarkdown(entry.markdown);
    themeStore.selectTheme(entry.theme);
    themeStore.setCustomCSS(entry.customCSS);
    historyStore.setActiveId(entry.id);
    renamingId.value = null;
    actionMenuId.value = null;
    toast.success('已恢复至该版本');
  } catch (error) {
    toast.error('恢复失败');
    console.error(error);
  }
};

const handleDeleteConfirm = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    const id = deleteTarget.value.id;
    await historyStore.deleteEntry(id);
    if (renamingId.value === id) renamingId.value = null;
    if (activeId.value === id) {
      if (historyStore.activeId) {
        const nextEntry = historyStore.history.find(item => item.id === historyStore.activeId);
        if (nextEntry) {
          editorStore.setMarkdown(nextEntry.markdown);
          themeStore.selectTheme(nextEntry.theme);
          themeStore.setCustomCSS(nextEntry.customCSS);
        }
      } else {
        editorStore.resetDocument();
      }
    }
    toast.success('删除成功');
  } catch (error) {
    toast.error('删除失败');
    console.error(error);
  } finally {
    deleting.value = false;
    deleteTarget.value = null;
  }
};

const handleCreateArticle = async () => {
  const initial = '# 新文章\n\n';
  
  try {
    // 1. 保存当前文章的状态
    await historyStore.persistActiveSnapshot({
      markdown: editorStore.markdown,
      theme: themeStore.themeId,
      customCSS: themeStore.customCSS,
      themeName: themeStore.themeName,
    });

    // 2. 重置编辑器和主题状态
    editorStore.resetDocument({ 
      markdown: initial, 
      theme: 'default', 
      customCSS: '',
      themeName: '默认主题' 
    });

    // 3. 创建新的历史记录条目
    const newEntry = await historyStore.saveSnapshot(
      { 
        markdown: initial, 
        theme: 'default', 
        customCSS: '', 
        title: '新文章', 
        themeName: '默认主题' 
      },
      { force: true }
    );

    // 4. 设置新条目为激活状态
    if (newEntry) {
      historyStore.setActiveId(newEntry.id);
    }
    
    toast.success('已创建新文章');

    // 5. 关闭重命名等临时状态
    renamingId.value = null;
    actionMenuId.value = null;
  } catch (error) {
    toast.error('创建失败');
    console.error(error);
  }
};

const startRename = (entry: HistorySnapshot) => {
  renamingId.value = entry.id;
  tempTitle.value = entry.title || '未命名文章';
  actionMenuId.value = null;
  menuEntry.value = null;
};

const confirmRename = async (entry: HistorySnapshot) => {
  try {
    await historyStore.updateTitle(entry.id, tempTitle.value);
    renamingId.value = null;
    toast.success('重命名成功');
  } catch (error) {
    toast.error('重命名失败');
    console.error(error);
  }
};

const copyTitle = async (entry: HistorySnapshot) => {
  try {
    await navigator.clipboard.writeText(entry.title || '未命名文章');
    toast.success('标题已复制');
  } catch (error) {
    toast.error('复制失败');
    console.error(error);
  }
};

const handleMenuToggle = (event: MouseEvent, entry: HistorySnapshot) => {
  const button = event.currentTarget as HTMLElement;
  const rect = button.getBoundingClientRect();
  const width = 180;
  const padding = 12;
  const maxLeft = window.innerWidth - width - padding;
  const minLeft = padding;
  const desiredLeft = rect.right - width;
  const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));
  const top = rect.bottom + 8;

  if (actionMenuId.value === entry.id) {
    closeActionMenu();
    return;
  }

  actionMenuId.value = entry.id;
  menuEntry.value = entry;
  menuPosition.value = { top, left };
};

const closeActionMenu = () => {
  actionMenuId.value = null;
  menuEntry.value = null;
};

const handleClearConfirm = async () => {
  clearing.value = true;
  try {
    await historyStore.clearHistory();
    editorStore.resetDocument();
  } finally {
    clearing.value = false;
    showClearConfirm.value = false;
  }
};

const keyword = computed(() => filter.value.trim().toLowerCase());
const filteredHistory = computed(() => {
  if (!keyword.value) return history.value;
  return history.value.filter((entry) =>
    (entry.title || '未命名文章').toLowerCase().includes(keyword.value)
  );
});

const visibleHistory = computed(() => filteredHistory.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < filteredHistory.value.length);
const hasEntries = computed(() => filteredHistory.value.length > 0);

const loadMore = () => {
  if (hasMore.value) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filteredHistory.value.length);
  }
};

let observer: IntersectionObserver | null = null;

onMounted(() => {
  historyStore.loadHistory();
  
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value) {
        loadMore();
      }
    },
    { threshold: 0.1 }
  );

  watch(loadMoreRef, (el) => {
    if (el) observer?.observe(el);
  }, { immediate: true });

  const handleWindowClick = () => closeActionMenu();
  const handleWindowScroll = () => closeActionMenu();
  window.addEventListener('click', handleWindowClick);
  window.addEventListener('scroll', handleWindowScroll, true);

  onUnmounted(() => {
    observer?.disconnect();
    window.removeEventListener('click', handleWindowClick);
    window.removeEventListener('scroll', handleWindowScroll, true);
  });
});

watch(filter, () => {
  visibleCount.value = PAGE_SIZE;
});

const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus()
};
</script>

<style scoped>
@import "./HistoryPanel.css";
</style>
