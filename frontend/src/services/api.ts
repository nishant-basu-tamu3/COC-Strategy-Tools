// src/services/api.ts
import gameData from "../mock-data/gameData.json";
import axios from "axios";

// Game Data
export const getGameData = () => {
  return gameData;
};

// Attack Simulator
export const simulateAttack = async (army: any, target: any) => {
  try {
    const response = await axios.post("http://localhost:3000/api/simulate", {
      army,
      target,
    });
    return response.data;
  } catch (error) {
    console.error("Simulation failed:", error);
    return {
      effectiveness: 0,
      stars: 0,
      destructionPercentage: 0,
      message: "Simulation failed",
    };
  }
};

// Strategy Advisor Analysis
export const analyzeStrategyQuery = async (query: string) => {
  try {
    const response = await axios.post(
      "http://localhost:3000/api/advisor/analyze",
      { query }
    );
    return response.data;
  } catch (error) {
    console.error("Query analysis failed:", error);
    return {
      query,
      analysis: {
        intent: "general",
        params: {},
      },
      keywords: [],
    };
  }
};

// Full Strategy Advisor Response
export const getStrategyAdvice = async (query: string) => {
  try {
    const response = await axios.post("http://localhost:3000/api/advisor", {
      query,
    });
    return response.data;
  } catch (error) {
    console.error("Strategy advisor failed:", error);
    return {
      query,
      intent: "general",
      parameters: {},
      response: "Sorry, I couldn't process your request. Please try again.",
      sources: [],
      metadata: {},
    };
  }
};
