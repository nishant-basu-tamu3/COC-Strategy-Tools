<template>
  <div class="panel">
    <h2>Target Base</h2>

    <!-- Town Hall Dropdown -->
    <div class="dropdown">
      <label for="target-townhall" class="label">Town Hall Level</label>
      <select
        id="target-townhall"
        v-model="selectedTownHall"
        @change="handleTownHallChange"
      >
        <option disabled value="">Select level</option>
        <option v-for="level in townHallLevels" :key="level" :value="level">
          {{ level }}
        </option>
      </select>
    </div>

    <!-- Base Layout Dropdown -->
    <div class="dropdown">
      <label for="base-layout" class="label">Base Layout</label>
      <select
        id="base-layout"
        v-model="selectedBaseLayout"
        @change="updateTargetBase"
      >
        <option v-for="layout in baseLayouts" :key="layout" :value="layout">
          {{ layout }}
        </option>
      </select>
    </div>

    <!-- Toggle Options -->
    <div class="toggle-section">
      <ToggleSwitch
        v-for="(toggle, index) in toggleOptions"
        :key="index"
        :id="`toggle-${index}`"
        :label="toggle.label"
        v-model="toggle.enabled"
        @update:modelValue="updateToggles"
      />
    </div>

    <!-- Heroes Section -->
    <div class="section">
      <h3>Heroes</h3>

      <div v-if="heroes.length === 0" class="empty-state">
        No heroes available at this Town Hall level.
      </div>

      <div v-else>
        <HeroSelector
          v-for="(hero, index) in heroes"
          :key="hero.name"
          :hero="hero"
          context="target"
          @update:hero="updateHero(index, $event)"
        />
      </div>
    </div>

    <!-- Clan Castle Section -->
    <div class="section" v-if="isClanCastleEnabled">
      <h3>Clan Castle</h3>

      <div class="cc-options">
        <div class="cc-row">
          <label for="cc-troops" class="label">Troops</label>
          <select
            id="cc-troops"
            v-model="clanCastleTroops"
            @change="updateClanCastle"
          >
            <option value="mixed">Mixed Troops</option>
            <option value="balloons">Balloons</option>
            <option value="edrag">Electro Dragon</option>
            <option value="super">Super Troops</option>
            <option value="none">Empty</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Siege Machine -->
    <div class="section" v-if="siegeMachinesAvailable">
      <h3>Siege Machine</h3>
      <div class="siege-selector">
        <select v-model="selectedSiege" @change="updateTargetBase">
          <option value="">None</option>
          <option
            v-for="machine in availableSiegeMachines"
            :key="machine"
            :value="machine"
          >
            {{ machine }}
          </option>
        </select>
      </div>
    </div>

    <!-- Base Preview (Placeholder) -->
    <div class="base-preview">
      <SimplifiedBasePreview
        :baseLayout="selectedBaseLayout"
        :townHallLevel="selectedTownHall"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, computed, watch } from "vue";
import ToggleSwitch from "./ToggleSwitch.vue";
import HeroSelector from "./HeroSelector.vue";
import SimplifiedBasePreview from "./SimplifiedBasePreview.vue";
import { Hero, Toggle } from "../types";

