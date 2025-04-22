// src/strategy-simulator/simulator.js
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const LLMConfigManager = require('../config/llm-config');

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  processedDir: path.join(__dirname, '../../data/processed'),
  chromaDir: path.join(__dirname, '../../data/chroma_db'),
  embeddingsPath: path.join(__dirname, '../../data/processed/embeddings.json'),
};
/**
 * Load the processed data and embeddings
 * @returns {Promise<Object>} Data and embeddings
 */
async function loadData() {
  try {
    console.log('Loading processed data and embeddings...');
    
    // Load all data
    const allDataPath = path.join(CONFIG.processedDir, 'all_data.json');
    const allData = await fs.readJson(allDataPath);
    console.log(`Loaded ${allData.length} items from processed data`);
    
    // Load embeddings
    const embeddingsPath = CONFIG.embeddingsPath;
    const embeddings = await fs.readJson(embeddingsPath);
    console.log(`Loaded ${embeddings.length} embeddings`);
    
    return {
      allData,
      embeddings
    };
  } catch (error) {
    console.error(`Error loading data: ${error.message}`);
    throw error;
  }
}

/**
 * Generate embeddings for a query using Ollama
 * @param {string} query - The query to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
async function generateQueryEmbedding(query) {
  return LLMConfigManager.generateQueryEmbedding(query);
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Cosine similarity (-1 to 1)
 */
function cosineSimilarity(vecA, vecB) {
  // Compute dot product
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  
  // Compute magnitudes
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  
  // Compute cosine similarity
  if (magA === 0 || magB === 0) {
    return 0;
  }
  return dotProduct / (magA * magB);
}

/**
 * Find the most similar documents to a query embedding
 * @param {number[]} queryEmbedding - Query embedding
 * @param {Object[]} embeddings - Document embeddings
 * @param {number} topK - Number of documents to return
 * @returns {Object[]} - Top K similar documents
 */
function findSimilarDocuments(queryEmbedding, embeddings, topK = 5) {
  // Calculate similarity for each document
  const similarities = embeddings.map((doc, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding),
    content: doc.content,
    metadata: doc.metadata
  }));
  
  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Return top K
  return similarities.slice(0, topK);
}

/**
 * Find information about specific item by name
 * @param {string} itemName - Name of the item to search for
 * @param {Object[]} embeddings - Document embeddings
 * @param {string} itemType - Type of item (optional)
 * @returns {Promise<Object[]>} - Relevant documents
 */
async function findItemInfo(itemName, embeddings, itemType = '') {
  const typeStr = itemType ? ` ${itemType}` : '';
  const query = `Information about ${itemName}${typeStr} in Clash of Clans`;
  const queryEmbedding = await generateQueryEmbedding(query);
  
  // First try to find exact match by name
  const exactMatches = embeddings.filter(doc => 
    doc.metadata.name && doc.metadata.name.toLowerCase() === itemName.toLowerCase()
  );
  
  if (exactMatches.length > 0) {
    // Sort exact matches by similarity to query
    const exactMatchesWithSim = exactMatches.map(doc => ({
      ...doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding)
    }));
    
    exactMatchesWithSim.sort((a, b) => b.similarity - a.similarity);
    return exactMatchesWithSim.slice(0, 2);
  }
  
  // If no exact matches, find similar documents
  return findSimilarDocuments(queryEmbedding, embeddings, 2);
}

/**
 * Retrieve relevant information for an army composition
 * @param {Object} armyComposition - The attacking army composition
 * @param {Object[]} embeddings - Document embeddings
 * @returns {Promise<Object[]>} - Relevant documents
 */
