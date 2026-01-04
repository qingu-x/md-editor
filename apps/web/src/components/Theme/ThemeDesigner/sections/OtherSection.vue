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
    <!-- 链接 -->
    <div class="designer-group-label">链接</div>
    <div class="designer-field">
      <label>链接颜色</label>
      <ColorSelector
        :value="variables.linkColor || variables.primaryColor"
        :presets="[variables.primaryColor, '#0070f3', '#0366d6', '#40a9ff']"
        @change="updateVariable('linkColor', $event)"
      />
    </div>
    <div class="designer-field-row">
      <span>显示下划线</span>
      <label class="designer-switch">
        <input
          type="checkbox"
          :checked="variables.linkUnderline"
          @change="
            updateVariable(
              'linkUnderline',
              ($event.target as HTMLInputElement).checked
            )
          "
        />
        <span class="switch-slider"></span>
      </label>
    </div>

    <!-- 文本样式 -->
    <div class="designer-group-label mt-4">文本样式</div>
    <div class="designer-field">
      <label>斜体颜色</label>
      <ColorSelector
        :value="variables.italicColor"
        :presets="['inherit', variables.primaryColor, '#666', '#999']"
        @change="updateVariable('italicColor', $event)"
      />
    </div>
    <div class="designer-field">
      <label>删除线颜色</label>
      <ColorSelector
        :value="variables.delColor"
        :presets="['#999', '#ccc', '#666', variables.primaryColor]"
        @change="updateVariable('delColor', $event)"
      />
    </div>
    <div class="designer-row">
      <div class="designer-field half">
        <label>高亮背景</label>
        <ColorSelector
          :value="variables.markBackground"
          :presets="['#fff5b1', '#ffe4e1', '#e6f7ff', '#f6ffed']"
          @change="updateVariable('markBackground', $event)"
        />
      </div>
      <div class="designer-field half">
        <label>高亮文字</label>
        <ColorSelector
          :value="variables.markColor"
          :presets="['inherit', '#333', variables.primaryColor]"
          @change="updateVariable('markColor', $event)"
        />
      </div>
    </div>

    <!-- 脚注 -->
    <div class="designer-group-label mt-4">脚注</div>
    <div class="designer-field">
      <label>脚注颜色</label>
      <ColorSelector
        :value="variables.footnoteColor || variables.primaryColor"
        :presets="[
          {
            label: '跟随主题',
            value: '',
            displayColor: variables.primaryColor,
          },
          { label: '深灰', value: '#333333' },
          { label: '灰', value: '#666666' },
          { label: '细灰', value: '#999999' },
        ]"
        @change="updateVariable('footnoteColor', $event)"
      />
    </div>
    <div class="designer-field">
      <label>详情字号</label>
      <div class="designer-options col-4">
        <button
          v-for="size in [11, 12, 13, 14]"
          :key="size"
          class="option-btn"
          :class="{ active: variables.footnoteFontSize === size }"
          @click="updateVariable('footnoteFontSize', size)"
        >
          {{ size }}
        </button>
      </div>
    </div>
    <div class="designer-field">
      <label>栏目标题</label>
      <input
        type="text"
        class="designer-input"
        :value="variables.footnoteHeader"
        @input="
          updateVariable(
            'footnoteHeader',
            ($event.target as HTMLInputElement).value
          )
        "
        placeholder="留空则不显示标题..."
      />
    </div>
    <div class="designer-field">
      <label>标题颜色</label>
      <ColorSelector
        :value="variables.footnoteHeaderColor || variables.primaryColor"
        :presets="[variables.primaryColor]"
        @change="updateVariable('footnoteHeaderColor', $event)"
      />
    </div>
    <div class="designer-field">
      <label>标题样式</label>
      <div class="designer-options col-5">
        <button
          v-for="style in [
            { id: 'simple', label: '简约' },
            { id: 'left-border', label: '竖线' },
            { id: 'bottom-border', label: '下划线' },
            { id: 'background', label: '背景块' },
            { id: 'pill', label: '胶囊' },
          ]"
          :key="style.id"
          class="option-btn"
          :class="{ active: variables.footnoteHeaderStyle === style.id }"
          @click="updateVariable('footnoteHeaderStyle', style.id)"
        >
          {{ style.label }}
        </button>
      </div>
    </div>
  </div>
</template>
