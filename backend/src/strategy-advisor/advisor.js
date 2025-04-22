// src/strategy-advisor/advisor.js
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
 * Extract keywords from a query
 * @param {string} query - The query to extract keywords from
 * @returns {string[]} - Array of keywords
 */
function extractKeywords(query) {
  // Convert to lowercase and remove punctuation
  const cleanedQuery = query.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words
  const words = cleanedQuery.split(/\s+/);
  
  // Define stopwords
  const stopwords = new Set([
    'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 
    'i', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 
    'what', 'when', 'where', 'who', 'will', 'with', 'the', 'can', 'you', 'me', 'my',
    'should', 'would', 'could', 'need', 'regarding', 'regarding', 'tell'
  ]);
  
  // Filter out stopwords and words less than 3 characters
  const keywords = words.filter(word => word.length > 2 && !stopwords.has(word));
  
  // Add specific Clash of Clans terms that might have been filtered
  const cocTerms = ['th', 'war', 'coc'];
  for (const term of cocTerms) {
    if (cleanedQuery.includes(term) && !keywords.includes(term)) {
      keywords.push(term);
    }
  }
  
  // Get Town Hall level even if it's just a number
  const thMatch = query.match(/th\s*(\d+)|town\s*hall\s*(\d+)/i);
  if (thMatch) {
    const thLevel = thMatch[1] || thMatch[2];
    if (!keywords.includes(thLevel)) {
      keywords.push('th' + thLevel);
      keywords.push('townhall' + thLevel);
    }
  }
  
  return keywords;
}

/**
 * Find documents containing specific keywords
 * @param {string[]} keywords - Array of keywords to search for
 * @param {Object[]} embeddings - Document embeddings with content
 * @param {number} topK - Number of results to return
 * @returns {Object[]} - Documents containing keywords
 */
function findKeywordMatches(keywords, embeddings, topK = 5) {
  // Calculate keyword match score for each document
  const keywordScores = embeddings.map(doc => {
    const content = doc.content.toLowerCase();
    let score = 0;
    
    // Count how many of the keywords appear in the content
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score++;
      }

      // Add extra weight for exact matches to metadata
      if (doc.metadata.name && 
          doc.metadata.name.toLowerCase().includes(keyword.toLowerCase())) {
        score += 2;
      }
      
      if (doc.metadata.type && 
          doc.metadata.type.toLowerCase() === keyword.toLowerCase()) {
        score += 3;
      }
    }
    
    return {
      ...doc,
      keywordScore: score
    };
  });
  
  // Filter to documents with at least one keyword match
  const matches = keywordScores.filter(doc => doc.keywordScore > 0);
  
  // Sort by keyword score (descending)
  matches.sort((a, b) => b.keywordScore - a.keywordScore);
  
  // Return top K
  return matches.slice(0, topK);
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
  const similarities = embeddings.map(doc => ({
    ...doc,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding)
  }));
  
  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // Return top K
  return similarities.slice(0, topK);
}

/**
 * Apply Maximum Marginal Relevance to balance relevance and diversity
 * @param {Object[]} candidates - Candidate documents with similarity scores
 * @param {number[]} queryEmbedding - Query embedding
 * @param {number} topK - Number of documents to select
 * @param {number} lambda - Trade-off between relevance and diversity (0-1)
 * @returns {Object[]} - Diverse set of documents
 */
function applyMMR(candidates, queryEmbedding, topK = 5, lambda = 0.5) {
  if (candidates.length <= topK) {
    return candidates;
  }
  
  // Start with the most similar document
  candidates.sort((a, b) => b.similarity - a.similarity);
  
  const selected = [candidates[0]];
  const remaining = candidates.slice(1);
  
  // Iteratively select documents
  while (selected.length < topK && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestIndex = -1;
    
    // Calculate MMR score for each remaining document
    for (let i = 0; i < remaining.length; i++) {
      const doc = remaining[i];
      
      // Calculate maximum similarity to any document in the selected set
      let maxSimilarityToSelected = 0;
      for (const selectedDoc of selected) {
        const sim = cosineSimilarity(doc.embedding, selectedDoc.embedding);
        maxSimilarityToSelected = Math.max(maxSimilarityToSelected, sim);
      }
      
      // Calculate MMR score
      const mmrScore = lambda * doc.similarity - (1 - lambda) * maxSimilarityToSelected;
      
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = i;
      }
    }
    
    // Add the document with the highest MMR score to the selected set
    selected.push(remaining[bestIndex]);
    remaining.splice(bestIndex, 1);
  }
  
  return selected;
}