async function retrieveArmyInfo(armyComposition, embeddings) {
  console.log('Retrieving information about army composition...');
  
  const relevantDocs = [];
  
  // For each troop in the army, find relevant information
  if (armyComposition.troops) {
    for (const [troopName, quantity] of Object.entries(armyComposition.troops)) {
      if (quantity > 0) {
        const itemDocs = await findItemInfo(troopName, embeddings, 'troop');
        relevantDocs.push(...itemDocs);
      }
    }
  }
  
  // For each spell in the army, find relevant information
  if (armyComposition.spells) {
    for (const [spellName, quantity] of Object.entries(armyComposition.spells)) {
      if (quantity > 0) {
        const itemDocs = await findItemInfo(spellName, embeddings, 'spell');
        relevantDocs.push(...itemDocs);
      }
    }
  }
  
  // For each hero in the army, find relevant information
  if (armyComposition.heroes) {
    for (const [heroName, level] of Object.entries(armyComposition.heroes)) {
      if (level > 0) {
        const itemDocs = await findItemInfo(heroName, embeddings, 'hero');
        relevantDocs.push(...itemDocs);
      }
    }
  }
  
  // If siege machine is present, find relevant information
  if (armyComposition.siegeMachine) {
    const siegeDocs = await findItemInfo(armyComposition.siegeMachine, embeddings, 'siege machine');
    relevantDocs.push(...siegeDocs);
  }
  
  // Deduplicate documents
  const uniqueDocs = [];
  const seen = new Set();
  
  for (const doc of relevantDocs) {
    if (doc.metadata) {
      // Create a unique key based on metadata
      const key = `${doc.metadata.id}-${doc.metadata.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueDocs.push(doc);
      }
    }
  }
  
  return uniqueDocs.slice(0, 5);
}

/**
 * Retrieve relevant information for a base layout
 * @param {Object} baseLayout - The defending base layout
 * @param {Object[]} embeddings - Document embeddings
 * @returns {Promise<Object[]>} - Relevant documents
 */
async function retrieveBaseInfo(baseLayout, embeddings) {
  console.log('Retrieving information about base layout...');
  
  const relevantDocs = [];
  
  // For each defense building in the base, find relevant information
  for (const [buildingName, quantity] of Object.entries(baseLayout.defenses || {})) {
    if (quantity > 0) {
      const itemDocs = await findItemInfo(buildingName, embeddings, 'defense');
      relevantDocs.push(...itemDocs);
    }
  }
  
  // For town hall, find relevant information
  if (baseLayout.townHallLevel) {
    const query = `Information about Town Hall level ${baseLayout.townHallLevel} in Clash of Clans`;
    const queryEmbedding = await generateQueryEmbedding(query);
    const similarDocs = findSimilarDocuments(queryEmbedding, embeddings, 2);
    relevantDocs.push(...similarDocs);
  }
  
  // Deduplicate documents
  const uniqueDocs = [];
  const seen = new Set();
  
  for (const doc of relevantDocs) {
    // Create a unique key based on metadata
    const key = `${doc.metadata.id}-${doc.metadata.category}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDocs.push(doc);
    }
  }
  
  return uniqueDocs.slice(0, 3);
}

/**
 * Extract and format stats information from documents
 * @param {Object[]} docs - Array of documents
 * @returns {string} - Formatted stats information
 */
function extractStatsFromDocs(docs) {
  let statsInfo = "";
  
  // Look for documents with the 'stats' category
  const statsDocs = docs.filter(doc => doc.metadata.category === 'stats');
  
  for (const doc of statsDocs) {
    statsInfo += `\n${doc.content}\n`;
  }
  
  // If no specific stats documents, include content from all documents
  if (statsInfo === "") {
    for (const doc of docs) {
      if (doc.metadata.category === 'basic_info' || 
          doc.metadata.category.includes('details')) {
        statsInfo += `\n${doc.content}\n`;
      }
    }
  }
  
  return statsInfo;
}

/**
 * Generate prompt for the LLM to simulate a battle
 * @param {Object} armyComposition - The attacking army
 * @param {Object} baseLayout - The defending base
 * @param {Object[]} armyDocs - Relevant documents about the army
 * @param {Object[]} baseDocs - Relevant documents about the base
 * @returns {string} - The prompt for the LLM
 */
