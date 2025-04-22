// src/strategy-simulator/api.js
const express = require('express');
const { simulateBattle } = require('./simulator');

// Create router
const router = express.Router();

function getEffectiveness(stars, percentage) {
  if (stars === 3) return "Excellent";
  if (stars === 2 && percentage >= 75) return "Good";
  if (stars === 2 || (stars === 1 && percentage >= 65)) return "Fair";
  return "Poor";
}


/**
 * API endpoint for simulating battles
 * POST /api/simulate
 * Request Body:
 * {
 *   "army": {
 *     "townHall": 9,
 *     "troops": [
 *       {"name": "Barbarian", "level": 9, "maxLevel": 9, "quantity": 5, "housing": 1},
 *       {"name": "Archer", "level": 8, "maxLevel": 8, "quantity": 8, "housing": 1}
 *     ],
 *     "spells": [
 *       {"name": "Lightning Spell", "level": 8, "maxLevel": 8, "quantity": 2, "housing": 1},
 *       {"name": "Healing Spell", "level": 7, "maxLevel": 7, "quantity": 2, "housing": 2}
 *     ],
 *     "heroes": [
 *       {"name": "Barbarian King", "level": 30, "levels": [...], "upgrading": false},
 *       {"name": "Archer Queen", "level": 30, "levels": [...], "upgrading": false}
 *     ],
 *     "siegeMachine": "Wall Wrecker"
 *   },
 *   "target": {
 *     "townHall": 9,
 *     "baseLayout": "Ring Base",
 *     "toggleOptions": [
 *       {"label": "Max defense levels", "enabled": true},
 *       {"label": "Enable traps", "enabled": true},
 *       {"label": "Enable Clan Castle troops", "enabled": true}
 *     ],
 *     "heroes": [...],
 *     "siegeMachine": "Wall Wrecker"
 *   }
 * }
 */
