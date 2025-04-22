<template>
  <div class="app-bg">
    <h1 class="title">Attack Simulator</h1>

    <!-- Loading Indicator -->
    <div
      v-if="(isLoading || isSimulating) && !showResults"
      class="loading-container"
    >
      <div class="loading-spinner"></div>
      <p class="loading-text">
        {{ isLoading ? "Loading game data..." : "Simulating attack..." }}
      </p>
    </div>

    <!-- Error Message -->
    <div v-else-if="loadingError" class="error-container">
      <p class="error-message">{{ loadingError }}</p>
      <button @click="loadGameData" class="retry-btn">Retry</button>
    </div>

    <!-- Main Content (only show when loaded) -->
    <div v-else>
      <div class="main-panels">
        <!-- Army Panel (Left Side) -->
        <ArmyPanel
          :modelValue="army"
          @update:modelValue="updateArmy"
          :townHallLevels="townHallLevels"
          :siegeMachines="siegeMachines"
          :townHallData="townHallData"
          :troopHousing="troopHousing"
          :spellSpace="spellSpace"
          :maxTroopLevels="maxTroopLevels"
          :maxSpellLevels="maxSpellLevels"
        />

        <!-- Target Panel (Right Side) -->
        <TargetPanel
          :modelValue="targetBase"
          @update:modelValue="updateTargetBase"
          :townHallLevels="townHallLevels"
          :baseLayouts="baseLayouts"
          :siegeMachines="siegeMachines"
          :townHallData="townHallData"
        />
      </div>

      <!-- Full-width Simulate Button -->
      <div class="simulate-button-container">
        <button
          class="simulate-btn"
          @click="simulateAttackHandler"
          :disabled="!canSimulate || isSimulating"
        >
          {{ isSimulating ? "Simulating..." : "Simulate Attack" }}
        </button>
      </div>
    </div>
    <div v-if="showResults" class="results-modal">
      <div class="results-content">
        <!-- Results Header -->
        <div class="results-header">
          <h2>Battle Results</h2>
          <div class="stars-container">
            <span
              v-for="i in 3"
              :key="i"
              class="star"
              :class="{ active: i <= simulationResults.stars }"
              >★</span
            >
          </div>
        </div>

        <!-- Results Summary -->
        <div class="results-summary">
          <div class="summary-left">
            <div
              class="result-badge"
              :class="getEffectivenessClass(simulationResults.effectiveness)"
            >
              {{ simulationResults.effectiveness }}
            </div>

            <div class="destruction-info">
              <div class="destruction-label">Destruction:</div>
              <div class="destruction-bar-container">
                <div
                  class="destruction-bar"
                  :style="{
                    width: `${simulationResults.destructionPercentage}%`,
                  }"
                  :class="
                    getDestructionClass(simulationResults.destructionPercentage)
                  "
                ></div>
                <span class="destruction-percentage"
                  >{{ simulationResults.destructionPercentage }}%</span
                >
              </div>
            </div>
          </div>

          <div class="summary-right" v-if="simulationResults.armyStrength">
            <div class="army-strength">
              <div class="strength-label">Army Strength</div>
              <div class="strength-meter">
                <div
                  class="strength-fill"
                  :style="{ width: `${simulationResults.armyStrength}%` }"
                  :class="getStrengthClass(simulationResults.armyStrength)"
                ></div>
                <span class="strength-value">{{
                  simulationResults.armyStrength
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Battle Details -->
        <div class="battle-details">
          <!-- Main Battle Summary -->
          <div class="detail-section summary-section">
            <h3>Battle Summary</h3>
            <div class="section-content">
              <p>{{ simulationResults.message }}</p>
            </div>
          </div>

          <!-- Strategy Analysis (if available) -->
          <div
            v-if="simulationResults.sections?.strategy"
            class="detail-section strategy-section"
          >
            <h3>Strategy Analysis</h3>
            <div class="section-content">
              <p>{{ simulationResults.sections.strategy }}</p>
            </div>
          </div>

          <!-- Key Moments (if available) -->
          <div
            v-if="simulationResults.sections?.keyMoments"
            class="detail-section moments-section"
          >
            <h3>Key Moments</h3>
            <div class="section-content">
              <p>{{ simulationResults.sections.keyMoments }}</p>
            </div>
          </div>

          <!-- Recommendations (if available) -->
          <div
            v-if="simulationResults.sections?.recommendations"
            class="detail-section recommendations-section"
          >
            <h3>Recommendations</h3>
            <div class="section-content">
              <p>{{ simulationResults.sections.recommendations }}</p>
            </div>
          </div>
        </div>

        <!-- Result Actions -->
        <div class="results-actions">
          <button @click="runNewSimulation" class="action-btn new-sim-btn">
            New Simulation
          </button>
          <button @click="showResults = false" class="action-btn close-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  ref,
  computed,
  watch,
  onMounted,
} from "vue";
import ArmyPanel from "../components/ArmyPanel.vue";
import TargetPanel from "../components/TargetPanel.vue";
import { Troop, Spell, Hero, Toggle } from "../types";
import { getGameData, simulateAttack } from "../services/api";

export default defineComponent({
  name: "SimulatorView",
  components: {
    ArmyPanel,
    TargetPanel,
  },
  setup() {
    // Data state references for API data
    const isLoading = ref(true);
    const isSimulating = ref(false);
    const loadingError = ref<string | null>(null);
    const showResults = ref(false);

    // Game data
    const townHallLevels = ref<number[]>([]);
    const baseLayouts = ref<string[]>([]);
    const siegeMachines = ref<string[]>([]);
    const townHallData = ref<Record<number, any>>({});
    const troopHousing = ref<Record<string, number>>({});
    const spellSpace = ref<Record<string, number>>({});
    const maxTroopLevels = ref<Record<string, Record<number, number>>>({});
    const maxSpellLevels = ref<Record<string, Record<number, number>>>({});

    // Army and target base state
    const army = ref({
      townHall: null as number | null,
      troops: [] as Troop[],
      spells: [] as Spell[],
      heroes: [] as Hero[],
      siegeMachine: "",
    });

    const targetBase = ref({
      townHall: null as number | null,
      baseLayout: "",
      toggleOptions: [
        { label: "Max defense levels", enabled: true },
        { label: "Enable traps", enabled: true },
        { label: "Enable Clan Castle troops", enabled: true },
      ] as Toggle[],
      heroes: [] as Hero[],
      siegeMachine: "",
    });

    // Simulation results
    const simulationResults = reactive({
      stars: 0,
      destructionPercentage: 0,
      effectiveness: "",
      armyStrength: 0,
      message: "",
      sections: {
        summary: "",
        strategy: "",
        keyMoments: "",
        recommendations: "",
      },
    });

    // Load game data
    const loadGameData = () => {
      try {
        isLoading.value = true;
        loadingError.value = null;

        // Fetch game data
        const data = getGameData();

        // Set data
        townHallData.value = data.townHallData || {};
        troopHousing.value = data.troopHousing || {};
        spellSpace.value = data.spellSpace || {};
        maxTroopLevels.value = data.maxTroopLevels || {};
        maxSpellLevels.value = data.maxSpellLevels || {};

        // Set options
        townHallLevels.value = Object.keys(data.townHallData || {})
          .map(Number)
          .sort((a, b) => a - b);
        baseLayouts.value = data.baseLayouts || [];
        siegeMachines.value = data.siegeMachines || [];

        // Set defaults
        if (townHallLevels.value.length > 0) {
          // Default to TH9 if available, otherwise use the highest available
          const defaultTH = townHallLevels.value.includes(9)
            ? 9
            : townHallLevels.value[townHallLevels.value.length - 1];

          // Initialize army and target base with default TH
          initializeWithDefaultTownHall(defaultTH);
        }

        console.log("Game data loaded successfully");
      } catch (error) {
        console.error("Failed to load game data:", error);
        loadingError.value = "Failed to load game data. Please try again.";
      } finally {
        isLoading.value = false;
      }
    };

    // Initialize with default town hall
    const initializeWithDefaultTownHall = (thLevel: number) => {
      // Set town hall levels
      army.value.townHall = thLevel;
      targetBase.value.townHall = thLevel;

      // Set default base layout
      if (baseLayouts.value.length > 0) {
        targetBase.value.baseLayout = baseLayouts.value[0];
      }

      // Set default siege machine
      if (siegeMachines.value.length > 0) {
        army.value.siegeMachine = siegeMachines.value[0];
        targetBase.value.siegeMachine = siegeMachines.value[0];
      }

      // Initialize army with troops/spells/heroes based on TH level
      initializeArmyWithDefaultValues(thLevel);

      // Initialize target base with default heroes
      initializeTargetWithDefaultValues(thLevel);
    };

    // Initialize army with default values
    const initializeArmyWithDefaultValues = (thLevel: number) => {
      const thData = townHallData.value[thLevel];
      if (!thData) return;

      // Clear existing data
      army.value.troops = [];
      army.value.spells = [];
      army.value.heroes = [];

      // Add default troops
      const availableTroops = thData.availableTroops || [];
      if (availableTroops.length > 0) {
        // Add first troop
        const firstTroop = availableTroops[0];
        const maxLevel = maxTroopLevels.value[firstTroop]?.[thLevel] || 1;

        army.value.troops.push({
          name: firstTroop,
          level: maxLevel,
          maxLevel: maxLevel,
          quantity: 5,
          housing: troopHousing.value[firstTroop] || 1,
        });

        // Add second troop if available
        if (availableTroops.length > 1) {
          const secondTroop = availableTroops[1];
          const maxLevel2 = maxTroopLevels.value[secondTroop]?.[thLevel] || 1;

          army.value.troops.push({
            name: secondTroop,
            level: maxLevel2,
            maxLevel: maxLevel2,
            quantity: 8,
            housing: troopHousing.value[secondTroop] || 1,
          });
        }
      }

      // Add default spells
      const availableSpells = thData.availableSpells || [];
      if (availableSpells.length > 0) {
        // Add first spell
        const firstSpell = availableSpells[0];
        const maxLevel = maxSpellLevels.value[firstSpell]?.[thLevel] || 1;

        army.value.spells.push({
          name: firstSpell,
          level: maxLevel,
          maxLevel: maxLevel,
          quantity: 2,
          housing: spellSpace.value[firstSpell] || 1,
        });

        // Add second spell if available
        if (availableSpells.length > 1) {
          const secondSpell = availableSpells[1];
          const maxLevel2 = maxSpellLevels.value[secondSpell]?.[thLevel] || 1;

          army.value.spells.push({
            name: secondSpell,
            level: maxLevel2,
            maxLevel: maxLevel2,
            quantity: 2,
            housing: spellSpace.value[secondSpell] || 1,
          });
        }
      }

      // Add heroes
      const availableHeroes = thData.availableHeroes || [];
      const maxHeroLevels = thData.maxHeroLevels || {};

      army.value.heroes = availableHeroes.map((heroName: string) => {
        const maxLevel = maxHeroLevels[heroName] || 0;
        return {
          name: heroName,
          level: maxLevel,
          levels: Array.from({ length: maxLevel }, (_, i) => i + 1),
          upgrading: false,
        };
      });
    };

    // Initialize target base with default values
    const initializeTargetWithDefaultValues = (thLevel: number) => {
      const thData = townHallData.value[thLevel];
      if (!thData) return;

      // Clear existing heroes
      targetBase.value.heroes = [];

      // Add heroes
      const availableHeroes = thData.availableHeroes || [];
      const maxHeroLevels = thData.maxHeroLevels || {};

      targetBase.value.heroes = availableHeroes.map((heroName: string) => {
        const maxLevel = maxHeroLevels[heroName] || 0;
        return {
          name: heroName,
          level: maxLevel,
          levels: Array.from({ length: maxLevel }, (_, i) => i + 1),
          upgrading: false,
        };
      });
    };

    // Update army
    const updateArmy = (newArmy: any) => {
      army.value = newArmy;
    };

    // Update target base
    const updateTargetBase = (newTargetBase: any) => {
      targetBase.value = newTargetBase;
    };

    // Check if simulation can be run
    const canSimulate = computed(() => {
      if (isLoading.value) return false;
      if (!army.value.townHall || !targetBase.value.townHall) return false;

      // Check if there are troops with quantity > 0
      const hasTroops = army.value.troops.some((troop) => troop.quantity > 0);
      return hasTroops;
    });

    const formatSimulationText = (text: string) => {
      // Remove trailing # symbols at the end of sections
      text = text.replace(/\s*#\s*$/gm, "");

      // Remove ** for bold (since they're not rendering)
      text = text.replace(/\*\*(.*?)\*\*/g, "$1");

      return text;
    };

    // Simulation handler
    const simulateAttackHandler = async () => {
      try {
        isLoading.value = false;
        isSimulating.value = true;
        loadingError.value = null;

        // Prepare the request payload
        const payload = {
          army: {
            townHall: army.value.townHall,
            troops: army.value.troops,
            spells: army.value.spells,
            heroes: army.value.heroes,
            siegeMachine: army.value.siegeMachine,
          },
          target: {
            townHall: targetBase.value.townHall,
            baseLayout: targetBase.value.baseLayout,
            toggleOptions: targetBase.value.toggleOptions,
            heroes: targetBase.value.heroes,
            siegeMachine: targetBase.value.siegeMachine,
          },
        };

        // Call the API
        const result = await simulateAttack(payload.army, payload.target);

        // Process and store all available result data
        simulationResults.stars = result.stars;
        simulationResults.destructionPercentage = result.destructionPercentage;
        simulationResults.effectiveness = result.effectiveness;
        simulationResults.message = result.message;

        // Store army strength if available
        if (result.armyStrength) {
          simulationResults.armyStrength = result.armyStrength;
        }

        // Store detailed sections if available
        // if (result.sections) {
        //   simulationResults.sections = result.sections;
        // } else if (result.fullResults && result.fullResults.sections) {
        //   simulationResults.sections = result.fullResults.sections;
        // }

        if (result.sections) {
          // Format each section
          simulationResults.sections = {
            summary: result.sections.summary
              ? formatSimulationText(result.sections.summary)
              : "",
            strategy: result.sections.strategy
              ? formatSimulationText(result.sections.strategy)
              : "",
            keyMoments: result.sections.keyMoments
              ? formatSimulationText(result.sections.keyMoments)
              : "",
            recommendations: result.sections.recommendations
              ? formatSimulationText(result.sections.recommendations)
              : "",
          };
        } else if (result.fullResults && result.fullResults.sections) {
          // Format fullResults sections similarly
          simulationResults.sections = {
            summary: result.fullResults.sections.summary
              ? formatSimulationText(result.fullResults.sections.summary)
              : "",
            strategy: result.fullResults.sections.strategy
              ? formatSimulationText(result.fullResults.sections.strategy)
              : "",
            keyMoments: result.fullResults.sections.keyMoments
              ? formatSimulationText(result.fullResults.sections.keyMoments)
              : "",
            recommendations: result.fullResults.sections.recommendations
              ? formatSimulationText(
                  result.fullResults.sections.recommendations
                )
              : "",
          };
        }

        // Show results modal
        showResults.value = true;
      } catch (error) {
        console.error("Simulation failed:", error);
        loadingError.value = "Failed to simulate attack. Please try again.";
      } finally {
        isSimulating.value = false;
      }
    };

    // Helper functions for UI
    const getEffectivenessClass = (effectiveness: string | number): string => {
      if (typeof effectiveness === "string") {
        const effectivenessLower = effectiveness.toLowerCase();
        if (effectivenessLower === "excellent") return "excellent";
        if (effectivenessLower === "good") return "good";
        if (effectivenessLower === "fair") return "fair";
        return "poor";
      } else if (typeof effectiveness === "number") {
        if (effectiveness >= 90) return "excellent";
        if (effectiveness >= 70) return "good";
        if (effectiveness >= 50) return "fair";
        return "poor";
      }
      return "poor";
    };

    const getDestructionClass = (destruction: number): string => {
      if (destruction >= 80) return "good";
      if (destruction >= 50) return "fair";
      return "poor";
    };

    const getStrengthClass = (strength: number): string => {
      if (strength >= 80) return "high";
      if (strength >= 50) return "medium";
      return "low";
    };

    const runNewSimulation = (): void => {
      showResults.value = false;
      // Add any additional reset logic if needed
    };

    // Load data on mount
    onMounted(() => {
      loadGameData();
    });

    return {
      // State
      isLoading,
      isSimulating,
      loadingError,
      showResults,

      // Data
      townHallLevels,
      baseLayouts,
      siegeMachines,
      townHallData,
      troopHousing,
      spellSpace,
      maxTroopLevels,
      maxSpellLevels,

      // Models
      army,
      targetBase,
      simulationResults,

      // Computed
      canSimulate,

      // Methods
      loadGameData,
      updateArmy,
      updateTargetBase,
      simulateAttackHandler,
      getEffectivenessClass,
      getDestructionClass,
      getStrengthClass,
      runNewSimulation,
    };
  },
});
</script>

<style scoped>
.app-bg {
  background: #f7faf9;
  min-height: 100vh;
  padding: 32px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  display: flex;
  flex-direction: column;
}

.title {
  text-align: center;
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 24px;
  color: #1a2b33;
}

.main-panels {
  display: flex;
  gap: 32px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

/* Loading styles */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  margin: 40px auto;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #e2e8f0;
  border-radius: 50%;
  border-top-color: #3b5b6d;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 1.1rem;
  color: #4a5568;
}

.error-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 24px;
  margin: 32px auto;
  text-align: center;
  max-width: 450px;
}

.error-message {
  color: #e53e3e;
  margin-bottom: 16px;
}

.retry-btn {
  background: #3b5b6d;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #2c4250;
}

/* Simulate Button */
.simulate-button-container {
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 0 16px;
}

.simulate-btn {
  width: 100%;
  padding: 16px;
  font-size: 1.2rem;
  font-weight: 600;
  background: #3b5b6d;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.simulate-btn:hover {
  background: #2c4250;
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.12);
}

