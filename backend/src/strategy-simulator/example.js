const { simulateBattle } = require('./simulator');

const exampleFrontendPayload = {
  army: {
    townHall: 9,
    troops: [
      {name: "Barbarian", level: 9, maxLevel: 9, quantity: 5, housing: 1},
      {name: "Archer", level: 8, maxLevel: 8, quantity: 8, housing: 1},
      {name: "Giant", level: 7, maxLevel: 8, quantity: 6, housing: 5},
      {name: "Wizard", level: 6, maxLevel: 7, quantity: 4, housing: 4}
    ],
    spells: [
      {name: "Lightning Spell", level: 8, maxLevel: 8, quantity: 2, housing: 1},
      {name: "Healing Spell", level: 7, maxLevel: 7, quantity: 2, housing: 2}
    ],
    heroes: [
      {name: "Barbarian King", level: 30, levels: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], upgrading: false},
      {name: "Archer Queen", level: 30, levels: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], upgrading: false}
    ],
    siegeMachine: "Wall Wrecker"
  },
  target: {
    townHall: 9,
    baseLayout: "Ring Base",
    toggleOptions: [
      {label: "Max defense levels", enabled: true},
      {label: "Enable traps", enabled: true},
      {label: "Enable Clan Castle troops", enabled: true}
    ],
    heroes: [
      {name: "Barbarian King", level: 30, levels: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], upgrading: false},
      {name: "Archer Queen", level: 30, levels: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], upgrading: false}
    ],
    siegeMachine: "Wall Wrecker"
  }
};

function convertPayloadToSimulatorFormat(payload) {
  const { army, target } = payload;
  
  const formattedArmy = {
    townHall: army.townHall,
    troops: {},
    spells: {},
    heroes: {},
    siegeMachine: army.siegeMachine
  };
  
  army.troops.forEach(troop => {
    if (troop.quantity > 0) {
      formattedArmy.troops[troop.name] = troop.quantity;
    }
  });
  
  army.spells.forEach(spell => {
    if (spell.quantity > 0) {
      formattedArmy.spells[spell.name] = spell.quantity;
    }
  });
  
  army.heroes.forEach(hero => {
    if (!hero.upgrading) {
      formattedArmy.heroes[hero.name] = hero.level;
    }
  });
  
  const formattedBase = {
    townHallLevel: target.townHall,
    layout: target.baseLayout || "Unknown layout",
    defenses: {},
    walls: {
      level: target.townHall,
      quantity: 250
    }
  };
  
  const maxDefenses = target.toggleOptions?.find(option => 
    option.label === "Max defense levels"
  )?.enabled || false;
  
  const includeTraps = target.toggleOptions?.find(option => 
    option.label === "Enable traps"
  )?.enabled || false;
  
  const includeClanCastle = target.toggleOptions?.find(option => 
    option.label === "Enable Clan Castle troops"
  )?.enabled || false;
  
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
  
  if (target.heroes && target.heroes.length > 0) {
    formattedBase.heroes = {};
    target.heroes.forEach(hero => {
      if (!hero.upgrading) {
        formattedBase.heroes[hero.name] = hero.level;
      }
    });
  }
  
  return { formattedArmy, formattedBase };
}

// Run the example if this script is executed directly
if (require.main === module) {
  runExample();
}

module.exports = { runExample, convertPayloadToSimulatorFormat, exampleFrontendPayload };

async function runExample() {
  try {
    console.log("Starting example simulation with new frontend payload format...");
    
    const { formattedArmy, formattedBase } = convertPayloadToSimulatorFormat(exampleFrontendPayload);
    
    console.log("Converted Army:", JSON.stringify(formattedArmy, null, 2));
    console.log("Converted Base:", JSON.stringify(formattedBase, null, 2));
    
    const results = await simulateBattle(formattedArmy, formattedBase);
    
    console.log("\n=== SIMULATION RESULTS ===\n");
    
    console.log(`Outcome: ${results.outcome.stars} stars, ${results.outcome.destructionPercentage}% destruction\n`);
    
    if (results.sections.summary) {
      console.log("Battle Summary:");
      console.log(results.sections.summary);
      console.log();
    }
    
    if (results.sections.strategy) {
      console.log("Attack Strategy Analysis:");
      console.log(results.sections.strategy);
      console.log();
    }
    
    if (results.sections.keyMoments) {
      console.log("Key Moments:");
      console.log(results.sections.keyMoments);
      console.log();
    }
    
    if (results.sections.result) {
      console.log("Final Result:");
      console.log(results.sections.result);
      console.log();
    }
    
    if (results.sections.recommendations) {
      console.log("Recommendations:");
      console.log(results.sections.recommendations);
      console.log();
    }

    if (Object.values(results.sections).every(section => !section)) {
      console.log("Raw LLM Response:");
      console.log(results.rawResponse);
      console.log();
    }
    
  } catch (error) {
    console.error("Error running example:", error.message);
  }
}