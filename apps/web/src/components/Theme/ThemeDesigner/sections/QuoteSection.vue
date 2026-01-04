<script setup lang="ts">
import ColorSelector from "../ColorSelector.vue";
import { quoteStylePresets } from "@/config/styleOptions";
import type { DesignerVariables } from "../types";

const props = defineProps<{
  variables: DesignerVariables;
}>();

const emit = defineEmits<{
  (e: "change", updates: Partial<DesignerVariables>): void;
}>();

const updateVariable = <K extends keyof DesignerVariables>(
  key: K,
  value: DesignerVariables[K]
) => {
  emit("change", { [key]: value });
};
</script>

<template>
  <div class="designer-section">
    <div class="designer-field">
      <label>样式预设</label>
      <div class="designer-options">
        <button
          v-for="opt in quoteStylePresets"
          :key="opt.id"
          class="option-btn"
          :class="{ active: variables.quotePreset === opt.id }"
          @click="updateVariable('quotePreset', opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="designer-field">
      <label>引用背景</label>
      <ColorSelector
        :value="variables.quoteBackground"
        :presets="['#f5f5f5', '#f0f9ff', '#f0fdf4', '#fef3c7', '#fce7f3']"
        @change="updateVariable('quoteBackground', $event)"
      />
    </div>

    <div class="designer-field">
      <label>边框颜色</label>
      <ColorSelector
        :value="variables.quoteBorderColor"
        :presets="[
          '#ddd',
          '#0ea5e9',
          '#22c55e',
          '#f59e0b',
          '#ec4899',
          variables.primaryColor,
        ]"
        @change="updateVariable('quoteBorderColor', $event)"
      />
    </div>

    <div class="designer-field">
      <label>引用文字颜色</label>
      <ColorSelector
        :value="variables.quoteTextColor"
        :presets="['#666', '#333', '#000', variables.primaryColor]"
        @change="updateVariable('quoteTextColor', $event)"
      />
    </div>
  </div>
</template>
