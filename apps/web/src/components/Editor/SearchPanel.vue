<template>
  <div class="search-panel">
    <div class="search-row">
      <div class="search-input-wrapper">
        <input
          ref="searchInputRef"
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="查找"
          @input="handleInputChange"
          @keydown.enter="handleFindNext"
          @keydown.esc="onClose"
        />
        <div v-if="hasSearched && matches.length > 0" class="match-count">
          {{ currentIndex + 1 }} / {{ matches.length }}
        </div>
        <div v-else-if="hasSearched && matches.length === 0" class="match-count">
          无结果
        </div>
        <div v-else-if="searchText" class="match-count">
          按回车搜索
        </div>
      </div>

      <div class="search-buttons">
        <button
          class="search-option-btn"
          :class="{ active: caseSensitive }"
          title="区分大小写"
          @click="caseSensitive = !caseSensitive"
        >
          <CaseSensitive :size="16" />
        </button>
        <button
          class="search-option-btn"
          :class="{ active: useRegexp }"
          title="使用正则表达式"
          @click="useRegexp = !useRegexp"
        >
          <Regex :size="16" />
        </button>

        <div class="search-divider"></div>

        <button
          class="search-nav-btn"
          title="上一个"
          :disabled="matches.length === 0"
          @click="handleFindPrev"
        >
          <ChevronUp :size="18" />
        </button>
        <button
          class="search-nav-btn"
          title="下一个"
          :disabled="matches.length === 0"
          @click="handleFindNext"
        >
          <ChevronDown :size="18" />
        </button>

        <div class="search-divider"></div>

        <button
          class="search-option-btn"
          :class="{ active: showReplace }"
          title="替换"
          @click="showReplace = !showReplace"
        >
          <Replace :size="16" />
        </button>
        <button class="search-close-btn" @click="onClose">
          <X :size="18" />
        </button>
      </div>
    </div>

    <div v-if="showReplace" class="replace-row">
      <div class="search-input-wrapper">
        <input
          v-model="replaceText"
          type="text"
          class="search-input"
          placeholder="替换为"
          @keydown.enter="handleReplace"
        />
      </div>
      <div class="search-buttons">
        <button
          class="btn-text"
          :disabled="matches.length === 0"
          @click="handleReplace"
        >
          替换
        </button>
        <button
          class="btn-text"
          :disabled="matches.length === 0"
          @click="handleReplaceAll"
        >
          全部替换
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { X, ChevronUp, ChevronDown, Replace, CaseSensitive, Regex } from 'lucide-vue-next';

interface Match {
  from: number;
  to: number;
}

const props = defineProps<{
  view: EditorView;
  onClose: () => void;
}>();

const searchText = ref('');
const replaceText = ref('');
const caseSensitive = ref(false);
const useRegexp = ref(false);
const matches = ref<Match[]>([]);
const currentIndex = ref(0);
const showReplace = ref(false);
const hasSearched = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

// 聚焦搜索输入框
onMounted(() => {
  searchInputRef.value?.focus();
});

// 执行搜索
const doSearch = () => {
  if (!searchText.value) {
    matches.value = [];
    currentIndex.value = 0;
    hasSearched.value = false;
    return;
  }

  const doc = props.view.state.doc.toString();
  const foundMatches: Match[] = [];

  try {
    if (useRegexp.value) {
      const flags = caseSensitive.value ? 'g' : 'gi';
      const regex = new RegExp(searchText.value, flags);
      let match;
      while ((match = regex.exec(doc)) !== null) {
        foundMatches.push({ from: match.index, to: match.index + match[0].length });
        if (foundMatches.length > 10000) break;
      }
    } else {
      const searchLower = caseSensitive.value ? searchText.value : searchText.value.toLowerCase();
      const docLower = caseSensitive.value ? doc : doc.toLowerCase();
      let pos = 0;
      while ((pos = docLower.indexOf(searchLower, pos)) !== -1) {
        foundMatches.push({ from: pos, to: pos + searchText.value.length });
        pos += searchText.value.length;
        if (foundMatches.length > 10000) break;
      }
    }
  } catch {
    // 正则表达式错误，忽略
  }

  matches.value = foundMatches;
  currentIndex.value = 0;
  hasSearched.value = true;

  // 跳转到第一个匹配项
  if (foundMatches.length > 0) {
    const match = foundMatches[0];
    props.view.dispatch({
      selection: EditorSelection.single(match.from, match.to),
      scrollIntoView: true,
    });
  }
};

// 输入变化时重置搜索状态
const handleInputChange = () => {
  hasSearched.value = false;
};

// 监听搜索条件变化
watch([caseSensitive, useRegexp], () => {
  if (hasSearched.value) {
    doSearch();
  }
});

// 高亮当前匹配项并滚动到视图
watch(currentIndex, (newIndex: number) => {
  if (hasSearched.value && matches.value.length > 0 && newIndex >= 0 && newIndex < matches.value.length) {
    const match = matches.value[newIndex];
    props.view.dispatch({
      selection: EditorSelection.single(match.from, match.to),
      scrollIntoView: true,
    });
  }
});

const handleFindNext = () => {
  if (!hasSearched.value) {
    doSearch();
    return;
  }
  if (matches.value.length === 0) return;
  currentIndex.value = (currentIndex.value + 1) % matches.value.length;
};

const handleFindPrev = () => {
  if (matches.value.length === 0) return;
  currentIndex.value = (currentIndex.value - 1 + matches.value.length) % matches.value.length;
};

const handleReplace = () => {
  if (matches.value.length === 0) return;
  const match = matches.value[currentIndex.value];
  
  props.view.dispatch({
    changes: { from: match.from, to: match.to, insert: replaceText.value },
    selection: EditorSelection.single(match.from, match.from + replaceText.value.length),
    scrollIntoView: true,
  });
  
  // 替换后重新搜索
  nextTick(() => {
    doSearch();
  });
};

const handleReplaceAll = () => {
  if (matches.value.length === 0) return;
  
  const changes = matches.value.map((match: Match) => ({
    from: match.from,
    to: match.to,
    insert: replaceText.value
  }));
  
  props.view.dispatch({
    changes,
    scrollIntoView: true,
  });
  
  // 替换后重新搜索
  nextTick(() => {
    doSearch();
  });
};
</script>

<style scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  animation: slideDown 0.15s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-row,
.replace-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  padding-right: 80px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(7, 193, 96, 0.15);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.match-count {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-divider {
  width: 1px;
  height: 20px;
  background: var(--border-light);
  margin: 0 4px;
}

.search-option-btn,
.search-nav-btn,
.search-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.search-option-btn:hover,
.search-nav-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.search-option-btn.active {
  background: var(--accent-primary);
  color: white;
}

.search-close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.replace-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.replace-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.replace-row .search-input {
  padding-right: 12px;
}

/* 自定义快速 Tooltip */
.search-option-btn,
.search-nav-btn,
.search-close-btn {
  position: relative;
}

.search-option-btn::after,
.search-nav-btn::after,
.search-close-btn::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  padding: 4px 8px;
  background: var(--text-primary);
  color: var(--bg-primary);
  font-size: 11px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s, visibility 0.15s;
  pointer-events: none;
  z-index: 100;
}

.search-option-btn:hover::after,
.search-nav-btn:hover::after,
.search-close-btn:hover::after {
  opacity: 1;
  visibility: visible;
}
</style>