function generateSimulationPrompt(armyComposition, baseLayout, armyDocs, baseDocs) {
  console.log('Generating simulation prompt...');
  
  // Format army composition for the prompt
  let armyDescription = 'Attacking Army:\n';
  armyDescription += `Town Hall Level: ${armyComposition.townHall || 'Unknown'}\n`;
  
  if (armyComposition.troops && Object.keys(armyComposition.troops).length > 0) {
    armyDescription += 'Troops:\n';
    for (const [troopName, quantity] of Object.entries(armyComposition.troops)) {
      armyDescription += `- ${quantity}x ${troopName}\n`;
    }
  }
  
  if (armyComposition.spells && Object.keys(armyComposition.spells).length > 0) {
    armyDescription += 'Spells:\n';
    for (const [spellName, quantity] of Object.entries(armyComposition.spells)) {
      armyDescription += `- ${quantity}x ${spellName}\n`;
    }
  }
  
  if (armyComposition.heroes && Object.keys(armyComposition.heroes).length > 0) {
    armyDescription += 'Heroes:\n';
    for (const [heroName, level] of Object.entries(armyComposition.heroes)) {
      armyDescription += `- ${heroName} (Level ${level})\n`;
    }
  }
  
  if (armyComposition.siegeMachine) {
    armyDescription += `Siege Machine: ${armyComposition.siegeMachine}\n`;
  }
  
  // Format base layout for the prompt
  let baseDescription = 'Defending Base:\n';
  baseDescription += `Town Hall Level: ${baseLayout.townHallLevel || 'Unknown'}\n`;
  baseDescription += `Layout Type: ${baseLayout.layout || 'Unknown'}\n`;
  
  if (baseLayout.defenses && Object.keys(baseLayout.defenses).length > 0) {
    baseDescription += 'Defenses:\n';
    for (const [defenseName, quantity] of Object.entries(baseLayout.defenses)) {
      baseDescription += `- ${quantity}x ${defenseName}\n`;
    }
  }
  
  if (baseLayout.walls) {
    baseDescription += `Walls: Level ${baseLayout.walls.level || 'Unknown'}, Quantity: ${baseLayout.walls.quantity || 'Unknown'}\n`;
  }
  
  if (baseLayout.traps && Object.keys(baseLayout.traps).length > 0) {
    baseDescription += 'Traps:\n';
    for (const [trapName, quantity] of Object.entries(baseLayout.traps)) {
      baseDescription += `- ${quantity}x ${trapName}\n`;
    }
  }
  
  if (baseLayout.clanCastle) {
    baseDescription += `Clan Castle: Level ${baseLayout.clanCastle.level}, Contains ${baseLayout.clanCastle.troops}\n`;
  }
  
  if (baseLayout.heroes && Object.keys(baseLayout.heroes).length > 0) {
    baseDescription += 'Defending Heroes:\n';
    for (const [heroName, level] of Object.entries(baseLayout.heroes)) {
      baseDescription += `- ${heroName} (Level ${level})\n`;
    }
  }
  
  // Format troop information
  let troopInfo = '';
  for (const doc of armyDocs) {
    if (doc.metadata && (doc.metadata.type === 'troop' || doc.metadata.type === 'spell' || doc.metadata.type === 'hero')) {
      troopInfo += `## ${doc.metadata.name} (${doc.metadata.type})\n`;
      troopInfo += `${doc.content.trim()}\n\n`;
    }
  }
  
  // Format defense information
  let defenseInfo = '';
  for (const doc of baseDocs) {
    if (doc.metadata && doc.metadata.type === 'defense') {
      defenseInfo += `## ${doc.metadata.name} (${doc.metadata.type})\n`;
      defenseInfo += `${doc.content.trim()}\n\n`;
    }
  }
  
  // Create the full prompt with explicit formatting instructions and examples
  const prompt = `
You are a Clash of Clans battle simulation expert. Simulate a battle between the given army and base.

${armyDescription}

${baseDescription}

## Important Game Information
# Troop Information:
${troopInfo || "Use your knowledge of Clash of Clans troops, spells, and heroes."}

# Defense Information:
${defenseInfo || "Use your knowledge of Clash of Clans defenses and base structures."}

## INSTRUCTIONS:
Your job is to simulate this battle as precisely as possible, considering troop stats, defense capabilities, and Clash of Clans game mechanics.

YOU MUST STRUCTURE YOUR RESPONSE EXACTLY LIKE THIS:

# Battle Summary
[Provide a 2-3 paragraph summary of how the attack unfolds]

# Attack Strategy Analysis
[Analyze how the provided troops work together in this attack]

# Key Moments
[List 4-5 key moments in the battle]

# Final Result
[State the stars achieved (0-3) and destruction percentage (0-100%)]
Example: "The attack achieved 2 stars with 76% destruction."

# Recommendations
[Provide 3-4 recommendations to improve this attack]

IMPORTANT RULES:
1. ONLY use troops, spells, and heroes from the provided army list
2. DO NOT mention troops that aren't in the army list
3. ALWAYS include an exact destruction percentage (e.g., "65% destruction")
4. ALWAYS state the number of stars achieved (0, 1, 2, or 3)
5. Base this on Clash of Clans mechanics: troops target specific buildings based on preferences, defenses have different ranges and damage
6. ALWAYS include all five sections with the exact headings shown above

Remember:
- 0 stars: less than 50% destruction and Town Hall not destroyed
- 1 star: either 50%+ destruction OR Town Hall destroyed
- 2 stars: 50%+ destruction AND Town Hall destroyed
- 3 stars: 100% destruction

Begin your battle simulation now.
`;
  
  return prompt;
}

