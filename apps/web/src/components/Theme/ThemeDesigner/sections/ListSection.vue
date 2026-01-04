<script setup lang="ts">
import ColorSelector from "../ColorSelector.vue";
import { ulStyleOptions, olStyleOptions } from "@/config/styleOptions";
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
    <div class="designer-row">
      <div class="designer-field half">
        <label>一级标识颜色</label>
        <ColorSelector
          :value="variables.listMarkerColor"
          :presets="[variables.primaryColor]"
          @change="updateVariable('listMarkerColor', $event)"
        />
      </div>
      <div class="designer-field half">
        <label>二级标识颜色</label>
        <ColorSelector
          :value="variables.listMarkerColorL2"
          :presets="[variables.primaryColor]"
          @change="updateVariable('listMarkerColorL2', $event)"
        />
      </div>
    </div>

    <div class="designer-field">
      <label>列表项间距: {{ variables.listSpacing }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="0"
        :max="20"
        :step="2"
        :value="variables.listSpacing"
        @input="
          updateVariable(
            'listSpacing',
            Number(($event.target as HTMLInputElement).value)
          )
        "
      />
    </div>

    <div class="designer-field">
      <label>无序列表符号</label>
      <div class="level-group">
        <span class="level-tag">一级</span>
        <div class="designer-options">
          <button
            v-for="opt in ulStyleOptions"
            :key="opt.value"
            class="option-btn"
            :class="{ active: variables.ulStyle === opt.value }"
            @click="updateVariable('ulStyle', opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <div class="level-group mt-2">
        <span class="level-tag">二级</span>
        <div class="designer-options">
          <button
            v-for="opt in ulStyleOptions"
            :key="opt.value + 'L2'"
            class="option-btn"
            :class="{ active: variables.ulStyleL2 === opt.value }"
            @click="updateVariable('ulStyleL2', opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="designer-field">
      <label>有序列表符号</label>
      <div class="level-group">
        <span class="level-tag">一级</span>
        <div class="designer-options">
          <button
            v-for="opt in olStyleOptions"
            :key="opt.value"
            class="option-btn"
            :class="{ active: variables.olStyle === opt.value }"
            @click="updateVariable('olStyle', opt.value)"
          >
            {{ opt.label.split(' ')[0] }}
          </button>
        </div>
      </div>
      <div class="level-group mt-2">
        <span class="level-tag">二级</span>
        <div class="designer-options">
          <button
            v-for="opt in olStyleOptions"
            :key="opt.value + 'L2'"
            class="option-btn"
            :class="{ active: variables.olStyleL2 === opt.value }"
            @click="updateVariable('olStyleL2', opt.value)"
          >
            {{ opt.label.split(' ')[0] }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
