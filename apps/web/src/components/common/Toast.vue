<template>
  <Teleport to="body">
    <div class="toast-container" :class="position">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="premium-toast"
          :class="toast.type"
        >
          <div class="toast-icon">
            <CheckCircle v-if="toast.type === 'success'" :size="18" />
            <AlertCircle v-else-if="toast.type === 'error'" :size="18" />
            <Info v-else :size="18" />
          </div>
          <div class="toast-content">{{ toast.message }}</div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircle, AlertCircle, Info } from 'lucide-vue-next';
import { useToast } from '../../hooks/useToast';

const { toasts, position } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  padding: 20px;
}

.toast-container.top-center {
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.premium-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  color: #1a1a1a;
  box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.12);
  border-radius: 50px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid rgba(0, 0, 0, 0.05);
  max-width: 400px;
  pointer-events: auto;
  transform-origin: center;
  margin-bottom: 10px;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.success .toast-icon {
  color: #07c160;
}

.error .toast-icon {
  color: #ef4444;
}

.info .toast-icon {
  color: #1890ff;
}

/* Transition */
.toast-move,
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.21, 1.02, 0.73, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: scale(0.6) translateY(-40px);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.6) translateY(-20px);
}

.toast-leave-active {
  position: absolute;
  width: max-content;
  white-space: nowrap;
}
</style>