/**
 * Run an LLM inference using Ollama
 * @param {string} prompt - The prompt to send to the LLM
 * @returns {Promise<string>} - The LLM's response
 */
async function runLLMInference(prompt) {
  return LLMConfigManager.runLLMInference(prompt, {
    temperature: 0.5,
    num_predict: 1024,
    top_p: 0.9,
    top_k: 40,
    stop: ["</response>"]
  });
}

/**
 * Parse and format the LLM response with improved debugging
 * @param {string} llmResponse - Raw response from the LLM
 * @returns {Object} - Structured simulation results
 */
function parseSimulationResults(llmResponse) {
  try {
    console.log('Parsing simulation results...');
    console.log('Raw response length:', llmResponse.length);
    
    // Log a preview of the response for debugging
    console.log('Response preview:');
    console.log(llmResponse.substring(0, 200) + '...');
    
    // Extract sections from the LLM response
    const sections = {
      summary: '',
      strategy: '',
      keyMoments: '',
      result: '',
      recommendations: ''
    };
    
    // Log section headers found in the response
    const headerMatches = llmResponse.match(/Battle Summary|Attack Strategy Analysis|Key Moments|Final Result|Recommendations/g);
    if (headerMatches) {
      console.log('Found section headers:', headerMatches);
    } else {
      console.log('No section headers found!');
    }
    
    // Simple parsing logic - look for headers and extract content
    const summaryMatch = llmResponse.match(/Battle Summary[:\s]*\n([\s\S]*?)(?=Attack Strategy Analysis|Key Moments|Final Result|Recommendations|$)/i);
    if (summaryMatch && summaryMatch[1]) {
      sections.summary = summaryMatch[1].trim();
      console.log('Extracted Battle Summary section');
    }
    
    const strategyMatch = llmResponse.match(/Attack Strategy Analysis[:\s]*\n([\s\S]*?)(?=Battle Summary|Key Moments|Final Result|Recommendations|$)/i);
    if (strategyMatch && strategyMatch[1]) {
      sections.strategy = strategyMatch[1].trim();
      console.log('Extracted Attack Strategy Analysis section');
    }
    
    const momentsMatch = llmResponse.match(/Key Moments[:\s]*\n([\s\S]*?)(?=Battle Summary|Attack Strategy Analysis|Final Result|Recommendations|$)/i);
    if (momentsMatch && momentsMatch[1]) {
      sections.keyMoments = momentsMatch[1].trim();
      console.log('Extracted Key Moments section');
    }
    
    const resultMatch = llmResponse.match(/Final Result[:\s]*\n([\s\S]*?)(?=Battle Summary|Attack Strategy Analysis|Key Moments|Recommendations|$)/i);
    if (resultMatch && resultMatch[1]) {
      sections.result = resultMatch[1].trim();
      console.log('Extracted Final Result section');
    }
    
    const recsMatch = llmResponse.match(/Recommendations[:\s]*\n([\s\S]*?)(?=Battle Summary|Attack Strategy Analysis|Key Moments|Final Result|$)/i);
    if (recsMatch && recsMatch[1]) {
      sections.recommendations = recsMatch[1].trim();
      console.log('Extracted Recommendations section');
    }
    
    // Try to extract stars and destruction percentage
    let stars = 0;
    let destructionPercentage = 0;
    
    // Log the result section for debugging
    if (sections.result) {
      console.log('Result section for parsing:');
      console.log(sections.result);
    }
    
    // Look for star count in the result section and the entire response if needed
    const starMatch = sections.result.match(/(\d+)\s*stars?/i) || llmResponse.match(/(\d+)\s*stars?/i);
    if (starMatch && starMatch[1]) {
      stars = parseInt(starMatch[1], 10);
      console.log(`Found star count: ${stars}`);
    } else {
      console.log('No star count found!');
    }
    
    // Look for destruction percentage in the result section and the entire response if needed
    const percentMatch = sections.result.match(/(\d+(?:\.\d+)?)\s*%\s*destruction/i) || 
                         llmResponse.match(/(\d+(?:\.\d+)?)\s*%\s*destruction/i);
    if (percentMatch && percentMatch[1]) {
      destructionPercentage = parseFloat(percentMatch[1]);
      console.log(`Found destruction percentage: ${destructionPercentage}%`);
    } else {
      console.log('No destruction percentage found!');
      
      // Try alternate formats for destruction percentage
      const altPercentMatch = sections.result.match(/destruction(?:.*)(\d+(?:\.\d+)?)\s*%/i) || 
                              llmResponse.match(/destruction(?:.*)(\d+(?:\.\d+)?)\s*%/i);
      if (altPercentMatch && altPercentMatch[1]) {
        destructionPercentage = parseFloat(altPercentMatch[1]);
        console.log(`Found destruction percentage (alternate format): ${destructionPercentage}%`);
      }
    }
    
    // If we still couldn't find stars or percentage, try to infer from content
    if (stars === 0 && sections.result.toLowerCase().includes('two stars')) {
      stars = 2;
      console.log('Inferred 2 stars from text description');
    } else if (stars === 0 && sections.result.toLowerCase().includes('three stars')) {
      stars = 3;
      console.log('Inferred 3 stars from text description');
    } else if (stars === 0 && sections.result.toLowerCase().includes('one star')) {
      stars = 1;
      console.log('Inferred 1 star from text description');
    }
    
    // Default to a reasonable value if nothing found
    if (destructionPercentage === 0 && stars > 0) {
      // If we have stars but no percentage, make an estimate based on stars
      if (stars === 1) {
        destructionPercentage = 55;
        console.log('Estimating 55% destruction based on 1 star');
      } else if (stars === 2) {
        destructionPercentage = 75;
        console.log('Estimating 75% destruction based on 2 stars');
      } else if (stars === 3) {
        destructionPercentage = 100;
        console.log('Setting 100% destruction based on 3 stars');
      }
    }
    
    // Print the full sections object for debugging
    console.log('Parsed sections:');
    for (const [key, value] of Object.entries(sections)) {
      if (value) {
        console.log(`${key}: [content length: ${value.length}]`);
      } else {
        console.log(`${key}: [empty]`);
      }
    }
    
    // As a fallback, use the full response as the rawResponse
    if (Object.values(sections).every(section => !section)) {
      console.log('No sections were parsed successfully. Using raw response as the battle summary.');
      sections.summary = llmResponse.trim();
      console.log('Using fallback: LLM response as battle summary');
    }
    
    return {
      rawResponse: llmResponse,
      sections,
      outcome: {
        stars,
        destructionPercentage
      }
    };
  } catch (error) {
    console.error(`Error parsing simulation results: ${error.message}`);
    console.error(error.stack);
    return {
      rawResponse: llmResponse,
      sections: {
        summary: 'Error parsing results: ' + error.message,
        strategy: '',
        keyMoments: '',
        result: '',
        recommendations: ''
      },
      outcome: {
        stars: 0,
        destructionPercentage: 0
      }
    };
  }
}

