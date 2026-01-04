<template>
  <div :class="fixed ? 'window-controls-fixed' : 'window-controls'">
    <button
      class="win-btn win-minimize"
      @click="minimize?.()"
      aria-label="最小化"
    >
      <svg width="10" height="1" viewBox="0 0 10 1">
        <rect width="10" height="1" fill="currentColor" />
      </svg>
    </button>
    <button
      class="win-btn win-maximize"
      @click="maximize?.()"
      aria-label="最大化"
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <rect
          width="9"
          height="9"
          x="0.5"
          y="0.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        />
      </svg>
    </button>
    <button
      class="win-btn win-close"
      @click="close?.()"
      aria-label="关闭"
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path
          d="M1 1 L9 9 M9 1 L1 9"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useWindowControls } from "../../hooks/useWindowControls";

defineProps<{
  fixed?: boolean;
}>();

const { minimize, maximize, close } = useWindowControls();
</script>