/**
 * Filter embeddings based on relevance to Town Hall level
 * @param {number} thLevel - Town Hall level
 * @param {Object[]} embeddings - Document embeddings
 * @returns {Object[]} - Filtered embeddings
 */
function filterByTownHallLevel(thLevel, embeddings) {
  if (!thLevel) {
    return embeddings;
  }
  
  // Look for exact TH level mentions
  const exactMatches = embeddings.filter(doc => {
    const content = doc.content.toLowerCase();
    return content.includes(`th${thLevel}`) || 
           content.includes(`town hall ${thLevel}`) ||
           content.includes(`townhall ${thLevel}`) ||
           content.includes(`th ${thLevel}`);
  });
  
  // If we have enough exact matches, use those
  if (exactMatches.length >= 5) {
    return exactMatches;
  }
  
  // Look for nearby TH levels (+/- 1)
  const nearbyMatches = embeddings.filter(doc => {
    const content = doc.content.toLowerCase();
    return content.includes(`th${thLevel - 1}`) || 
           content.includes(`th${thLevel + 1}`) ||
           content.includes(`town hall ${thLevel - 1}`) ||
           content.includes(`town hall ${thLevel + 1}`);
  });
  
  // Combine exact and nearby matches
  const combinedMatches = [...exactMatches];
  for (const match of nearbyMatches) {
    if (!combinedMatches.some(doc => 
      doc.metadata.id === match.metadata.id && 
      doc.metadata.category === match.metadata.category)) {
      combinedMatches.push(match);
    }
  }
  
  // If we have enough combined matches, use those
  if (combinedMatches.length >= 5) {
    return combinedMatches;
  }
  
  // Otherwise return all embeddings
  return embeddings;
}

/**
 * Analyze query to determine intent and extract parameters
 * @param {string} query - User query
 * @returns {Object} - Query intent and parameters
 */
