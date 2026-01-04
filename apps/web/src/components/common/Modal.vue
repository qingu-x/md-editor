<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click="$emit('close')">
      <div
        class="modal-panel"
        :class="className"
        @click.stop
      >
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="modal-close" @click="$emit('close')" aria-label="关闭">
            ×
          </button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  className?: string;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
@import "./Modal.css";
</style>
