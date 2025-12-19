<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { X, ChevronUp, ChevronDown, Replace, CaseSensitive, Regex } from 'lucide-vue-next'
import './SearchPanel.css'

interface Match {
  from: number
  to: number
}

const props = defineProps<{
  view: EditorView
}>()

const emit = defineEmits<{
  close: []
}>()

const searchText = ref('')
const replaceText = ref('')
const caseSensitive = ref(false)
const useRegexp = ref(false)
const matches = ref<Match[]>([])
const currentIndex = ref(0)
const showReplace = ref(false)
const hasSearched = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

// 聚焦搜索输入框
onMounted(() => {
  nextTick(() => {
    searchInputRef.value?.focus()
  })
})

// 执行搜索
function doSearch() {
  if (!searchText.value) {
    matches.value = []
    currentIndex.value = 0
    hasSearched.value = false
    return
  }

  const doc = props.view.state.doc.toString()
  const foundMatches: Match[] = []

  try {
    if (useRegexp.value) {
      const flags = caseSensitive.value ? 'g' : 'gi'
      const regex = new RegExp(searchText.value, flags)
      let match
      while ((match = regex.exec(doc)) !== null) {
        foundMatches.push({ from: match.index, to: match.index + match[0].length })
        if (foundMatches.length > 10000) break
      }
    } else {
      const searchLower = caseSensitive.value ? searchText.value : searchText.value.toLowerCase()
      const docLower = caseSensitive.value ? doc : doc.toLowerCase()
      let pos = 0
      while ((pos = docLower.indexOf(searchLower, pos)) !== -1) {
        foundMatches.push({ from: pos, to: pos + searchText.value.length })
        pos += searchText.value.length
        if (foundMatches.length > 10000) break
      }
    }
  } catch {
    // 正则表达式错误，忽略
  }

  matches.value = foundMatches
  currentIndex.value = 0
  hasSearched.value = true

  // 跳转到第一个匹配项
  if (foundMatches.length > 0) {
    const match = foundMatches[0]
    props.view.dispatch({
      selection: EditorSelection.single(match.from, match.to),
      scrollIntoView: true,
    })
  }
}

// 高亮当前匹配项并滚动到视图
watch([currentIndex, matches], () => {
  if (hasSearched.value && matches.value.length > 0 && currentIndex.value >= 0 && currentIndex.value < matches.value.length) {
    const match = matches.value[currentIndex.value]
    props.view.dispatch({
      selection: EditorSelection.single(match.from, match.to),
      scrollIntoView: true,
    })
  }
})

function handleFindNext() {
  if (!hasSearched.value) {
    doSearch()
    return
  }
  if (matches.value.length === 0) return
  currentIndex.value = (currentIndex.value + 1) % matches.value.length
}

function handleFindPrevious() {
  if (!hasSearched.value) {
    doSearch()
    return
  }
  if (matches.value.length === 0) return
  currentIndex.value = (currentIndex.value - 1 + matches.value.length) % matches.value.length
}

function handleReplace() {
  if (matches.value.length === 0 || currentIndex.value < 0) return
  const match = matches.value[currentIndex.value]

  props.view.dispatch({
    changes: { from: match.from, to: match.to, insert: replaceText.value },
  })

  // 重新搜索
  setTimeout(() => doSearch(), 0)
}

function handleReplaceAll() {
  if (matches.value.length === 0) return

  const changes = [...matches.value].reverse().map((match) => ({
    from: match.from,
    to: match.to,
    insert: replaceText.value,
  }))

  props.view.dispatch({ changes })
  matches.value = []
  currentIndex.value = 0
  hasSearched.value = false
}

function handleClose() {
  emit('close')
  props.view.focus()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (e.shiftKey) {
      handleFindPrevious()
    } else {
      handleFindNext()
    }
  }
}

function handleInputChange(e: Event) {
  searchText.value = (e.target as HTMLInputElement).value
  hasSearched.value = false
}

const matchCountText = computed(() => {
  if (!searchText.value) return ''
  if (!hasSearched.value) return '按回车搜索'
  if (matches.value.length === 0) return '无匹配'
  return `${currentIndex.value + 1}/${matches.value.length}`
})
</script>

<template>
  <div
    class="search-panel"
    @keydown="handleKeyDown"
  >
    <div class="search-row">
      <div class="search-input-wrapper">
        <input
          ref="searchInputRef"
          type="text"
          class="search-input"
          placeholder="查找..."
          :value="searchText"
          @input="handleInputChange"
        />
        <span
          v-if="searchText"
          class="match-count"
        >{{ matchCountText }}</span>
      </div>

      <div class="search-buttons">
        <button
          :class="['search-option-btn', { active: caseSensitive }]"
          data-tooltip="区分大小写"
          @click="caseSensitive = !caseSensitive; hasSearched = false"
        >
          <CaseSensitive :size="16" />
        </button>
        <button
          :class="['search-option-btn', { active: useRegexp }]"
          data-tooltip="使用正则表达式"
          @click="useRegexp = !useRegexp; hasSearched = false"
        >
          <Regex :size="16" />
        </button>
        <div class="search-divider"></div>
        <button
          class="search-nav-btn"
          data-tooltip="上一个 (Shift+Enter)"
          @click="handleFindPrevious"
        >
          <ChevronUp :size="16" />
        </button>
        <button
          class="search-nav-btn"
          data-tooltip="下一个 (Enter)"
          @click="handleFindNext"
        >
          <ChevronDown :size="16" />
        </button>
        <div class="search-divider"></div>
        <button
          :class="['search-option-btn', { active: showReplace }]"
          data-tooltip="显示替换"
          @click="showReplace = !showReplace"
        >
          <Replace :size="16" />
        </button>
        <button
          class="search-close-btn"
          data-tooltip="关闭 (Esc)"
          @click="handleClose"
        >
          <X :size="16" />
        </button>
      </div>
    </div>

    <div
      v-if="showReplace"
      class="replace-row"
    >
      <input
        v-model="replaceText"
        type="text"
        class="search-input replace-input"
        placeholder="替换为..."
      />
      <div class="search-buttons">
        <button
          class="replace-btn"
          :disabled="matches.length === 0"
          @click="handleReplace"
        >
          替换
        </button>
        <button
          class="replace-btn"
          :disabled="matches.length === 0"
          @click="handleReplaceAll"
        >
          全部替换
        </button>
      </div>
    </div>
  </div>
</template>