function analyzeQuery(query) {
  // Simplified intent detection based on keywords
  const lowerQuery = query.toLowerCase();
  
  // Detect common query types
  let intent = "general";
  const params = {};
  
  // Extract town hall level (present in multiple query types)
  const thMatch = lowerQuery.match(/th\s*(\d+)|town\s*hall\s*(\d+)/i);
  if (thMatch) {
    params.townHallLevel = parseInt(thMatch[1] || thMatch[2], 10);
  }
  
  // UPGRADE PRIORITY INTENT
  // More comprehensive pattern matching for upgrade priority
  if (
    lowerQuery.includes("upgrade") || 
    lowerQuery.includes("priority") ||
    lowerQuery.includes("what should i upgrade") ||
    lowerQuery.includes("upgrade first") ||
    lowerQuery.includes("upgrade next") ||
    lowerQuery.includes("what to upgrade") ||
    (lowerQuery.includes("max") && lowerQuery.includes("first")) ||
    (lowerQuery.includes("focus") && lowerQuery.includes("upgrade"))
  ) {
    intent = "upgrade_priority";
    
    // Extract item type for upgrade queries
    if (lowerQuery.includes("troop") || lowerQuery.includes("army")) {
      params.itemType = "troop";
    }
    else if (lowerQuery.includes("spell")) {
      params.itemType = "spell";
    }
    else if (lowerQuery.includes("hero")) {
      params.itemType = "hero";
    }
    else if (
      lowerQuery.includes("defense") || 
      lowerQuery.includes("building") || 
      lowerQuery.includes("structure") ||
      lowerQuery.includes("tower") ||
      lowerQuery.includes("cannon") ||
      lowerQuery.includes("mortar")
    ) {
      params.itemType = "defense";
    }
    
    // Try to determine focus (offense vs defense)
    if (
      lowerQuery.includes("offense") || 
      lowerQuery.includes("attack") ||
      lowerQuery.includes("troop") || 
      lowerQuery.includes("spell") ||
      lowerQuery.includes("army")
    ) {
      params.focus = "offense";
    }
    else if (
      lowerQuery.includes("defense") || 
      lowerQuery.includes("defend") ||
      lowerQuery.includes("wall") ||
      lowerQuery.includes("protect")
    ) {
      params.focus = "defense";
    }
  } 
  // ATTACK STRATEGY INTENT
  else if (
    lowerQuery.includes("attack") || 
    lowerQuery.includes("strategy") || 
    lowerQuery.includes("army") ||
    lowerQuery.includes("raid") ||
    lowerQuery.includes("war attack") ||
    lowerQuery.includes("attack plan") ||
    lowerQuery.includes("composition") ||
    lowerQuery.includes("how to beat") ||
    lowerQuery.includes("how to attack") ||
    lowerQuery.includes("best troops for") ||
    lowerQuery.includes("troop comp")
  ) {
    intent = "attack_strategy";
    
    // Extract attack type
    if (
      lowerQuery.includes("air") || 
      lowerQuery.includes("dragon") ||
      lowerQuery.includes("balloon") ||
      lowerQuery.includes("hound")
    ) {
      params.attackType = "air";
    }
    else if (
      lowerQuery.includes("ground") || 
      lowerQuery.includes("hog") ||
      lowerQuery.includes("giant") ||
      lowerQuery.includes("golem") ||
      lowerQuery.includes("pekka") ||
      lowerQuery.includes("barbarian") || 
      lowerQuery.includes("archer")
    ) {
      params.attackType = "ground";
    }
    
    // Extract specific troop focus
    const troops = [
      "barbarian", "archer", "giant", "goblin", "wall breaker", 
      "balloon", "wizard", "healer", "dragon", "pekka", "baby dragon", 
      "miner", "electro dragon", "yeti", "dragon rider", "hog rider", 
      "valkyrie", "golem", "witch", "lava hound", "bowler", "ice golem", 
      "headhunter"
    ];
    
    for (const troop of troops) {
      if (lowerQuery.includes(troop)) {
        params.focusTroop = troop;
        break;
      }
    }
    
    // Extract attack purpose
    if (lowerQuery.includes("farm") || lowerQuery.includes("loot")) {
      params.purpose = "farming";
    }
    else if (lowerQuery.includes("war") || lowerQuery.includes("clan war")) {
      params.purpose = "war";
    }
    else if (lowerQuery.includes("trophy") || lowerQuery.includes("push")) {
      params.purpose = "trophy";
    }
  }
  // BASE DESIGN INTENT
  else if (
    lowerQuery.includes("base") || 
    lowerQuery.includes("layout") || 
    lowerQuery.includes("design") ||
    lowerQuery.includes("village layout") ||
    lowerQuery.includes("base plan") ||
    lowerQuery.includes("defense layout") ||
    lowerQuery.includes("base design") ||
    lowerQuery.includes("village setup") ||
    lowerQuery.includes("how to build") ||
    (lowerQuery.includes("arrange") && lowerQuery.includes("defense")) ||
    (lowerQuery.includes("place") && lowerQuery.includes("building"))
  ) {
    intent = "base_design";
    
    // Extract base type
    if (lowerQuery.includes("farm") || lowerQuery.includes("loot")) {
      params.baseType = "farming";
    }
    else if (lowerQuery.includes("war") || lowerQuery.includes("clan war")) {
      params.baseType = "war";
    }
    else if (lowerQuery.includes("trophy") || lowerQuery.includes("push")) {
      params.baseType = "trophy";
    }
    else if (lowerQuery.includes("hybrid")) {
      params.baseType = "hybrid";
    }
  }
  // RESOURCE MANAGEMENT INTENT (NEW)
  else if (
    lowerQuery.includes("resource") ||
    lowerQuery.includes("gold") ||
    lowerQuery.includes("elixir") ||
    lowerQuery.includes("dark elixir") ||
    lowerQuery.includes("save") ||
    lowerQuery.includes("spend") ||
    lowerQuery.includes("economy") ||
    lowerQuery.includes("farm") ||
    lowerQuery.includes("loot") ||
    lowerQuery.includes("best way to get") ||
    lowerQuery.includes("how to get more")
  ) {
    intent = "resource_management";
    
    // Extract resource type
    if (lowerQuery.includes("gold")) {
      params.resourceType = "gold";
    }
    else if (lowerQuery.includes("elixir") && lowerQuery.includes("dark")) {
      params.resourceType = "dark_elixir";
    }
    else if (lowerQuery.includes("elixir")) {
      params.resourceType = "elixir";
    }
    else if (lowerQuery.includes("gem")) {
      params.resourceType = "gems";
    }
    
    // Extract goal
    if (lowerQuery.includes("save") || lowerQuery.includes("store")) {
      params.goal = "saving";
    }
    else if (lowerQuery.includes("farm") || lowerQuery.includes("collect") || lowerQuery.includes("get")) {
      params.goal = "farming";
    }
    else if (lowerQuery.includes("spend") || lowerQuery.includes("use")) {
      params.goal = "spending";
    }
  }
  
  return { intent, params };
}

