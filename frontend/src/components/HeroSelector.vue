<template>
  <div class="hero-row" :class="{ upgrading: isUpgrading }">
    <span class="hero-name">{{ hero.name }}</span>

    <div class="hero-controls">
      <div class="level-selector">
        <label :for="`${uniqueId}-level`" class="control-label">Level</label>
        <select
          :id="`${uniqueId}-level`"
          v-model="heroLevel"
          @change="updateHero"
          :disabled="isUpgrading"
        >
          <option v-for="level in hero.levels" :key="level" :value="level">
            {{ level }}
          </option>
        </select>
      </div>

      <div class="upgrading-toggle">
        <label :for="`${uniqueId}-upgrading`" class="toggle-label">
          <input
            :id="`${uniqueId}-upgrading`"
            type="checkbox"
            v-model="isUpgrading"
            @change="updateHero"
            class="toggle-checkbox"
          />
          <span class="toggle-display"></span>
          <span class="toggle-text">Upgrading</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watch, computed } from "vue";
import { Hero } from "../types";

export default defineComponent({
  name: "HeroSelector",
  props: {
    hero: {
      type: Object as PropType<Hero>,
      required: true,
    },
    context: {
      type: String,
      default: "army",
      validator: (value: string) => ["army", "target"].includes(value),
    },
  },
  emits: ["update:hero"],
  setup(props, { emit }) {
    // Local state
    const heroLevel = ref(props.hero.level);
    const isUpgrading = ref(props.hero.upgrading || false);

    // Generate unique ID for form elements
    const uniqueId = computed(() => {
      return `${props.context}-${props.hero.name
        .toLowerCase()
        .replace(/\s+/g, "-")}`;
    });

    // Watch for prop changes
    watch(
      () => props.hero,
      (newHero) => {
        heroLevel.value = newHero.level;
        isUpgrading.value = newHero.upgrading || false;
      },
      { deep: true }
    );

    // Update hero
    const updateHero = () => {
      emit("update:hero", {
        ...props.hero,
        level: heroLevel.value,
        upgrading: isUpgrading.value,
      });
    };

    return {
      uniqueId,
      heroLevel,
      isUpgrading,
      updateHero,
    };
  },
});
</script>

<style scoped>
.hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 12px;
  transition: background-color 0.2s;
}

.hero-row:hover {
  background: #edf2f7;
}

.hero-row.upgrading {
  background: #ffe8cc;
  border-left: 3px solid #ed8936;
}

.hero-name {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 500;
}

.hero-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.level-selector {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-label {
  font-size: 0.7rem;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

select {
  width: 70px;
  padding: 8px;
  font-size: 0.9rem;
  border: 1px solid #d1d9e6;
  border-radius: 6px;
  background-color: white;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
  padding-right: 30px;
}

select:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

select:focus {
  border-color: #3b5b6d;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 91, 109, 0.2);
}

.upgrading-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.toggle-display {
  position: relative;
  height: 20px;
  width: 36px;
  background-color: #e2e8f0;
  border-radius: 34px;
  transition: 0.3s;
  margin-right: 8px;
}

.toggle-display:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-checkbox:checked + .toggle-display {
  background-color: #ed8936;
}

.toggle-checkbox:checked + .toggle-display:before {
  transform: translateX(16px);
}

.toggle-text {
  font-size: 0.8rem;
  color: #4a5568;
}
</style>