.simulate-btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.simulate-btn:disabled {
  background: #a0aec0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Results Modal */

.results-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.results-content h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #1a2b33;
  font-size: 1.8rem;
}

.results-details {
  margin: 24px 0;
}

.result-row {
  display: flex;
  align-items: center;
  margin: 16px 0;
}

.result-label {
  width: 120px;
  font-weight: 600;
  color: #4a5568;
}

.result-bar-container {
  flex: 1;
  height: 24px;
  background: #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.result-bar {
  height: 100%;
  transition: width 0.5s ease-out;
}

.result-bar.poor {
  background: #f56565;
}

.result-bar.average {
  background: #ed8936;
}

.result-bar.good {
  background: #48bb78;
}

.result-value {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.stars-container {
  display: flex;
  gap: 8px;
}

.star {
  font-size: 28px;
  color: #e2e8f0;
}

.star.active {
  color: #ecc94b;
}

.result-message-container {
  margin: 24px 0;
}

.result-message-container h3 {
  margin-bottom: 8px;
  color: #3b5b6d;
  font-size: 1.2rem;
}

.result-message-scroll {
  max-height: 200px;
  overflow-y: auto;
  padding: 0 8px;
  border-radius: 8px;
  background: #e6fffa;
  border-left: 4px solid #38b2ac;
}

.result-message {
  padding: 16px 8px;
  font-weight: 500;
  color: #234e52;
  white-space: pre-line;
}

.results-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.results-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header Styling */
.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.results-header h2 {
  margin: 0;
  color: #1a2b33;
  font-size: 2rem;
  font-weight: 700;
}

.stars-container {
  display: flex;
  gap: 8px;
}

.star {
  font-size: 32px;
  color: #e2e8f0;
  transition: all 0.3s ease;
}

.star.active {
  color: #ecc94b;
  text-shadow: 0 0 10px rgba(236, 201, 75, 0.5);
  transform: scale(1.1);
}

/* Results Summary */
.results-summary {
  display: flex;
  justify-content: space-between;
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  margin-top: 8px;
}

.summary-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 2;
}

