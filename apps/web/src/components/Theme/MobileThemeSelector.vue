<template>
  <div v-if="open" class="mobile-theme-overlay" @click="$emit('close')">
    <div class="mobile-theme-panel" @click.stop>
      <div class="mobile-theme-header">
        <span>选择主题</span>
        <button class="mobile-theme-close" @click="$emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="mobile-theme-list">
        <div v-if="customThemes.length > 0" class="mobile-theme-group">
          <div class="mobile-theme-group-title">自定义主题</div>
          <button
            v-for="theme in customThemes"
            :key="theme.id"
            class="mobile-theme-item"
            :class="{ active: currentThemeId === theme.id }"
            @click="handleSelect(theme.id)"
          >
            <span class="mobile-theme-name">{{ theme.name }}</span>
            <Check v-if="currentThemeId === theme.id" :size="18" class="mobile-theme-check" />
          </button>
        </div>

        <div class="mobile-theme-group">
          <div class="mobile-theme-group-title">内置主题</div>
          <button
            v-for="theme in builtInThemes"
            :key="theme.id"
            class="mobile-theme-item"
            :class="{ active: currentThemeId === theme.id }"
            @click="handleSelect(theme.id)"
          >
            <span class="mobile-theme-name">{{ theme.name }}</span>
            <Check v-if="currentThemeId === theme.id" :size="18" class="mobile-theme-check" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X, Check } from 'lucide-vue-next';
import { useThemeStore } from '../../store/themeStore';
import './MobileThemeSelector.css';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const themeStore = useThemeStore();

const currentThemeId = computed(() => themeStore.themeId);

// 获取所有主题并分组
const allThemes = computed(() => themeStore.allThemes);
const builtInThemes = computed(() => allThemes.value.filter((t: any) => t.isBuiltIn));
const customThemes = computed(() => allThemes.value.filter((t: any) => !t.isBuiltIn));

const handleSelect = (themeId: string) => {
  themeStore.selectTheme(themeId);
  emit('close');
};
</script>
