<script setup lang="ts">
import type { DesignerVariables } from "../types";
import ColorSelector from "../ColorSelector.vue";

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
      <label>段落间距: {{ variables.paragraphMargin }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="8"
        :max="32"
        :step="2"
        :value="variables.paragraphMargin"
        @input="
          updateVariable(
            'paragraphMargin',
            Number(($event.target as HTMLInputElement).value)
          )
        "
      />
    </div>

    <div class="designer-field-row">
      <span>段落首行缩进</span>
      <label class="designer-switch">
        <input
          type="checkbox"
          :checked="variables.textIndent"
          @change="
            updateVariable('textIndent', ($event.target as HTMLInputElement).checked)
          "
        />
        <span class="switch-slider"></span>
      </label>
    </div>

    <div class="designer-field-row">
      <span>两端对齐</span>
      <label class="designer-switch">
        <input
          type="checkbox"
          :checked="variables.textJustify"
          @change="
            updateVariable(
              'textJustify',
              ($event.target as HTMLInputElement).checked
            )
          "
        />
        <span class="switch-slider"></span>
      </label>
    </div>

    <div class="designer-group-label mt-4">分割线</div>
    <div class="designer-field">
      <label>样式</label>
      <div class="designer-options col-3">
        <button
          v-for="style in [
            { id: 'solid', label: '实线' },
            { id: 'dashed', label: '虚线' },
            { id: 'dotted', label: '点线' },
            { id: 'double', label: '双线' },
            { id: 'pill', label: '短线' },
          ]"
          :key="style.id"
          class="option-btn"
          :class="{ active: variables.hrStyle === style.id }"
          @click="updateVariable('hrStyle', style.id)"
        >
          {{ style.label }}
        </button>
      </div>
    </div>
    <div class="designer-field">
      <label>颜色</label>
      <ColorSelector
        :value="variables.hrColor"
        :presets="['#eee', '#ddd', '#ccc', variables.primaryColor]"
        @change="updateVariable('hrColor', $event)"
      />
    </div>
    <div class="designer-field">
      <label>高度: {{ variables.hrHeight }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="1"
        :max="4"
        :value="variables.hrHeight"
        @input="
          updateVariable('hrHeight', Number(($event.target as HTMLInputElement).value))
        "
      />
    </div>
    <div class="designer-field">
      <label>上下边距: {{ variables.hrMargin }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="10"
        :max="60"
        :step="5"
        :value="variables.hrMargin"
        @input="
          updateVariable('hrMargin', Number(($event.target as HTMLInputElement).value))
        "
      />
    </div>
  </div>
</template>
