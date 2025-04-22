<template>
  <div class="toggle-item">
    <input
      type="checkbox"
      :id="id"
      v-model="isEnabled"
      class="toggle-checkbox"
      @change="updateToggle"
    />
    <label :for="id" class="toggle-label">
      <span class="toggle-switch"></span>
    </label>
    <span class="toggle-text">{{ label }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";

export default defineComponent({
  name: "ToggleSwitch",
  props: {
    label: {
      type: String,
      required: true,
    },
    modelValue: {
      type: Boolean,
      default: false,
    },
    id: {
      type: String,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    // Local state
    const isEnabled = ref(props.modelValue);

    // Watch for prop changes
    watch(
      () => props.modelValue,
      (newValue) => {
        isEnabled.value = newValue;
      }
    );

    // Update toggle
    const updateToggle = () => {
      emit("update:modelValue", isEnabled.value);
    };

    return {
      isEnabled,
      updateToggle,
    };
  },
});
</script>

<style scoped>
.toggle-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
}

.toggle-text {
  font-size: 0.95rem;
  user-select: none;
}

.toggle-checkbox {
  display: none;
}

.toggle-label {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  background-color: #e0e7ef;
  border-radius: 24px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.toggle-switch {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: left 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle-checkbox:checked + .toggle-label {
  background-color: #3b5b6d;
}

.toggle-checkbox:checked + .toggle-label .toggle-switch {
  left: 26px;
}
</style>