router.post('/simulate', async (req, res) => {
  try {
    const { army, target } = req.body;
    
    // Validate request body
    if (!army || !target) {
      return res.status(400).json({
        error: 'Missing required fields: army and target'
      });
    }
    
    // Validate army composition
    if (!army.troops || !Array.isArray(army.troops) || army.troops.length === 0) {
      return res.status(400).json({
        error: 'Army must include at least one troop'
      });
    }
    
    // Validate target base
    if (!target.townHall) {
      return res.status(400).json({
        error: 'Target base must include townHall level'
      });
    }
    
    // Convert frontend payload to the format expected by the simulator
    const formattedArmy = {
      troops: {},
      spells: {},
      heroes: {}
    };
    
    // Format troops
    army.troops.forEach(troop => {
      if (troop.quantity > 0) {
        formattedArmy.troops[troop.name] = troop.quantity;
      }
    });
    
    // Format spells
    army.spells.forEach(spell => {
      if (spell.quantity > 0) {
        formattedArmy.spells[spell.name] = spell.quantity;
      }
    });
    
    // Format heroes
    army.heroes.forEach(hero => {
      if (!hero.upgrading) {
        formattedArmy.heroes[hero.name] = hero.level;
      }
    });
    
    // Add siege machine if present
    if (army.siegeMachine) {
      formattedArmy.siegeMachine = army.siegeMachine;
    }
    
    // Format base layout
    const formattedBase = {
      townHallLevel: target.townHall,
      layout: target.baseLayout || "Unknown layout",
      defenses: {},
      walls: {
        level: target.townHall, // Estimating wall level based on TH level
        quantity: 250 // Default quantity, can be adjusted
      }
    };
    
    // Handle defense levels based on toggleOptions
    const maxDefenses = target.toggleOptions?.find(option => 
      option.label === "Max defense levels"
    )?.enabled || false;
    
    // Include traps based on toggleOptions
    const includeTraps = target.toggleOptions?.find(option => 
      option.label === "Enable traps"
    )?.enabled || false;
    
    // Include clan castle troops based on toggleOptions
    const includeClanCastle = target.toggleOptions?.find(option => 
      option.label === "Enable Clan Castle troops"
    )?.enabled || false;
    
    // Set up default defenses based on Town Hall level
    // These values are approximations and can be adjusted
    if (target.townHall >= 9) {
      formattedBase.defenses = {
        "Cannon": maxDefenses ? 4 : 3,
        "Archer Tower": maxDefenses ? 4 : 3,
        "Mortar": maxDefenses ? 3 : 2,
        "Air Defense": maxDefenses ? 4 : 3,
        "Wizard Tower": maxDefenses ? 3 : 2,
        "Hidden Tesla": maxDefenses ? 3 : 2,
        "X-Bow": maxDefenses ? 2 : 1
      };
      
      if (includeTraps) {
        formattedBase.traps = {
          "Spring Trap": 6,
          "Bomb": 6,
          "Giant Bomb": 3,
          "Air Bomb": 4,
          "Seeking Air Mine": 2
        };
      }
      
      if (includeClanCastle) {
        formattedBase.clanCastle = {
          level: maxDefenses ? target.townHall : Math.max(3, target.townHall - 1),
          troops: "Mixed troops"
        };
      }
    } else if (target.townHall >= 7) {
      formattedBase.defenses = {
        "Cannon": maxDefenses ? 3 : 2,
        "Archer Tower": maxDefenses ? 3 : 2,
        "Mortar": maxDefenses ? 2 : 1,
        "Air Defense": maxDefenses ? 3 : 2,
        "Wizard Tower": maxDefenses ? 2 : 1,
        "Hidden Tesla": maxDefenses ? 2 : 1
      };
      
      if (includeTraps) {
        formattedBase.traps = {
          "Spring Trap": 4,
          "Bomb": 4,
          "Giant Bomb": 2,
          "Air Bomb": 2
        };
      }
      
      if (includeClanCastle) {
        formattedBase.clanCastle = {
          level: maxDefenses ? target.townHall - 1 : Math.max(3, target.townHall - 2),
          troops: "Mixed troops"
        };
      }
    } else {
      formattedBase.defenses = {
        "Cannon": maxDefenses ? 2 : 1,
        "Archer Tower": maxDefenses ? 2 : 1,
        "Mortar": maxDefenses ? 1 : 1
      };
      
      if (target.townHall >= 5) {
        formattedBase.defenses["Air Defense"] = maxDefenses ? 1 : 1;
      }
      
      if (includeTraps) {
        formattedBase.traps = {
          "Spring Trap": 2,
          "Bomb": 2
        };
      }
      
      if (includeClanCastle && target.townHall >= 3) {
        formattedBase.clanCastle = {
          level: maxDefenses ? Math.min(3, target.townHall) : Math.min(2, target.townHall),
          troops: "Basic troops"
        };
      }
    }
    
    // Add heroes to the base if present
    if (target.heroes && target.heroes.length > 0) {
      formattedBase.heroes = {};
      target.heroes.forEach(hero => {
        if (!hero.upgrading) {
          formattedBase.heroes[hero.name] = hero.level;
        }
      });
    }
    
    // Log the formatted request
    console.log('Received simulation request:');
    console.log('Army:', JSON.stringify(formattedArmy, null, 2));
    console.log('Base:', JSON.stringify(formattedBase, null, 2));
    
    // Run the simulation with the formatted data
    const results = await simulateBattle(formattedArmy, formattedBase);
    
    const frontendResponse = {
      // Battle outcome data
      stars: results.outcome.stars,
      destructionPercentage: results.outcome.destructionPercentage,
      
      // Calculate effectiveness rating
      effectiveness: (() => {
        const stars = results.outcome.stars;
        const percentage = results.outcome.destructionPercentage;
        
        if (stars === 3) return "Excellent";
        if (stars === 2 && percentage >= 75) return "Good";
        if (stars === 2 || (stars === 1 && percentage >= 65)) return "Fair";
        return "Poor";
      })(),
      
      // Army strength calculation (optional enhancement)
      armyStrength: (() => {
        // Calculate based on troops, spells, and heroes
        let strength = 0;
        
        // Add troop power
        Object.entries(formattedArmy.troops).forEach(([name, qty]) => {
          // Different weights for different troops
          if (['Dragon', 'Electro Dragon', 'P.E.K.K.A', 'Golem'].includes(name)) {
            strength += Number(qty) * 5;
          } else if (['Balloon', 'Hog Rider', 'Valkyrie', 'Witch'].includes(name)) {
            strength += Number(qty) * 3;
          } else {
            strength += Number(qty) * 1;
          }
        });
        
        // Add spell power
        Object.keys(formattedArmy.spells).forEach(name => {
          strength += 5;
        });
        
        // Add hero power
        Object.values(formattedArmy.heroes).forEach(level => {
          strength += Number(level) / 2;
        });
        
        // Normalize to 100 scale
        return Math.min(100, Math.round(strength));
      })(),
      
      // Battle sections
      message: results.sections.summary.split('\n\n#')[0], // Main summary
      
      // Detailed sections
      sections: {
        summary: results.sections.summary,
        strategy: results.sections.strategy || "",
        keyMoments: results.sections.keyMoments || "",
        recommendations: results.sections.recommendations || ""
      },
      
      // Include full results for any additional processing
      fullResults: results
    };
    
    // Return the transformed results
    return res.status(200).json(frontendResponse);
  } catch (error) {
    console.error(`Error in simulation API: ${error.message}`);
    return res.status(500).json({
      error: 'An error occurred during simulation',
      message: error.message
    });
  }
});


module.exports = router;