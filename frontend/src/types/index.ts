// Define types for the Attack Simulator

export interface Troop {
  name: string;
  level: number;
  maxLevel: number;
  quantity: number;
  housing: number;
}

export interface Spell {
  name: string;
  level: number;
  maxLevel: number;
  quantity: number;
  housing: number;
}

export interface Hero {
  name: string;
  level: number;
  levels: number[];
  upgrading: boolean; // Added upgrading property
}

export interface Toggle {
  label: string;
  enabled: boolean;
}

export interface ArmyState {
  townHall: string | number;
  troops: Troop[];
  spells: Spell[];
  heroes: Hero[];
  siegeMachine: string;
}

export interface TargetBaseState {
  townHall: string | number;
  baseLayout: string;
  toggleOptions: Toggle[];
  heroes: Hero[];
  siegeMachine: string;
  clanCastle?: {
    troops: string;
  };
}

export interface SimulationResult {
  effectiveness: number;
  stars: number;
  destructionPercentage: number;
  message: string;
}