/**
 * Retrieve relevant documents for a user query
 * @param {string} query - User query
 * @param {Object} queryAnalysis - Analysis of user query
 * @param {Object[]} embeddings - Document embeddings
 * @returns {Promise<Object[]>} - Relevant documents
 */
async function retrieveContext(query, queryAnalysis, embeddings) {
  console.log('Retrieving context for query...');
  
  // Apply Town Hall level filtering if available
  const thLevel = queryAnalysis.params.townHallLevel || queryAnalysis.params.targetTH;
  let filteredEmbeddings = filterByTownHallLevel(thLevel, embeddings);
  console.log(`Filtered to ${filteredEmbeddings.length} documents by TH level`);
  
  // Generate embedding for the query
  const queryEmbedding = await generateQueryEmbedding(query);
  
  // Extract keywords from the query
  const keywords = extractKeywords(query);
  console.log('Extracted keywords:', keywords);
  
  // Hybrid search - combine semantic and keyword matches
  const semanticMatches = findSimilarDocuments(queryEmbedding, filteredEmbeddings, 7);
  const keywordMatches = findKeywordMatches(keywords, filteredEmbeddings, 7);
  
  // Combine results and remove duplicates
  const combinedResults = [...semanticMatches];
  for (const match of keywordMatches) {
    // Check if this document is already in the results
    const isIncluded = combinedResults.some(doc => 
      doc.metadata.id === match.metadata.id && 
      doc.metadata.category === match.metadata.category
    );
    
    if (!isIncluded) {
      combinedResults.push(match);
    }
  }
  
  // Add similarity score for keyword matches if not present
  for (const doc of combinedResults) {
    if (doc.similarity === undefined) {
      doc.similarity = cosineSimilarity(queryEmbedding, doc.embedding);
    }
  }
  
  // Apply additional filters based on query intent
  let filtered = [...combinedResults];
  
  if (queryAnalysis.intent === "upgrade_priority" && queryAnalysis.params.itemType) {
    // Prioritize documents about the specific item type
    const typeMatches = filteredEmbeddings.filter(doc => 
      doc.metadata.type === queryAnalysis.params.itemType ||
      doc.content.toLowerCase().includes(queryAnalysis.params.itemType)
    );
    
    if (typeMatches.length > 0) {
      // Add similarity scores if not present
      for (const doc of typeMatches) {
        if (doc.similarity === undefined) {
          doc.similarity = cosineSimilarity(queryEmbedding, doc.embedding);
        }
      }
      
      // Add top type-specific documents to results
      typeMatches.sort((a, b) => b.similarity - a.similarity);
      const topTypeMatches = typeMatches.slice(0, 3);
      
      for (const match of topTypeMatches) {
        const isIncluded = filtered.some(doc => 
          doc.metadata.id === match.metadata.id && 
          doc.metadata.category === match.metadata.category
        );
        
        if (!isIncluded) {
          filtered.push(match);
        }
      }
    }
  }
  else if (queryAnalysis.intent === "attack_strategy" && queryAnalysis.params.focusTroop) {
    // Try to find documents about the focus troop
    const troopDocs = filteredEmbeddings.filter(doc => 
      (doc.metadata.name && doc.metadata.name.toLowerCase().includes(queryAnalysis.params.focusTroop)) ||
      doc.content.toLowerCase().includes(queryAnalysis.params.focusTroop)
    );
    
    if (troopDocs.length > 0) {
      // Add similarity scores if not present
      for (const doc of troopDocs) {
        if (doc.similarity === undefined) {
          doc.similarity = cosineSimilarity(queryEmbedding, doc.embedding);
        }
      }
      
      // Add top troop-specific documents to results
      troopDocs.sort((a, b) => b.similarity - a.similarity);
      const topTroopDocs = troopDocs.slice(0, 2);
      
      for (const doc of topTroopDocs) {
        const isIncluded = filtered.some(existingDoc => 
          existingDoc.metadata.id === doc.metadata.id && 
          existingDoc.metadata.category === doc.metadata.category
        );
        
        if (!isIncluded) {
          filtered.push(doc);
        }
      }
    }
  }
  
  // Apply MMR to ensure diversity in results
  const diverseResults = applyMMR(filtered, queryEmbedding, 5, 0.7);
  console.log(`Retrieved ${diverseResults.length} diverse context documents`);
  
  return diverseResults;
}

