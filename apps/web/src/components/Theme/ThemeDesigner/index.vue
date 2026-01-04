<script setup lang="ts">
import { ref, watch, defineAsyncComponent, onMounted } from "vue";
import { styleCategories } from "@/config/styleOptions";
import type { DesignerVariables, HeadingLevel, HeadingStyle } from "./types";
import { defaultVariables } from "./defaults";
import { generateCSS } from "./generateCSS";
import "../ThemeDesigner.css";

const GlobalSection = defineAsyncComponent(() => import("./sections/GlobalSection.vue"));
const HeadingSection = defineAsyncComponent(() => import("./sections/HeadingSection.vue"));
const ParagraphSection = defineAsyncComponent(() => import("./sections/ParagraphSection.vue"));
const QuoteSection = defineAsyncComponent(() => import("./sections/QuoteSection.vue"));
const ListSection = defineAsyncComponent(() => import("./sections/ListSection.vue"));
const CodeSection = defineAsyncComponent(() => import("./sections/CodeSection.vue"));
const ImageSection = defineAsyncComponent(() => import("./sections/ImageSection.vue"));
const TableSection = defineAsyncComponent(() => import("./sections/TableSection.vue"));
const OtherSection = defineAsyncComponent(() => import("./sections/OtherSection.vue"));

const props = defineProps<{
  initialVariables?: DesignerVariables;
  initialCSS?: string;
}>();

const emit = defineEmits<{
  (e: "css-change", css: string): void;
  (e: "variables-change", variables: DesignerVariables): void;
}>();

const variables = ref<DesignerVariables>(
  props.initialVariables ? { ...props.initialVariables } : { ...defaultVariables }
);
const activeTab = ref<string>("global");
const activeHeading = ref<HeadingLevel>("h1");

// 同步初始变量
watch(() => props.initialVariables, (newVars: DesignerVariables | undefined) => {
  if (newVars) {
    variables.value = { ...newVars };
  } else {
    variables.value = { ...defaultVariables };
  }
}, { deep: true });

// 当变量改变时，生成 CSS 并通知父组件
watch(variables, (newVars: DesignerVariables) => {
  const css = generateCSS(newVars);
  emit("css-change", css);
  emit("variables-change", newVars);
}, { deep: true, immediate: true });

const handleVariableChange = (updates: Partial<DesignerVariables>) => {
  variables.value = {
    ...variables.value,
    ...updates,
  };
};

const handleHeadingChange = (level: HeadingLevel, updates: Partial<HeadingStyle>) => {
  variables.value = {
    ...variables.value,
    [level]: {
      ...variables.value[level],
      ...updates,
    },
  };
};

const handlePrimaryColorChange = (newColor: string) => {
  variables.value = {
    ...variables.value,
    primaryColor: newColor,
    listMarkerColor: newColor,
    listMarkerColorL2: newColor,
  };
};
</script>

<template>
  <div class="theme-designer">
    <!-- 分类 Tabs -->
    <div class="designer-tabs">
      <button
        v-for="cat in styleCategories"
        :key="cat.id"
        class="designer-tab"
        :class="{ active: activeTab === cat.id }"
        @click="activeTab = cat.id"
        :title="cat.description"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 内容区 -->
    <div class="designer-content">
      <div class="designer-section">
        <GlobalSection
          v-if="activeTab === 'global'"
          :variables="variables"
          @change="handleVariableChange"
          @primary-color-change="handlePrimaryColorChange"
        />
        <HeadingSection
          v-if="activeTab === 'heading'"
          :variables="variables"
          :active-heading="activeHeading"
          @update:active-heading="activeHeading = $event"
          @change="handleHeadingChange"
        />
        <ParagraphSection
          v-if="activeTab === 'paragraph'"
          :variables="variables"
          @change="handleVariableChange"
        />
        <QuoteSection
          v-if="activeTab === 'quote'"
          :variables="variables"
          @change="handleVariableChange"
        />
        <ListSection
          v-if="activeTab === 'list'"
          :variables="variables"
          @change="handleVariableChange"
        />
        <CodeSection
          v-if="activeTab === 'code'"
          :variables="variables"
          @change="handleVariableChange"
        />
        <ImageSection
          v-if="activeTab === 'image'"
          :variables="variables"
          @change="handleVariableChange"
        />
        <TableSection
          v-if="activeTab === 'table'"
          :variables="variables"
          @change="handleVariableChange"
        />
        <OtherSection
          v-if="activeTab === 'other'"
          :variables="variables"
          @change="handleVariableChange"
        />
      </div>
    </div>
  </div>
</template>
