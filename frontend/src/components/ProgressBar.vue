<template>
  <div class="progress-row">
    <span class="count-label">
      <b>{{ current }}</b
      >/{{ max }}
    </span>
    <div class="progress-bar-bg">
      <div
        class="progress-bar-fill"
        :style="{ width: percentage + '%' }"
        :class="{ warning: percentage > 90 }"
      ></div>
    </div>
    <span v-if="extraText" class="extra-text">{{ extraText }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "ProgressBar",
  props: {
    current: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
    extraText: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const percentage = computed(() => {
      return Math.min(100, (props.current / props.max) * 100);
    });

    return {
      percentage,
    };
  },
});
</script>

<style scoped>
.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
}

.count-label,
.extra-text {
  font-size: 0.9rem;
  color: #435762;
  white-space: nowrap;
}

.progress-bar-bg {
  flex: 1;
  height: 12px;
  background: #e0e7ef;
  border-radius: 8px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #3b5b6d;
  border-radius: 8px;
  transition: width 0.3s;
}

.progress-bar-fill.warning {
  background: #e67e22;
}
</style>
