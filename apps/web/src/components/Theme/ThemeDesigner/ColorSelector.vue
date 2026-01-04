<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { Plus } from "lucide-vue-next";

/**
 * 标准化颜色值，统一转为 6 位大写 Hex。
 * 支持 #333 -> #333333 等转换。
 */
function normalizeColor(color: string): string {
  if (!color) return "";
  const trimmed = color.trim().toUpperCase();
  if (!trimmed.startsWith("#")) return trimmed; // 非 hex 关键词保持原样

  let hex = trimmed.slice(1);
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  return `#${hex}`;
}

// HSL 转 Hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// Hex 转 HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

interface ColorPreset {
  label?: string;
  value: string;
  displayColor?: string;
}

const props = defineProps<{
  value: string;
  presets: (string | ColorPreset)[];
}>();

const emit = defineEmits<{
  (e: "change", color: string): void;
}>();

const showColorPicker = ref(false);
const tempColor = ref(props.value);
const hsl = ref(hexToHsl(props.value.startsWith("#") ? props.value : "#000000"));
const popoverPos = ref<{ top: number; left: number } | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);

const normalizedPresets = computed(() =>
  props.presets.map((p: string | ColorPreset) => (typeof p === "string" ? { value: p } : p))
);

const currentValueResolved = computed(() => {
  const normalized = normalizeColor(props.value);
  const match = normalizedPresets.value.find(
    (p: ColorPreset) => normalizeColor(p.value) === normalized
  );
  if (match && match.displayColor) return normalizeColor(match.displayColor);
  return normalized;
});

const uniquePresets = computed(() => {
  const result: ColorPreset[] = [];
  const seenDisplayColors = new Set<string>();

  normalizedPresets.value.forEach((item: ColorPreset) => {
    const resolved = normalizeColor(item.displayColor || item.value);
    if (!seenDisplayColors.has(resolved)) {
      seenDisplayColors.add(resolved);
      result.push(item);
    }
  });
  return result;
});

const isValueInDisplayPresets = computed(() =>
  uniquePresets.value.some(
    (p: ColorPreset) => normalizeColor(p.displayColor || p.value) === currentValueResolved.value
  )
);

const customColor = computed(() =>
  !currentValueResolved.value || isValueInDisplayPresets.value ? null : props.value
);

watch(showColorPicker, (show: boolean) => {
  if (show) {
    const startColor = props.value.startsWith("#") ? props.value : "#000000";
    tempColor.value = startColor;
    hsl.value = hexToHsl(startColor);

    if (triggerRef.value) {
      const rect = triggerRef.value.getBoundingClientRect();
      popoverPos.value = {
        top: rect.top,
        left: rect.left + rect.width / 2,
      };
    }
  } else {
    popoverPos.value = null;
  }
});

const updateHsl = (key: "h" | "s" | "l", v: number) => {
  hsl.value = { ...hsl.value, [key]: v };
  const newHex = hslToHex(hsl.value.h, hsl.value.s, hsl.value.l);
  tempColor.value = newHex;
};

const handleConfirm = () => {
  if (/^#[0-9A-Fa-f]{3,6}$/.test(tempColor.value)) {
    emit("change", tempColor.value);
    showColorPicker.value = false;
  }
};

const isValidTempColor = computed(() => /^#[0-9A-Fa-f]{3,6}$/.test(tempColor.value));

const handleHexInput = (e: Event) => {
  const v = (e.target as HTMLInputElement).value;
  tempColor.value = v;
  if (/^#[0-9A-Fa-f]{3,6}$/.test(v)) {
    hsl.value = hexToHsl(v);
  }
};
</script>

<template>
  <div class="designer-colors">
    <button
      v-for="(item, idx) in uniquePresets"
      :key="`${item.value}-${idx}`"
      class="color-btn"
      :class="{
        active: normalizeColor(item.displayColor || item.value) === currentValueResolved,
      }"
      :style="{ backgroundColor: normalizeColor(item.displayColor || item.value) }"
      @click="emit('change', item.value)"
      :title="item.label || item.value"
    />

    <button
      v-if="customColor"
      class="color-btn active"
      :style="{
        backgroundColor: currentValueResolved.startsWith('#')
          ? currentValueResolved
          : 'transparent',
      }"
      @click="emit('change', customColor)"
      title="自定义颜色"
    />

    <div class="custom-color-wrapper" style="position: relative">
      <button
        ref="triggerRef"
        class="color-btn custom-color-picker"
        title="选择新颜色"
        @click="showColorPicker = !showColorPicker"
      >
        <Plus :size="14" class="plus-icon" />
      </button>

      <Teleport to="body">
        <template v-if="showColorPicker && popoverPos">
          <div
            class="color-picker-mask"
            style="position: fixed; inset: 0; z-index: 999"
            @click="showColorPicker = false"
          />
          <div
            class="custom-color-popover"
            :style="{
              position: 'fixed',
              bottom: `${window.innerHeight - popoverPos.top + 10}px`,
              left: `${popoverPos.left}px`,
              transform: 'translateX(-50%)',
              zIndex: 1000,
              margin: 0,
              top: 'auto',
              background: 'white',
            }"
          >
            <div
              class="popover-arrow"
              style="
                bottom: -6px;
                top: auto;
                border-top: none;
                border-left: none;
                border-bottom: 1px solid var(--border-light);
                border-right: 1px solid var(--border-light);
                transform: translateX(-50%) rotate(45deg);
                background: white;
              "
            />

            <div class="color-preview" :style="{ backgroundColor: tempColor }" />

            <div class="color-slider-row">
              <span class="label">H</span>
              <input
                type="range"
                min="0"
                max="360"
                :value="hsl.h"
                class="hue-slider"
                style="
                  background: linear-gradient(
                    to right,
                    #f00 0%,
                    #ff0 17%,
                    #0f0 33%,
                    #0ff 50%,
                    #00f 67%,
                    #f0f 83%,
                    #f00 100%
                  );
                "
                @input="updateHsl('h', parseInt(($event.target as HTMLInputElement).value))"
              />
            </div>

            <div class="color-slider-row">
              <span class="label">S</span>
              <input
                type="range"
                min="0"
                max="100"
                :value="hsl.s"
                class="saturation-slider"
                :style="{
                  background: `linear-gradient(to right, hsl(${hsl.h}, 0%, 50%), hsl(${hsl.h}, 100%, 50%))`,
                }"
                @input="updateHsl('s', parseInt(($event.target as HTMLInputElement).value))"
              />
            </div>

            <div class="color-slider-row">
              <span class="label">L</span>
              <input
                type="range"
                min="0"
                max="100"
                :value="hsl.l"
                class="lightness-slider"
                :style="{
                  background: `linear-gradient(to right, #000 0%, hsl(${hsl.h}, ${hsl.s}%, 50%) 50%, #fff 100%)`,
                }"
                @input="updateHsl('l', parseInt(($event.target as HTMLInputElement).value))"
              />
            </div>

            <input
              type="text"
              :value="tempColor"
              placeholder="#000000"
              @input="handleHexInput"
              @keydown.enter="handleConfirm"
            />

            <button
              class="confirm-btn"
              :disabled="!isValidTempColor"
              @click="handleConfirm"
            >
              确定
            </button>
          </div>
        </template>
      </Teleport>
    </div>
  </div>
</template>