/**
 * Simulate a battle between an army and a base
 * @param {Object} armyComposition - The attacking army
 * @param {Object} baseLayout - The defending base
 * @returns {Promise<Object>} - Simulation results
 */
async function simulateBattle(armyComposition, baseLayout) {
  try {
    console.log('Starting battle simulation...');
    
    // Load data and embeddings
    const { embeddings } = await loadData();
    
    // Retrieve relevant information for the army and base
    const armyDocs = await retrieveArmyInfo(armyComposition, embeddings);
    const baseDocs = await retrieveBaseInfo(baseLayout, embeddings);
    
    console.log(`Retrieved ${armyDocs.length} documents for army and ${baseDocs.length} documents for base`);
    
    // Generate simulation prompt
    const prompt = generateSimulationPrompt(armyComposition, baseLayout, armyDocs, baseDocs);
    
    // Run LLM inference
    const llmResponse = await runLLMInference(prompt);
    
    // Parse simulation results
    const results = parseSimulationResults(llmResponse);
    
    console.log('Battle simulation completed successfully');
    return results;
  } catch (error) {
    console.error(`Error simulating battle: ${error.message}`);
    throw error;
  }
}

module.exports = {
  simulateBattle,
  loadData,
  retrieveArmyInfo,
  retrieveBaseInfo,
  generateSimulationPrompt,
  runLLMInference,
  parseSimulationResults
};