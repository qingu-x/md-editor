<script setup lang="ts">
import { ref } from "vue";
import ColorSelector from "../ColorSelector.vue";
import {
  headingSizePresets,
  marginPresets,
  headingStylePresets,
} from "@/config/styleOptions";
import type { DesignerVariables, HeadingLevel, HeadingStyle } from "../types";

const props = defineProps<{
  variables: DesignerVariables;
  activeHeading: HeadingLevel;
}>();

const emit = defineEmits<{
  (e: "change", level: HeadingLevel, updates: Partial<HeadingStyle>): void;
  (e: "update:active-heading", level: HeadingLevel): void;
}>();

const headingTabs: { id: HeadingLevel; label: string }[] = [
  { id: "h1", label: "H1" },
  { id: "h2", label: "H2" },
  { id: "h3", label: "H3" },
  { id: "h4", label: "H4" },
];

const updateHeading = (level: HeadingLevel, style: Partial<HeadingStyle>) => {
  emit("change", level, style);
};
</script>

<template>
  <div class="designer-section">
    <div class="designer-subtabs">
      <button
        v-for="tab in headingTabs"
        :key="tab.id"
        class="subtab"
        :class="{ active: activeHeading === tab.id }"
        @click="$emit('update:active-heading', tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="designer-field">
      <div class="designer-field-header">
        <label>样式预设</label>
        <div class="compact-switch">
          <span>居中</span>
          <label class="designer-switch">
            <input
              type="checkbox"
              :checked="variables[activeHeading].centered"
              @change="
                updateHeading(activeHeading, {
                  centered: ($event.target as HTMLInputElement).checked,
                })
              "
            />
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>
      <div class="designer-options">
        <button
          class="option-btn"
          :class="{
            active:
              !variables[activeHeading].preset ||
              variables[activeHeading].preset === 'simple',
          }"
          @click="updateHeading(activeHeading, { preset: 'simple' })"
        >
          无样式
        </button>
        <template v-for="preset in headingStylePresets">
          <button
            v-if="preset.id !== 'simple'"
            :key="preset.id"
            class="option-btn"
            :class="{ active: variables[activeHeading].preset === preset.id }"
            @click="updateHeading(activeHeading, { preset: preset.id })"
          >
            {{ preset.label }}
          </button>
        </template>
      </div>
    </div>

    <div class="designer-field">
      <label>字号: {{ variables[activeHeading].fontSize }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="headingSizePresets[activeHeading].min"
        :max="headingSizePresets[activeHeading].max"
        :value="variables[activeHeading].fontSize"
        @input="
          updateHeading(activeHeading, {
            fontSize: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
    </div>

    <div class="designer-field">
      <label>字重</label>
      <div class="designer-options mini">
        <button
          class="option-btn"
          :class="{ active: variables[activeHeading].fontWeight !== 'normal' }"
          @click="updateHeading(activeHeading, { fontWeight: 'bold' })"
        >
          加粗
        </button>
        <button
          class="option-btn"
          :class="{ active: variables[activeHeading].fontWeight === 'normal' }"
          @click="updateHeading(activeHeading, { fontWeight: 'normal' })"
        >
          常规
        </button>
      </div>
    </div>

    <div class="designer-field">
      <label>字间距: {{ variables[activeHeading].letterSpacing }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="0"
        :max="10"
        step="0.5"
        :value="variables[activeHeading].letterSpacing"
        @input="
          updateHeading(activeHeading, {
            letterSpacing: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
    </div>

    <div class="designer-field">
      <label>文字颜色</label>
      <ColorSelector
        :value="variables[activeHeading].color"
        :presets="['#000', '#333', '#666', variables.primaryColor]"
        @change="updateHeading(activeHeading, { color: $event })"
      />
    </div>

    <div class="designer-field">
      <label>上边距: {{ variables[activeHeading].marginTop }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="marginPresets.min"
        :max="marginPresets.max"
        :step="marginPresets.step"
        :value="variables[activeHeading].marginTop"
        @input="
          updateHeading(activeHeading, {
            marginTop: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
    </div>

    <div class="designer-field">
      <label>下边距: {{ variables[activeHeading].marginBottom }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="marginPresets.min"
        :max="marginPresets.max"
        :step="marginPresets.step"
        :value="variables[activeHeading].marginBottom"
        @input="
          updateHeading(activeHeading, {
            marginBottom: Number(($event.target as HTMLInputElement).value),
          })
        "
      />
    </div>
  </div>
</template>