/**
 * Generate a prompt for the Strategy Advisor
 * @param {string} query - User query
 * @param {Object} queryAnalysis - Analysis of the query
 * @param {Object[]} contextDocs - Retrieved context documents
 * @returns {string} - Prompt for the LLM
 */
function generateAdvisorPrompt(query, queryAnalysis, contextDocs) {
  console.log('Generating advisor prompt...');
  
  // Format context information
  let contextInfo = contextDocs.map((doc, index) => 
    `[Document ${index + 1}] ${doc.metadata.name ? doc.metadata.name + ': ' : ''}${doc.content.trim()}`
  ).join('\n\n');
  
  // Create specific instructions based on query intent
  let intentInstructions = "";
  
  if (queryAnalysis.intent === "upgrade_priority") {
    intentInstructions = `
    - Focus on providing upgrade priority recommendations
    - Consider the player's Town Hall level (${queryAnalysis.params.townHallLevel || 'unknown'})
    - Prioritize items that will have the biggest impact on gameplay
    - Provide a clear ordering of what to upgrade first, second, etc.
    - Consider both offensive and defensive upgrades
    - Mention specific unit levels and building levels where appropriate
    - Consider resource constraints (gold vs. elixir vs. dark elixir)
    - Specify which laboratory upgrades are most valuable
    `;
    
    if (queryAnalysis.params.focus === "offense") {
      intentInstructions += `
      - Focus specifically on offensive upgrades (troops, spells, heroes, army buildings)
      - Prioritize units that are versatile across multiple attack strategies
      `;
    } else if (queryAnalysis.params.focus === "defense") {
      intentInstructions += `
      - Focus specifically on defensive upgrades (defensive buildings, traps, walls)
      - Prioritize defenses that protect against common attack strategies
      `;
    }
  } 
  else if (queryAnalysis.intent === "attack_strategy") {
    intentInstructions = `
    - Recommend a specific, detailed attack strategy
    - Include army composition with specific troop counts
    - Explain the deployment order and timing
    - Mention which spells to use and when
    - Consider the target Town Hall level (${queryAnalysis.params.targetTH || 'unknown'})
    - Explain how to handle common base layouts
    - Include hero usage recommendations
    - Mention potential backup plans if parts of the attack fail
    `;
    
    if (queryAnalysis.params.attackType === "air") {
      intentInstructions += `
      - Focus on air-based strategies
      - Explain how to handle air defenses and air bombs
      `;
    } else if (queryAnalysis.params.attackType === "ground") {
      intentInstructions += `
      - Focus on ground-based strategies
      - Explain how to handle walls, traps, and splash damage
      `;
    }
    
    if (queryAnalysis.params.purpose === "farming") {
      intentInstructions += `
      - Optimize for resource collection rather than total destruction
      - Consider army training costs and time
      `;
    } else if (queryAnalysis.params.purpose === "war") {
      intentInstructions += `
      - Optimize for 3-star attacks
      - Assume time is not a constraint for training
      `;
    } else if (queryAnalysis.params.purpose === "trophy") {
      intentInstructions += `
      - Optimize for securing at least 2 stars consistently
      - Balance army training time and effectiveness
      `;
    }
  }
  else if (queryAnalysis.intent === "base_design") {
    intentInstructions = `
    - Provide base design principles for a ${queryAnalysis.params.baseType || 'general'} base
    - Consider Town Hall level ${queryAnalysis.params.townHallLevel || 'unknown'}
    - Explain the placement of key defenses
    - Discuss wall arrangement and compartments
    - Mention trap placement with specific locations
    - Explain how to protect key buildings (Town Hall, resource storages, etc.)
    - Provide a logical layout sequence or zones
    - Explain how the design counters common attack strategies
    `;
  }
  else if (queryAnalysis.intent === "resource_management") {
    intentInstructions = `
    - Provide advice on ${queryAnalysis.params.goal || 'managing'} ${queryAnalysis.params.resourceType || 'resources'}
    - Consider the player's Town Hall level (${queryAnalysis.params.townHallLevel || 'unknown'})
    - Suggest specific farming strategies if appropriate
    - Explain upgrade priority from a resource efficiency perspective
    - Provide tips for protecting resources from raids
    - Mention ways to maximize resource production
    - Suggest the best leagues or trophy ranges for resource collection
    `;
  }
  
  // Create the full prompt with better structure
  const prompt = `
You are a Clash of Clans Strategy Advisor, knowledgeable about all aspects of the game including troops, buildings, spells, attack strategies, and base designs across all Town Hall levels.

USER QUERY: "${query}"

QUERY ANALYSIS:
- Intent: ${queryAnalysis.intent.replace(/_/g, ' ')}
- Town Hall Level: ${queryAnalysis.params.townHallLevel || queryAnalysis.params.targetTH || 'Unknown'}
${queryAnalysis.params.focusTroop ? `- Focus Troop: ${queryAnalysis.params.focusTroop}` : ''}
${queryAnalysis.params.attackType ? `- Attack Type: ${queryAnalysis.params.attackType}` : ''}
${queryAnalysis.params.baseType ? `- Base Type: ${queryAnalysis.params.baseType}` : ''}
${queryAnalysis.params.itemType ? `- Item Type: ${queryAnalysis.params.itemType}` : ''}

RELEVANT CLASH OF CLANS INFORMATION:
${contextInfo}

INSTRUCTIONS:
Please provide a comprehensive, accurate response to help the player with their question. Your response should be structured, helpful, and directly address their specific query.

${intentInstructions}

IMPORTANT GUIDELINES:
- Use the provided context information, but don't just repeat it verbatim
- If the context doesn't fully address the query, use your knowledge of Clash of Clans
- Be specific and detailed in your recommendations
- Always cite your sources when providing specific information (e.g., [Document X])
- Only mention troops, spells, buildings, and features that exist in Clash of Clans
- If you're unsure about any information, acknowledge the limitations
- Present your response in a clear, structured format with headings and lists where appropriate
- Focus on practical advice that can be implemented immediately

Based on the user's query and available context, provide your most helpful response now.
`;
  
  return prompt;
}

