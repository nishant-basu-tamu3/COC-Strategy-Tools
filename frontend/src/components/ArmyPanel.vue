<template>
  <div class="panel">
    <h2>Your Army</h2>

    <!-- Town Hall Dropdown -->
    <div class="dropdown">
      <label for="your-townhall" class="label">Town Hall Level</label>
      <select
        id="your-townhall"
        v-model="selectedTownHall"
        @change="handleTownHallChange"
      >
        <option disabled value="">Select level</option>
        <option v-for="level in townHallLevels" :key="level" :value="level">
          {{ level }}
        </option>
      </select>
    </div>

    <!-- Army Capacity Progress Bar -->
    <div class="capacity-section">
      <div class="capacity-row">
        <h3>Army Capacity</h3>
        <span class="housing-count">{{ currentHousing }}/{{ maxHousing }}</span>
      </div>
      <div class="progress-bar-bg">
        <div
          class="progress-bar-fill"
          :style="{ width: housingPercent + '%' }"
          :class="{ warning: housingPercent > 95 }"
        ></div>
      </div>
    </div>

    <!-- Spell Capacity Progress Bar -->
    <div class="capacity-section">
      <div class="capacity-row">
        <h3>Spell Capacity</h3>
        <span class="housing-count"
          >{{ currentSpellSpace }}/{{ maxSpellSpace }}</span
        >
      </div>
      <div class="progress-bar-bg">
        <div
          class="progress-bar-fill spell"
          :style="{ width: spellPercent + '%' }"
          :class="{ warning: spellPercent > 95 }"
        ></div>
      </div>
    </div>

    <!-- Troops Section -->
    <div class="section">
      <div class="section-header">
        <h3>Troops</h3>
        <button
          class="add-btn"
          @click="showAddTroopModal = true"
          :disabled="availableTroopsToAdd.length === 0"
        >
          + Add Troop
        </button>
      </div>

      <div v-if="troops.length === 0" class="empty-state">
        No troops selected. Click "Add Troop" to get started.
      </div>

      <div v-else>
        <TroopSelector
          v-for="(troop, index) in troops"
          :key="troop.name"
          :troop="troop"
          :townHallLevel="selectedTownHall"
          :maxQuantity="calculateMaxQuantity(troop)"
          @update:troop="updateTroop(index, $event)"
        >
          <template #actions>
            <button
              class="remove-btn"
              @click="removeTroop(index)"
              aria-label="Remove troop"
            >
              &#x2715;
            </button>
          </template>
        </TroopSelector>
      </div>
    </div>

    <!-- Spells Section -->
    <div class="section">
      <div class="section-header">
        <h3>Spells</h3>
        <button
          class="add-btn"
          @click="showAddSpellModal = true"
          :disabled="availableSpellsToAdd.length === 0"
        >
          + Add Spell
        </button>
      </div>

      <div v-if="spells.length === 0" class="empty-state">
        No spells selected. Click "Add Spell" to get started.
      </div>

      <div v-else>
        <SpellSelector
          v-for="(spell, index) in spells"
          :key="spell.name"
          :spell="spell"
          :townHallLevel="selectedTownHall"
          :maxQuantity="calculateMaxSpellQuantity(spell)"
          @update:spell="updateSpell(index, $event)"
        >
          <template #actions>
            <button
              class="remove-btn"
              @click="removeSpell(index)"
              aria-label="Remove spell"
            >
              &#x2715;
            </button>
          </template>
        </SpellSelector>
      </div>
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
          context="army"
          @update:hero="updateHero(index, $event)"
        />
      </div>
    </div>

    <!-- Siege Machine -->
    <div class="section">
      <h3>Siege Machine</h3>
      <div class="siege-selector">
        <select v-model="selectedSiege" @change="updateSiege">
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

    <!-- Add Troop Modal -->
    <div v-if="showAddTroopModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Troop</h3>
          <button class="close-modal-btn" @click="showAddTroopModal = false">
            &#x2715;
          </button>
        </div>

        <div class="modal-body">
          <div v-if="availableTroopsToAdd.length === 0" class="empty-state">
            All available troops have been added.
          </div>

          <div v-else class="troop-list">
            <div
              v-for="troop in availableTroopsToAdd"
              :key="troop"
              class="troop-item"
              @click="addTroop(troop)"
            >
              {{ troop }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Spell Modal -->
    <div v-if="showAddSpellModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add Spell</h3>
          <button class="close-modal-btn" @click="showAddSpellModal = false">
            &#x2715;
          </button>
        </div>

        <div class="modal-body">
          <div v-if="availableSpellsToAdd.length === 0" class="empty-state">
            All available spells have been added.
          </div>

          <div v-else class="spell-list">
            <div
              v-for="spell in availableSpellsToAdd"
              :key="spell"
              class="spell-item"
              @click="addSpell(spell)"
            >
              {{ spell }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, computed, watch } from "vue";
import TroopSelector from "./TroopSelector.vue";
import SpellSelector from "./SpellSelector.vue";
import HeroSelector from "./HeroSelector.vue";
import { Troop, Spell, Hero } from "../types";

export default defineComponent({
  name: "ArmyPanel",
  components: {
    TroopSelector,
    SpellSelector,
    HeroSelector,
  },
  props: {
    modelValue: {
      type: Object as PropType<{
        townHall: number | null;
        troops: Troop[];
        spells: Spell[];
        heroes: Hero[];
        siegeMachine: string;
      }>,
      required: true,
    },
    townHallLevels: {
      type: Array as PropType<number[]>,
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
    troopHousing: {
      type: Object as PropType<Record<string, number>>,
      required: true,
    },
    spellSpace: {
      type: Object as PropType<Record<string, number>>,
      required: true,
    },
    maxTroopLevels: {
      type: Object as PropType<Record<string, Record<number, number>>>,
      required: true,
    },
    maxSpellLevels: {
      type: Object as PropType<Record<string, Record<number, number>>>,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    // Local refs
    const selectedTownHall = ref<number | null>(props.modelValue.townHall);
    const troops = ref<Troop[]>([...props.modelValue.troops]);
    const spells = ref<Spell[]>([...props.modelValue.spells]);
    const heroes = ref<Hero[]>([...props.modelValue.heroes]);
    const selectedSiege = ref(props.modelValue.siegeMachine);

    // Modal states
    const showAddTroopModal = ref(false);
    const showAddSpellModal = ref(false);

    // Watch for prop changes
    watch(
      () => props.modelValue,
      (newValue) => {
        selectedTownHall.value = newValue.townHall;
        troops.value = [...newValue.troops];
        spells.value = [...newValue.spells];
        heroes.value = [...newValue.heroes];
        selectedSiege.value = newValue.siegeMachine;
      },
      { deep: true }
    );

    // Computed properties
    const maxHousing = computed(() => {
      if (!selectedTownHall.value) return 0;
      return props.townHallData[selectedTownHall.value]?.maxHousing || 0;
    });

    const maxSpellSpace = computed(() => {
      if (!selectedTownHall.value) return 0;
      return props.townHallData[selectedTownHall.value]?.maxSpellSpace || 0;
    });

    const availableTroops = computed(() => {
      if (!selectedTownHall.value) return [];
      return props.townHallData[selectedTownHall.value]?.availableTroops || [];
    });

    const availableSpells = computed(() => {
      if (!selectedTownHall.value) return [];
      return props.townHallData[selectedTownHall.value]?.availableSpells || [];
    });

    const availableHeroes = computed(() => {
      if (!selectedTownHall.value) return [];
      return props.townHallData[selectedTownHall.value]?.availableHeroes || [];
    });

    const availableSiegeMachines = computed(() => {
      // Siege machines are typically available from TH10/11+
      if (!selectedTownHall.value || selectedTownHall.value < 10) return [];
      return props.siegeMachines;
    });

    // Calculate current housing used
    const currentHousing = computed(() => {
      return troops.value.reduce((total, troop) => {
        return total + troop.housing * troop.quantity;
      }, 0);
    });

    // Calculate current spell space used
    const currentSpellSpace = computed(() => {
      return spells.value.reduce((total, spell) => {
        return total + spell.housing * spell.quantity;
      }, 0);
    });

    // Calculate percentages for progress bars
    const housingPercent = computed(() => {
      if (maxHousing.value === 0) return 0;
      return Math.min(100, (currentHousing.value / maxHousing.value) * 100);
    });

    const spellPercent = computed(() => {
      if (maxSpellSpace.value === 0) return 0;
      return Math.min(
        100,
        (currentSpellSpace.value / maxSpellSpace.value) * 100
      );
    });

    // Compute troops that can be added
    const availableTroopsToAdd = computed(() => {
      const currentTroopNames = troops.value.map((t: Troop) => t.name);
      return availableTroops.value.filter(
        (t: string) => !currentTroopNames.includes(t)
      );
    });

    // Compute spells that can be added
    const availableSpellsToAdd = computed(() => {
      const currentSpellNames = spells.value.map((s: Spell) => s.name);
      return availableSpells.value.filter(
        (s: string) => !currentSpellNames.includes(s)
      );
    });

    // Town Hall change handler
    const handleTownHallChange = () => {
      if (!selectedTownHall.value) return;
      const thLevel = selectedTownHall.value;

      // Update troops based on availability at new TH level
      const updatedTroops = updateTroopsForTownHall(thLevel);

      // Update spells based on availability at new TH level
      const updatedSpells = updateSpellsForTownHall(thLevel);

      // Update heroes based on availability at new TH level
      const updatedHeroes = updateHeroesForTownHall(thLevel);

      // Update siege machine if not available at this TH
      const updatedSiege = thLevel >= 10 ? selectedSiege.value : "";

      // Emit updated army
      emit("update:modelValue", {
        townHall: thLevel,
        troops: updatedTroops,
        spells: updatedSpells,
        heroes: updatedHeroes,
        siegeMachine: updatedSiege,
      });
    };

    // Helper functions to update troops, spells, heroes for town hall changes
    const updateTroopsForTownHall = (thLevel: number) => {
      const availableTroopsAtTH =
        props.townHallData[thLevel]?.availableTroops || [];

      // Filter out unavailable troops and update levels
      let updatedTroops = troops.value
        .filter((troop) => availableTroopsAtTH.includes(troop.name))
        .map((troop) => {
          const maxLevel = props.maxTroopLevels[troop.name]?.[thLevel] || 1;
          return {
            ...troop,
            maxLevel: maxLevel,
            level: Math.min(troop.level, maxLevel),
          };
        });

      // If no troops remain, add default troops
      if (updatedTroops.length === 0 && availableTroopsAtTH.length > 0) {
        const defaultTroop = availableTroopsAtTH[0];
        const maxLevel = props.maxTroopLevels[defaultTroop]?.[thLevel] || 1;

        updatedTroops = [
          {
            name: defaultTroop,
            level: maxLevel,
            maxLevel: maxLevel,
            quantity: 5,
            housing: props.troopHousing[defaultTroop] || 1,
          },
        ];

        // Add second troop if available
        if (availableTroopsAtTH.length > 1) {
          const secondTroop = availableTroopsAtTH[1];
          const maxLevel2 = props.maxTroopLevels[secondTroop]?.[thLevel] || 1;

          updatedTroops.push({
            name: secondTroop,
            level: maxLevel2,
            maxLevel: maxLevel2,
            quantity: 8,
            housing: props.troopHousing[secondTroop] || 1,
          });
        }
      }

      return updatedTroops;
    };

    const updateSpellsForTownHall = (thLevel: number) => {
      const availableSpellsAtTH =
        props.townHallData[thLevel]?.availableSpells || [];

      // Filter out unavailable spells and update levels
      let updatedSpells = spells.value
        .filter((spell) => availableSpellsAtTH.includes(spell.name))
        .map((spell) => {
          const maxLevel = props.maxSpellLevels[spell.name]?.[thLevel] || 1;
          return {
            ...spell,
            maxLevel: maxLevel,
            level: Math.min(spell.level, maxLevel),
          };
        });

      // If no spells remain and spells are available at this TH level, add default spells
      if (updatedSpells.length === 0 && availableSpellsAtTH.length > 0) {
        const firstSpell = availableSpellsAtTH[0];
        const maxLevel = props.maxSpellLevels[firstSpell]?.[thLevel] || 1;

        updatedSpells = [
          {
            name: firstSpell,
            level: maxLevel,
            maxLevel: maxLevel,
            quantity: 2,
            housing: props.spellSpace[firstSpell] || 1,
          },
        ];

        // Add second spell if available
        if (availableSpellsAtTH.length > 1) {
          const secondSpell = availableSpellsAtTH[1];
          const maxLevel2 = props.maxSpellLevels[secondSpell]?.[thLevel] || 1;

          updatedSpells.push({
            name: secondSpell,
            level: maxLevel2,
            maxLevel: maxLevel2,
            quantity: 2,
            housing: props.spellSpace[secondSpell] || 1,
          });
        }
      }

      return updatedSpells;
    };

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

    // Calculate max quantities based on remaining space
    const calculateMaxQuantity = (troop: Troop) => {
      if (troop.housing === 0) return 0;
      const remainingSpace =
        maxHousing.value -
        currentHousing.value +
        troop.housing * troop.quantity;
      return Math.floor(remainingSpace / troop.housing);
    };

    const calculateMaxSpellQuantity = (spell: Spell) => {
      if (spell.housing === 0) return 0;
      const remainingSpace =
        maxSpellSpace.value -
        currentSpellSpace.value +
        spell.housing * spell.quantity;
      return Math.floor(remainingSpace / spell.housing);
    };

    // Event handlers for updates
    const updateTroop = (index: number, updatedTroop: Troop) => {
      const newTroops = [...troops.value];
      newTroops[index] = updatedTroop;
      troops.value = newTroops;

      emit("update:modelValue", {
        ...props.modelValue,
        troops: newTroops,
      });
    };

    const updateSpell = (index: number, updatedSpell: Spell) => {
      const newSpells = [...spells.value];
      newSpells[index] = updatedSpell;
      spells.value = newSpells;

      emit("update:modelValue", {
        ...props.modelValue,
        spells: newSpells,
      });
    };

    const updateHero = (index: number, updatedHero: Hero) => {
      const newHeroes = [...heroes.value];
      newHeroes[index] = updatedHero;
      heroes.value = newHeroes;

      emit("update:modelValue", {
        ...props.modelValue,
        heroes: newHeroes,
      });
    };

    const updateSiege = () => {
      emit("update:modelValue", {
        ...props.modelValue,
        siegeMachine: selectedSiege.value,
      });
    };

    const addTroop = (troopName: string) => {
      if (!selectedTownHall.value) return;
      const thLevel = selectedTownHall.value;

      // Find maximum level for this troop at current town hall
      const maxLevel = props.maxTroopLevels[troopName]?.[thLevel] || 1;

      // Get housing cost
      const housing = props.troopHousing[troopName] || 1;

      const newTroop: Troop = {
        name: troopName,
        level: maxLevel,
        maxLevel: maxLevel,
        quantity: 0,
        housing: housing,
      };

      const newTroops = [...troops.value, newTroop];
      troops.value = newTroops;

      emit("update:modelValue", {
        ...props.modelValue,
        troops: newTroops,
      });

      showAddTroopModal.value = false;
    };

    const removeTroop = (index: number) => {
      const newTroops = [...troops.value];
      newTroops.splice(index, 1);
      troops.value = newTroops;

      emit("update:modelValue", {
        ...props.modelValue,
        troops: newTroops,
      });
    };

    const addSpell = (spellName: string) => {
      if (!selectedTownHall.value) return;
      const thLevel = selectedTownHall.value;

      // Find maximum level for this spell at current town hall
      const maxLevel = props.maxSpellLevels[spellName]?.[thLevel] || 1;

      // Get spell housing cost
      const housing = props.spellSpace[spellName] || 1;

      const newSpell: Spell = {
        name: spellName,
        level: maxLevel,
        maxLevel: maxLevel,
        quantity: 0,
        housing: housing,
      };

      const newSpells = [...spells.value, newSpell];
      spells.value = newSpells;

      emit("update:modelValue", {
        ...props.modelValue,
        spells: newSpells,
      });

      showAddSpellModal.value = false;
    };

    const removeSpell = (index: number) => {
      const newSpells = [...spells.value];
      newSpells.splice(index, 1);
      spells.value = newSpells;

      emit("update:modelValue", {
        ...props.modelValue,
        spells: newSpells,
      });
    };

    return {
      // Refs
      selectedTownHall,
      troops,
      spells,
      heroes,
      selectedSiege,
      showAddTroopModal,
      showAddSpellModal,

      // Computed
      maxHousing,
      maxSpellSpace,
      currentHousing,
      currentSpellSpace,
      housingPercent,
      spellPercent,
      availableTroops,
      availableSpells,
      availableHeroes,
      availableSiegeMachines,
      availableTroopsToAdd,
      availableSpellsToAdd,

      // Methods
      handleTownHallChange,
      calculateMaxQuantity,
      calculateMaxSpellQuantity,
      updateTroop,
      updateSpell,
      updateHero,
      updateSiege,
      addTroop,
      removeTroop,
      addSpell,
      removeSpell,
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
  margin: 0;
  color: #1a2b33;
}

.label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 6px;
  color: #4a5568;
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

.capacity-section {
  margin-top: 8px;
}

.capacity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.housing-count {
  font-size: 0.9rem;
  color: #4a5568;
  font-weight: 500;
}

.progress-bar-bg {
  width: 100%;
  height: 10px;
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

.progress-bar-fill.spell {
  background: #805ad5;
}

.progress-bar-fill.warning {
  background: #ed8936;
}

.section {
  margin-top: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.add-btn {
  background: #e6fffa;
  color: #234e52;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #b2f5ea;
}

.add-btn:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.empty-state {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
}

.remove-btn {
  background: none;
  border: none;
  color: #e53e3e;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.remove-btn:hover {
  opacity: 1;
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
  margin-top: 8px;
}

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #4a5568;
}

.modal-body {
  padding: 20px;
  max-height: 50vh;
  overflow-y: auto;
}

.troop-list,
.spell-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.troop-item,
.spell-item {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid #e2e8f0;
}

.troop-item:hover {
  background: #e6fffa;
  border-color: #38b2ac;
}

.spell-item:hover {
  background: #f0e7ff;
  border-color: #805ad5;
}

@media (max-width: 500px) {
  .panel {
    width: 100%;
  }

  .troop-list,
  .spell-list {
    grid-template-columns: 1fr;
  }
}
</style>
