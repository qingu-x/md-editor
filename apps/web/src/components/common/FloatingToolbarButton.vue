<template>
  <button
    :class="classNames"
    @click="$emit('click')"
    :aria-label="label"
    :title="label"
    :data-tooltip="label"
  >
    <slot name="icon">
      <component :is="icon" v-if="icon" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';

const props = defineProps<{
  /** 按钮图标 */
  icon?: Component;
  /** 无障碍标签和 tooltip 文本 */
  label: string;
  /** 是否为主操作按钮（绿色渐变背景） */
  primary?: boolean;
  /** 是否显示为强调样式（主题色边框） */
  highlight?: boolean;
}>();

defineEmits<{
  (e: 'click'): void;
}>();

const classNames = computed(() => {
  return [
    "floating-btn",
    props.primary && "floating-btn-primary",
    props.highlight && "floating-btn-show",
  ].filter(Boolean).join(" ");
});
</script>