export default defineComponent({
  name: "TargetPanel",
  components: {
    ToggleSwitch,
    HeroSelector,
    SimplifiedBasePreview,
  },
  props: {
    modelValue: {
      type: Object as PropType<{
        townHall: number | null;
        baseLayout: string;
        toggleOptions: Toggle[];
        heroes: Hero[];
        siegeMachine: string;
        clanCastle?: {
          troops: string;
        };
      }>,
      required: true,
    },
    townHallLevels: {
      type: Array as PropType<number[]>,
      default: () => [],
    },
    baseLayouts: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    siegeMachines: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    townHallData: {
      type: Object as PropType<Record<number, any>>,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    // Local refs
    const selectedTownHall = ref<number | null>(props.modelValue.townHall);
    const selectedBaseLayout = ref(props.modelValue.baseLayout);
    const toggleOptions = ref<Toggle[]>([...props.modelValue.toggleOptions]);
    const heroes = ref<Hero[]>([...props.modelValue.heroes]);
    const selectedSiege = ref(props.modelValue.siegeMachine);
    const clanCastleTroops = ref(
      props.modelValue.clanCastle?.troops || "mixed"
    );

    // Computed properties
    const isClanCastleEnabled = computed(() => {
      return (
        toggleOptions.value.find((t) => t.label === "Enable Clan Castle troops")
          ?.enabled || false
      );
    });

    const siegeMachinesAvailable = computed(() => {
      return selectedTownHall.value !== null && selectedTownHall.value >= 10;
    });

    const availableSiegeMachines = computed(() => {
      if (!siegeMachinesAvailable.value) return [];
      return props.siegeMachines;
    });

    // Watch for prop changes
    watch(
      () => props.modelValue,
      (newValue) => {
        selectedTownHall.value = newValue.townHall;
        selectedBaseLayout.value = newValue.baseLayout;
        toggleOptions.value = [...newValue.toggleOptions];
        heroes.value = [...newValue.heroes];
        selectedSiege.value = newValue.siegeMachine;
        clanCastleTroops.value = newValue.clanCastle?.troops || "mixed";
      },
      { deep: true }
    );

    // Town Hall change handler
    const handleTownHallChange = () => {
      if (!selectedTownHall.value) return;
      const thLevel = selectedTownHall.value;

      // Update heroes based on TH level
      const updatedHeroes = updateHeroesForTownHall(thLevel);

      // Update siege machine if not available at this TH
      const updatedSiege = thLevel >= 10 ? selectedSiege.value : "";

      // Emit updated base
      emit("update:modelValue", {
        ...props.modelValue,
        townHall: thLevel,
        heroes: updatedHeroes,
        siegeMachine: updatedSiege,
      });
    };

    // Update heroes for town hall level
    const updateHeroesForTownHall = (thLevel: number) => {
      const availableHeroesAtTH =
        props.townHallData[thLevel]?.availableHeroes || [];
      const maxHeroLevels = props.townHallData[thLevel]?.maxHeroLevels || {};

      // Create updated heroes list based on what's available at this TH level
      return availableHeroesAtTH.map((heroName: string) => {
        const maxLevel = maxHeroLevels[heroName] || 0;

        // Try to find existing hero to preserve settings
        const existingHero = heroes.value.find((h) => h.name === heroName);

        if (existingHero) {
          return {
            ...existingHero,
            level: Math.min(existingHero.level, maxLevel),
            levels: Array.from({ length: maxLevel }, (_, i) => i + 1),
          };
        } else {
          // Create new hero entry
          return {
            name: heroName,
            level: maxLevel,
            levels: Array.from({ length: maxLevel }, (_, i) => i + 1),
            upgrading: false,
          };
        }
      });
    };

    // Update target base
    const updateTargetBase = () => {
      emit("update:modelValue", {
        ...props.modelValue,
        townHall: selectedTownHall.value,
        baseLayout: selectedBaseLayout.value,
        siegeMachine: selectedSiege.value,
      });
    };

    // Update toggles
    const updateToggles = () => {
      emit("update:modelValue", {
        ...props.modelValue,
        toggleOptions: [...toggleOptions.value],
      });

      // If clan castle toggle is turned off, update clan castle troops
      if (!isClanCastleEnabled.value && props.modelValue.clanCastle) {
        updateClanCastle();
      }
    };

    // Update hero
    const updateHero = (index: number, updatedHero: Hero) => {
      const newHeroes = [...heroes.value];
      newHeroes[index] = updatedHero;
      heroes.value = newHeroes;

      emit("update:modelValue", {
        ...props.modelValue,
        heroes: newHeroes,
      });
    };

    // Update clan castle
    const updateClanCastle = () => {
      if (isClanCastleEnabled.value) {
        emit("update:modelValue", {
          ...props.modelValue,
          clanCastle: {
            troops: clanCastleTroops.value,
          },
        });
      } else {
        emit("update:modelValue", {
          ...props.modelValue,
          clanCastle: {
            troops: "none",
          },
        });
      }
    };

    return {
      // Refs
      selectedTownHall,
      selectedBaseLayout,
      toggleOptions,
      heroes,
      selectedSiege,
      clanCastleTroops,

      // Computed
      isClanCastleEnabled,
      siegeMachinesAvailable,
      availableSiegeMachines,

      // Methods
      handleTownHallChange,
      updateTargetBase,
      updateToggles,
      updateHero,
      updateClanCastle,
    };
  },
});
</script>

<style scoped>
.panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 24px;
  width: 400px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1a2b33;
}

h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1a2b33;
}

.label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 6px;
  color: #4a5568;
}

.dropdown {
  margin-bottom: 12px;
}

.dropdown select {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  border: 1px solid #d1d9e6;
  border-radius: 8px;
  background-color: #fff;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
}

.section {
  margin-top: 16px;
}

.toggle-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

.empty-state {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}

.cc-options {
  margin-top: 8px;
}

.cc-row {
  margin-bottom: 12px;
}

.cc-row select {
  width: 100%;
  padding: 10px;
  font-size: 0.95rem;
  border: 1px solid #d1d9e6;
  border-radius: 8px;
  background-color: #fff;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
  padding-right: 30px;
}

.siege-selector select {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  border: 1px solid #d1d9e6;
  border-radius: 8px;
  background-color: #fff;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
}

.base-preview {
  margin-top: 16px;
}

.preview-container {
  width: 100%;
  aspect-ratio: 1;
  background: #f8fafc;
  border: 1px dashed #cbd5e0;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 8px;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 0.9rem;
}

@media (max-width: 500px) {
  .panel {
    width: 100%;
  }
}
</style>
