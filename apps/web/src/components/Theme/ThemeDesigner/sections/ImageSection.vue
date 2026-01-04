<script setup lang="ts">
import ColorSelector from "../ColorSelector.vue";
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
      <label>边距: {{ variables.imageMargin }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="0"
        :max="40"
        :step="4"
        :value="variables.imageMargin"
        @input="
          updateVariable(
            'imageMargin',
            Number(($event.target as HTMLInputElement).value)
          )
        "
      />
    </div>

    <div class="designer-field">
      <label>圆角: {{ variables.imageBorderRadius }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="0"
        :max="16"
        :value="variables.imageBorderRadius"
        @input="
          updateVariable(
            'imageBorderRadius',
            Number(($event.target as HTMLInputElement).value)
          )
        "
      />
    </div>

    <div class="designer-group-label mt-4">图片说明</div>
    <div class="designer-field">
      <label>说明文字颜色</label>
      <ColorSelector
        :value="variables.imageCaptionColor"
        :presets="['#999', '#666', '#333', variables.primaryColor]"
        @change="updateVariable('imageCaptionColor', $event)"
      />
    </div>

    <div class="designer-field">
      <label>说明文字大小</label>
      <div class="designer-options col-4">
        <button
          v-for="size in [12, 13, 14, 15]"
          :key="size"
          class="option-btn"
          :class="{ active: variables.imageCaptionFontSize === size }"
          @click="updateVariable('imageCaptionFontSize', size)"
        >
          {{ size }}
        </button>
      </div>
    </div>

    <div class="designer-field">
      <label>说明文字对齐</label>
      <div class="designer-options col-3">
        <button
          v-for="opt in [
            { id: 'left', label: '居左' },
            { id: 'center', label: '居中' },
            { id: 'right', label: '居右' },
          ]"
          :key="opt.id"
          class="option-btn"
          :class="{ active: variables.imageCaptionTextAlign === opt.id }"
          @click="updateVariable('imageCaptionTextAlign', opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>
