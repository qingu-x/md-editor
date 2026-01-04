<script setup lang="ts">
import ColorSelector from "../ColorSelector.vue";
import {
  inlineCodeStyleOptions,
  codeBlockThemeOptions,
} from "@/config/styleOptions";
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

const handleInlineCodeStyleChange = (styleId: string) => {
  const updates: Partial<DesignerVariables> = {
    inlineCodeStyle: styleId,
  };
  if (styleId === "color-text") {
    updates.inlineCodeColor = props.variables.primaryColor;
    updates.inlineCodeBackground = "transparent";
  } else if (styleId === "simple") {
    updates.inlineCodeColor = "#c7254e";
    updates.inlineCodeBackground = "#f9f2f4";
  } else if (styleId === "github") {
    updates.inlineCodeColor = "#24292e";
    updates.inlineCodeBackground = "rgba(27,31,35,0.05)";
  }
  emit("change", updates);
};

const handleCodeThemeChange = (themeId: string) => {
  const updates: Partial<DesignerVariables> = {
    codeTheme: themeId,
  };
  if (themeId === "github") updates.codeBackground = "#f8f8f8";
  else if (themeId === "monokai") updates.codeBackground = "#272822";
  else if (themeId === "vscode") updates.codeBackground = "#1e1e1e";
  else if (themeId === "night-owl") updates.codeBackground = "#011627";
  else if (themeId === "dracula") updates.codeBackground = "#282a36";
  else if (themeId === "solarized-dark") updates.codeBackground = "#002b36";
  else if (themeId === "solarized-light") updates.codeBackground = "#fdf6e3";
  else if (themeId === "xcode") updates.codeBackground = "#f8f8f8";
  else if (themeId === "atom-one-light") updates.codeBackground = "#fafafa";
  emit("change", updates);
};
</script>

<template>
  <div class="designer-section">
    <div class="designer-group-label">行内代码</div>
    <div class="designer-field">
      <label>样式预设</label>
      <div class="designer-options col-2">
        <button
          v-for="opt in inlineCodeStyleOptions"
          :key="opt.id"
          class="option-btn"
          :class="{ active: variables.inlineCodeStyle === opt.id }"
          @click="handleInlineCodeStyleChange(opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="designer-row">
      <div class="designer-field half">
        <label>文字颜色</label>
        <ColorSelector
          :value="variables.inlineCodeColor"
          :presets="['#c7254e', '#333', variables.primaryColor]"
          @change="updateVariable('inlineCodeColor', $event)"
        />
      </div>
      <div class="designer-field half">
        <label>背景颜色</label>
        <ColorSelector
          :value="variables.inlineCodeBackground"
          :presets="['#f9f2f4', 'rgba(27,31,35,0.05)', 'transparent']"
          @change="updateVariable('inlineCodeBackground', $event)"
        />
      </div>
    </div>

    <div class="designer-group-label mt-4">代码块</div>
    <div class="designer-field">
      <label>字号: {{ variables.codeFontSize }}px</label>
      <input
        type="range"
        class="designer-slider"
        :min="12"
        :max="16"
        :value="variables.codeFontSize"
        @input="
          updateVariable(
            'codeFontSize',
            Number(($event.target as HTMLInputElement).value)
          )
        "
      />
    </div>

    <div class="designer-field-row">
      <span>Mac 风格控制栏</span>
      <label class="designer-switch">
        <input
          type="checkbox"
          :checked="variables.showMacBar"
          @change="
            updateVariable('showMacBar', ($event.target as HTMLInputElement).checked)
          "
        />
        <span class="switch-slider"></span>
      </label>
    </div>

    <div class="designer-field">
      <label>高亮主题</label>
      <div class="designer-options col-2">
        <button
          v-for="opt in codeBlockThemeOptions"
          :key="opt.id"
          class="option-btn"
          :class="{ active: variables.codeTheme === opt.id }"
          @click="handleCodeThemeChange(opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>
