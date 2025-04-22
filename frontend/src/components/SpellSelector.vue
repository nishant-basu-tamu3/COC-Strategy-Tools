<template>
  <div class="spell-row">
    <span class="spell-name">{{ spell.name }}</span>

    <div class="spell-controls">
      <div class="level-selector">
        <label :for="`${uniqueId}-level`" class="control-label">Level</label>
        <select
          :id="`${uniqueId}-level`"
          v-model="spellLevel"
          @change="updateSpell"
        >
          <option
            v-for="level in availableLevels"
            :key="level"
            :value="level"
            :disabled="level > spell.maxLevel"
          >
            {{ level }}
          </option>
        </select>
      </div>

      <div class="quantity-selector">
        <label :for="`${uniqueId}-quantity`" class="control-label">Qty</label>
        <input
          :id="`${uniqueId}-quantity`"
          type="number"
          min="0"
          :max="maxQuantity"
          v-model.number="spellQuantity"
          @blur="updateSpell"
          @keyup.enter="updateSpell"
        />
      </div>

      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, computed, watch } from "vue";
import { Spell } from "../types";

export default defineComponent({
  name: "SpellSelector",
  props: {
    spell: {
      type: Object as PropType<Spell>,
      required: true,
    },
    townHallLevel: {
      type: Number as PropType<number | null>,
      required: true,
    },
    maxQuantity: {
      type: Number,
      default: 11,
    },
  },
  emits: ["update:spell"],
  setup(props, { emit }) {
    // Local state
    const spellLevel = ref(props.spell.level);
    const spellQuantity = ref(props.spell.quantity);

    // Generate unique ID for form elements
    const uniqueId = computed(() => {
      return `spell-${props.spell.name.toLowerCase().replace(/\s+/g, "-")}`;
    });

    // Available levels
    const availableLevels = computed(() => {
      const maxLevel = props.spell.maxLevel || 8; // Use a reasonable default max level
      return Array.from({ length: maxLevel }, (_, i) => i + 1);
    });

    // Watch for prop changes
    watch(
      () => props.spell,
      (newSpell) => {
        spellLevel.value = newSpell.level;
        spellQuantity.value = newSpell.quantity;
      },
      { deep: true }
    );

    // Watch for town hall level changes
    watch(
      () => props.townHallLevel,
      () => {
        // If current level is greater than max level, reset to max level
        if (spellLevel.value > props.spell.maxLevel) {
          spellLevel.value = props.spell.maxLevel;
          updateSpell();
        }
      }
    );

    // Update spell
    const updateSpell = () => {
      // Ensure valid quantity
      if (spellQuantity.value < 0) {
        spellQuantity.value = 0;
      }

      if (spellQuantity.value > props.maxQuantity) {
        spellQuantity.value = props.maxQuantity;
      }

      // Ensure valid level
      if (spellLevel.value > props.spell.maxLevel) {
        spellLevel.value = props.spell.maxLevel;
      }

      // Update spell
      emit("update:spell", {
        ...props.spell,
        level: spellLevel.value,
        quantity: spellQuantity.value,
      });
    };

    return {
      uniqueId,
      spellLevel,
      spellQuantity,
      availableLevels,
      updateSpell,
    };
  },
});
</script>

<style scoped>
.spell-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 12px;
  transition: background-color 0.2s;
}

.spell-row:hover {
  background: #edf2f7;
}

.spell-name {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 500;
}

.spell-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.level-selector,
.quantity-selector {
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

select,
input {
  width: 70px;
  padding: 8px;
  font-size: 0.9rem;
  border: 1px solid #d1d9e6;
  border-radius: 6px;
  background-color: white;
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
  padding-right: 30px;
}

input {
  text-align: center;
}

input:focus,
select:focus {
  border-color: #3b5b6d;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 91, 109, 0.2);
}
</style>