.summary-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-left: 1px solid #e2e8f0;
  padding-left: 20px;
  margin-left: 20px;
}

.result-badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 1.2rem;
  color: white;
  text-align: center;
  align-self: flex-start;
}

.result-badge.excellent {
  background: linear-gradient(135deg, #38b2ac, #4fd1c5);
}

.result-badge.good {
  background: linear-gradient(135deg, #48bb78, #68d391);
}

.result-badge.fair {
  background: linear-gradient(135deg, #ed8936, #f6ad55);
}

.result-badge.poor {
  background: linear-gradient(135deg, #e53e3e, #fc8181);
}

.destruction-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.destruction-label {
  font-weight: 600;
  color: #4a5568;
}

.destruction-bar-container {
  width: 100%;
  height: 16px;
  background: #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.destruction-bar {
  height: 100%;
  transition: width 1s ease-out;
}

.destruction-bar.good {
  background: linear-gradient(to right, #48bb78, #68d391);
}

.destruction-bar.fair {
  background: linear-gradient(to right, #ed8936, #f6ad55);
}

.destruction-bar.poor {
  background: linear-gradient(to right, #e53e3e, #fc8181);
}

.destruction-percentage {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.army-strength {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.strength-label {
  font-weight: 600;
  color: #4a5568;
  text-align: center;
}

.strength-meter {
  width: 50%;
  height: 100px;
  background: #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  transform: rotate(-90deg);
  transform-origin: center;
}

.strength-fill {
  width: 0; /* Will be set dynamically */
  height: 100%;
  transition: width 1s ease-out;
}

.strength-fill.high {
  background: linear-gradient(to right, #48bb78, #68d391);
}

.strength-fill.medium {
  background: linear-gradient(to right, #ed8936, #f6ad55);
}

.strength-fill.low {
  background: linear-gradient(to right, #e53e3e, #fc8181);
}

.strength-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(90deg);
  font-size: 1.2rem;
  font-weight: 700;
  color: #4a5568;
}

/* Battle Details */
.battle-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  padding: 20px;
  border-radius: 12px;
  background: #f8fafc;
  border-left: 4px solid #3b5b6d;
}

.detail-section h3 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #2d3748;
  font-size: 1.3rem;
}

.section-content {
  color: #4a5568;
  line-height: 1.6;
  white-space: pre-line;
}

.strategy-section {
  border-left-color: #38a169;
}

.moments-section {
  border-left-color: #805ad5;
}

.recommendations-section {
  border-left-color: #e53e3e;
}

/* Action Buttons */
.results-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 16px;
}

.action-btn {
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn {
  background: #e2e8f0;
  color: #4a5568;
}

.close-btn:hover {
  background: #cbd5e0;
}

.new-sim-btn {
  background: #3b5b6d;
  color: white;
}

.new-sim-btn:hover {
  background: #2c4250;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.new-sim-btn:active {
  transform: translateY(0);
}

@media (max-width: 900px) {
  .main-panels {
    flex-direction: column;
    align-items: center;
  }
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .results-content {
    padding: 24px;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .results-summary {
    flex-direction: column;
    gap: 20px;
  }

  .summary-right {
    border-left: none;
    border-top: 1px solid #e2e8f0;
    margin-left: 0;
    padding-left: 0;
    padding-top: 20px;
    margin-top: 12px;
  }

  .strength-meter {
    height: 30px;
    transform: none;
  }

  .strength-value {
    transform: translate(-50%, -50%);
  }

  .results-actions {
    flex-direction: column;
  }
}
</style>
