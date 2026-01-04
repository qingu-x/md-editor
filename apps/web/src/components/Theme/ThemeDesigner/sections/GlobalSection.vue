<script setup lang="ts">
import { computed } from "vue";
import ColorSelector from "../ColorSelector.vue";
import {
  fontFamilyOptions,
  fontSizeOptions,
  lineHeightOptions,
  primaryColorOptions,
  boldStyleOptions,
} from "@/config/styleOptions";
import type { DesignerVariables } from "../types";

const props = defineProps<{
  variables: DesignerVariables;
}>();

const emit = defineEmits<{
  (e: "change", updates: Partial<DesignerVariables>): void;
  (e: "primary-color-change", color: string): void;
}>();

const updateVariable = <K extends keyof DesignerVariables>(
  key: K,
  value: DesignerVariables[K]
) => {
  emit("change", { [key]: value });
};

const handlePrimaryColorChange = (color: string) => {
  emit("primary-color-change", color);
};
</script>

<template>
  <div class="designer-section">
    <div class="designer-field">
      <label>字体</label>
      <div class="designer-options">
        <button
          v-for="opt in fontFamilyOptions"
          :key="opt.value"
          class="option-btn"
          :class="{ active: variables.fontFamily === opt.value }"
          @click="updateVariable('fontFamily', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="designer-field">
      <label>正文字号</label>
      <div class="designer-options">
        <button
          v-for="opt in fontSizeOptions"
          :key="opt.value"
          class="option-btn"
          :class="{ active: variables.fontSize === opt.value }"
          @click="updateVariable('fontSize', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="designer-field">
      <label>行高</label>
      <div class="designer-options">
        <button
          v-for="opt in lineHeightOptions"
          :key="opt.value"
          class="option-btn"
          :class="{ active: variables.lineHeight === opt.value }"
          @click="updateVariable('lineHeight', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="designer-field">
      <label>页面边距: {{ variables.pagePadding }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="0"
        :max="48"
        :step="1"
        :value="variables.pagePadding || 0"
        @input="updateVariable('pagePadding', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <div class="designer-field">
      <label>正文颜色</label>
      <ColorSelector
        :value="variables.paragraphColor"
        :presets="[
          { label: '深灰 (推荐)', value: '#333333' },
          { label: '纯黑', value: '#000000' },
          { label: '灰色', value: '#666666' },
        ]"
        @change="updateVariable('paragraphColor', $event)"
      />
    </div>

    <div class="designer-field">
      <label>主题色</label>
      <ColorSelector
        :value="variables.primaryColor"
        :presets="primaryColorOptions"
        @change="handlePrimaryColorChange"
      />
    </div>

    <div class="designer-field">
      <label>加粗样式</label>
      <div class="designer-options">
        <button
          v-for="opt in boldStyleOptions"
          :key="opt.id"
          class="option-btn"
          :class="{ active: variables.strongStyle === opt.id }"
          @click="updateVariable('strongStyle', opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>