/**
 * Run an LLM inference using Ollama with improved parameters
 * @param {string} prompt - The prompt to send to the LLM
 * @returns {Promise<string>} - The LLM's response
 */
async function runLLMInference(prompt) {
  return LLMConfigManager.runLLMInference(prompt, {
    temperature: 0.5,
    num_predict: 2048,
    top_p: 0.9,
    top_k: 40,
    stop: ["USER QUERY:", "QUERY ANALYSIS:", "INSTRUCTIONS:"]
  });
}

/**
 * Format and post-process the LLM response
 * @param {string} response - Raw LLM response
 * @param {Object} queryAnalysis - Query analysis results
 * @returns {string} - Formatted response
 */
function formatResponse(response, queryAnalysis) {
  // Remove any lingering prompt template artifacts
  let cleaned = response.replace(/RELEVANT CLASH OF CLANS INFORMATION:|IMPORTANT GUIDELINES:|Based on the user's query and available context,/g, '');
  
  // Fix document citation format
  cleaned = cleaned.replace(/\[Document (\d+)\]/g, '[Source: Document $1]');
  
  // Add structure based on query intent if missing
  if (queryAnalysis.intent === "upgrade_priority" && !cleaned.includes("Priority") && !cleaned.includes("Upgrade")) {
    // Split by paragraphs
    const paragraphs = cleaned.split('\n\n').filter(p => p.trim().length > 0);
    
    if (paragraphs.length >= 3) {
      // Format as priority list
      cleaned = `# Upgrade Priority Guide for ${queryAnalysis.params.townHallLevel ? `TH${queryAnalysis.params.townHallLevel}` : 'Your Town Hall'}\n\n`;
      
      // First paragraph as intro
      cleaned += paragraphs[0] + '\n\n';
      
      // Middle paragraphs as priorities
      for (let i = 1; i < paragraphs.length - 1; i++) {
        cleaned += `## Priority ${i}: ${paragraphs[i]}\n\n`;
      }
      
      // Last paragraph as conclusion
      cleaned += `## Final Recommendations\n\n${paragraphs[paragraphs.length - 1]}`;
    }
  }
  
  return cleaned;
}

/**
 * Process a user strategy query and generate a response
 * @param {string} query - User query
 * @returns {Promise<Object>} - Response object
 */
async function processQuery(query) {
  try {
    console.log('Processing strategy query:', query);
    
    // Load data and embeddings
    const { embeddings } = await loadData();
    
    // Analyze the query
    const queryAnalysis = analyzeQuery(query);
    console.log('Query analysis:', queryAnalysis);
    
    // Retrieve relevant context
    const contextDocs = await retrieveContext(query, queryAnalysis, embeddings);
    console.log(`Retrieved ${contextDocs.length} context documents`);
    
    // Generate advisor prompt
    const prompt = generateAdvisorPrompt(query, queryAnalysis, contextDocs);
    
    // Run LLM inference
    const rawResponse = await runLLMInference(prompt);
    
    // Format the response
    const formattedResponse = formatResponse(rawResponse, queryAnalysis);
    
    // Return the final result with enhanced metadata
    return {
      query,
      intent: queryAnalysis.intent,
      parameters: queryAnalysis.params,
      response: formattedResponse,
      sources: contextDocs.map(doc => ({
        name: doc.metadata.name || 'Unknown',
        type: doc.metadata.type || 'Unknown',
        category: doc.metadata.category || 'Unknown',
        url: doc.metadata.url || null,
        relevance: doc.similarity ? Math.round(doc.similarity * 100) : null
      })),
      metadata: {
        contextCount: contextDocs.length,
        queryKeywords: extractKeywords(query),
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`Error processing strategy query: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processQuery,
  analyzeQuery,
  retrieveContext,
  generateAdvisorPrompt,
  runLLMInference,
  extractKeywords,
  findKeywordMatches,
  applyMMR,
  filterByTownHallLevel,
  formatResponse
};