// src/data-processing/process-data.js
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { Document } = require('langchain/document');
const { Chroma } = require('langchain/vectorstores/chroma');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  dataDir: path.join(__dirname, '../../data'),
  rawDir: path.join(__dirname, '../../data/raw'),
  processedDir: path.join(__dirname, '../../data/processed'),
  chromaDir: path.join(__dirname, '../../data/chroma_db'),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
};

/**
 * Custom Ollama embeddings class that mimics LangChain's Embeddings interface
 */
class OllamaEmbeddings {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || CONFIG.ollamaBaseUrl;
    this.model = config.model || CONFIG.ollamaModel;
    this.batchSize = config.batchSize || 16; // Process in batches to avoid overwhelming Ollama
  }

  /**
   * Get embeddings for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async embedQuery(text) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: this.model,
        prompt: text
      });
      
      return response.data.embedding;
    } catch (error) {
      console.error(`Error getting embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get embeddings for multiple texts
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async embedDocuments(texts) {
    const embeddings = [];
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      console.log(`Processing embedding batch ${Math.floor(i/this.batchSize) + 1}/${Math.ceil(texts.length/this.batchSize)}...`);
      
      // Process each text in the batch
      const batchPromises = batch.map(text => this.embedQuery(text));
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
    }
    
    return embeddings;
  }
}

/**
 * Combine all data into a single dataset
 * @returns {Promise<Object>} Combined data
 */
async function combineData() {
  try {
    console.log('Combining data from all sources...');
    
    // Read all files from the data directory
    const categories = ['troops', 'defenses', 'spells', 'heroes'];
    let allData = [];
    
    for (const category of categories) {
      const filePath = path.join(CONFIG.dataDir, `${category}.json`);
      
      if (await fs.pathExists(filePath)) {
        const data = await fs.readJson(filePath);
        console.log(`Read ${data.length} ${category} items`);
        allData = allData.concat(data);
      } else {
        console.warn(`File not found: ${filePath}`);
      }
    }
    
    console.log(`Combined data contains ${allData.length} items`);
    return allData;
  } catch (error) {
    console.error(`Error combining data: ${error.message}`);
    return [];
  }
}

/**
 * Clean and enhance the data
 * @param {Array} data - Combined raw data
 * @returns {Array} - Cleaned and enhanced data
 */
function cleanAndEnhanceData(data) {
  console.log('Cleaning and enhancing data...');
  
  return data.map(item => {
    // Create a copy to avoid modifying the original
    const cleanedItem = { ...item };
    
    // Fill in missing descriptions if possible
    if (!cleanedItem.description || cleanedItem.description.trim() === '') {
      cleanedItem.description = generateDescription(cleanedItem);
    }
    
    // Clean up and format stat values
    if (cleanedItem.stats_by_level && Array.isArray(cleanedItem.stats_by_level)) {
      cleanedItem.stats_by_level = cleanedItem.stats_by_level.map(level => {
        const cleanedLevel = { ...level };
        
        // Convert string numbers to actual numbers
        Object.keys(cleanedLevel).forEach(key => {
          const value = cleanedLevel[key];
          if (typeof value === 'string' && value.match(/^[\d,]+$/)) {
            // Remove commas and convert to number
            cleanedLevel[key] = parseInt(value.replace(/,/g, ''), 10);
          }
        });
        
        return cleanedLevel;
      });
    }
    
    return cleanedItem;
  });
}

/**
 * Generate a basic description for items missing one
 * @param {Object} item - Data item
 * @returns {string} - Generated description
 */
function generateDescription(item) {
  if (item.type === 'troop') {
    return `${item.name} is a troop in Clash of Clans. It can be trained in the Barracks and used in attacks.`;
  } else if (item.type === 'defense') {
    return `${item.name} is a defensive building in Clash of Clans that protects your village from enemy attacks.`;
  } else if (item.type === 'spell') {
    return `${item.name} is a spell in Clash of Clans that can be brewed in the Spell Factory and used during attacks.`;
  } else if (item.type === 'hero') {
    return `${item.name} is a hero in Clash of Clans with unique abilities that can be used to strengthen your attacks.`;
  }
  
  return `${item.name} is a game element in Clash of Clans.`;
}

/**
 * Create text documents from the data items for embedding
 * @param {Array} data - Cleaned data items
 * @returns {Array<Document>} - Array of Document objects for embedding
 */
function createDocuments(data) {
  console.log('Creating text documents for embedding...');
  
  const documents = [];
  
  for (const item of data) {
    // Basic info document
    const basicInfo = new Document({
      pageContent: `
        Name: ${item.name}
        Type: ${item.type}
        Description: ${item.description || ''}
      `,
      metadata: {
        id: item.id,
        name: item.name,
        type: item.type,
        category: 'basic_info',
        url: item.url
      }
    });
    documents.push(basicInfo);
    
    // Stats document - includes detailed stats
    if (item.stats_by_level && item.stats_by_level.length > 0) {
      // Create a formatted string with the stats
      let statsContent = `${item.name} Stats by Level:\n`;
      
      item.stats_by_level.forEach(levelStats => {
        statsContent += `Level ${levelStats.level || '?'}:\n`;
        
        // Add all available stats
        Object.entries(levelStats).forEach(([key, value]) => {
          if (key !== 'level') {
            statsContent += `  ${key.replace(/_/g, ' ')}: ${value}\n`;
          }
        });
      });
      
      const statsDoc = new Document({
        pageContent: statsContent,
        metadata: {
          id: item.id,
          name: item.name,
          type: item.type,
          category: 'stats',
          url: item.url
        }
      });
      documents.push(statsDoc);
    }
    
    // Special abilities document
    if (item.special_abilities && item.special_abilities.length > 0) {
      const abilitiesContent = `
        ${item.name} Special Abilities:
        ${item.special_abilities.join('\n')}
      `;
      
      const abilitiesDoc = new Document({
        pageContent: abilitiesContent,
        metadata: {
          id: item.id,
          name: item.name,
          type: item.type,
          category: 'abilities',
          url: item.url
        }
      });
      documents.push(abilitiesDoc);
    }
    
    // Troop-specific document
    if (item.type === 'troop') {
      const troopContent = `
        Troop: ${item.name}
        Housing Space: ${item.housing_space || 'Unknown'}
        Movement Speed: ${item.movement_speed || 'Unknown'}
        Attack Speed: ${item.attack_speed || 'Unknown'}
        Range: ${item.range || 'Unknown'}
        Target Preference: ${item.target_preference || 'Any'}
        Damage Type: ${item.damage_type || 'Unknown'}
        Training Time: ${item.training_time || 'Unknown'}
        Training Cost: ${item.training_cost || 'Unknown'}
      `;
      
      const troopDoc = new Document({
        pageContent: troopContent,
        metadata: {
          id: item.id,
          name: item.name,
          type: item.type,
          category: 'troop_details',
          url: item.url
        }
      });
      documents.push(troopDoc);
    }
    
    // Defense-specific document
    if (item.type === 'defense') {
      const defenseContent = `
        Defense: ${item.name}
        Targets: ${item.targets || 'Unknown'}
        Damage Type: ${item.damage_type || 'Unknown'}
        Range: ${item.range || 'Unknown'}
        Attack Speed: ${item.attack_speed || 'Unknown'}
        Build Time: ${item.build_time || 'Unknown'}
        Build Cost: ${item.build_cost || 'Unknown'}
      `;
      
      const defenseDoc = new Document({
        pageContent: defenseContent,
        metadata: {
          id: item.id,
          name: item.name,
          type: item.type,
          category: 'defense_details',
          url: item.url
        }
      });
      documents.push(defenseDoc);
    }
    
    // Spell-specific document
    if (item.type === 'spell') {
      const spellContent = `
        Spell: ${item.name}
        Housing Space: ${item.housing_space || 'Unknown'}
        Brewing Time: ${item.brewing_time || 'Unknown'}
        Brewing Cost: ${item.brewing_cost || 'Unknown'}
        Research Time: ${item.research_time || 'Unknown'}
        Research Cost: ${item.research_cost || 'Unknown'}
        Laboratory Level: ${item.laboratory_level || 'Unknown'}
      `;
      
      const spellDoc = new Document({
        pageContent: spellContent,
        metadata: {
          id: item.id,
          name: item.name,
          type: item.type,
          category: 'spell_details',
          url: item.url
        }
      });
      documents.push(spellDoc);
    }
    
    // Hero-specific document
    if (item.type === 'hero') {
      const heroContent = `
        Hero: ${item.name}
        Preferred Target: ${item.preferred_target || 'Any'}
        Attack Type: ${item.attack_type || 'Unknown'}
        Attack Speed: ${item.attack_speed || 'Unknown'}
        Movement Speed: ${item.movement_speed || 'Unknown'}
        Range: ${item.range || 'Unknown'}
        Search Radius: ${item.search_radius || 'Unknown'}
      `;
      
      const heroDoc = new Document({
        pageContent: heroContent,
        metadata: {
          id: item.id,
          name: item.name,
          type: item.type,
          category: 'hero_details',
          url: item.url
        }
      });
      documents.push(heroDoc);
    }
  }
  
  console.log(`Created ${documents.length} documents for embedding`);
  return documents;
}

/**
 * Save embeddings to a file (as a backup)
 * @param {Array<Document>} documents - Documents 
 * @param {Array<Array<number>>} embeddings - Embeddings 
 */
async function saveEmbeddingsToFile(documents, embeddings) {
  try {
    // Create an array of objects with document content and embeddings
    const embeddingData = documents.map((doc, index) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      embedding: embeddings[index]
    }));
    
    // Save to file
    const embeddingsPath = path.join(CONFIG.processedDir, 'embeddings.json');
    await fs.writeJson(embeddingsPath, embeddingData, { spaces: 2 });
    console.log(`Saved embeddings to ${embeddingsPath}`);
  } catch (error) {
    console.error(`Error saving embeddings to file: ${error.message}`);
  }
}

/**
 * Generate embeddings for documents
 * @param {Array<Document>} documents - Documents to embed
 * @returns {Promise<Array<Array<number>>>} - Embeddings
 */
async function generateDocumentEmbeddings(documents) {
  try {
    console.log('Generating embeddings with Ollama...');
    
    // Initialize Ollama embeddings
    const embeddings = new OllamaEmbeddings();
    
    // Get document contents
    const texts = documents.map(doc => doc.pageContent);
    
    // Generate embeddings
    return await embeddings.embedDocuments(texts);
  } catch (error) {
    console.error(`Error generating embeddings: ${error.message}`);
    throw error;
  }
}

/**
 * Save processed data to JSON
 * @param {Array} data - Processed data
 * @returns {Promise<void>}
 */
async function saveProcessedData(data) {
  try {
    // Ensure processed directory exists
    await fs.ensureDir(CONFIG.processedDir);
    
    // Save all data to one file
    const allDataPath = path.join(CONFIG.processedDir, 'all_data.json');
    await fs.writeJson(allDataPath, data, { spaces: 2 });
    console.log(`Saved all processed data to ${allDataPath}`);
    
    // Also save by category
    const byType = {
      troops: data.filter(item => item.type === 'troop'),
      defenses: data.filter(item => item.type === 'defense'),
      spells: data.filter(item => item.type === 'spell'),
      heroes: data.filter(item => item.type === 'hero'),
    };
    
    for (const [type, items] of Object.entries(byType)) {
      const typePath = path.join(CONFIG.processedDir, `${type}.json`);
      await fs.writeJson(typePath, items, { spaces: 2 });
      console.log(`Saved ${items.length} ${type} to ${typePath}`);
    }
    
  } catch (error) {
    console.error(`Error saving processed data: ${error.message}`);
  }
}

/**
 * Store documents with embeddings using Chroma local file-based storage
 * @param {Array<Document>} documents - Documents to store
 * @param {Array<Array<number>>} embeddings - Document embeddings
 */
async function storeDocumentsWithEmbeddings(documents, embeddings) {
  try {
    console.log('Storing documents with embeddings in local Chroma...');
    
    // Ensure directory exists
    await fs.ensureDir(CONFIG.chromaDir);
    
    // Create unique IDs for each document
    const ids = documents.map((_, i) => `doc_${i}`);
    
    // Create metadata array
    const metadatas = documents.map(doc => doc.metadata);
    
    // Create content array
    const contents = documents.map(doc => doc.pageContent);
    
    // Save as JSON (basic format for now)
    const chromaData = {
      ids,
      embeddings,
      metadatas,
      documents: contents
    };
    
    const chromaPath = path.join(CONFIG.chromaDir, 'chroma_data.json');
    await fs.writeJson(chromaPath, chromaData, { spaces: 2 });
    
    console.log(`Successfully stored ${documents.length} documents in ${CONFIG.chromaDir}`);
  } catch (error) {
    console.error(`Error storing documents with embeddings: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to process data and generate embeddings
 */
async function main() {
  try {
    console.log('Starting data processing...');
    
    // Ensure directories exist
    await fs.ensureDir(CONFIG.processedDir);
    await fs.ensureDir(CONFIG.chromaDir);
    
    // Combine all data
    const rawData = await combineData();
    if (rawData.length === 0) {
      throw new Error('No data found to process. Run the scraper first.');
    }
    
    // Clean and enhance data
    const processedData = cleanAndEnhanceData(rawData);
    
    // Save processed data
    await saveProcessedData(processedData);
    
    // Create documents for embedding
    const documents = createDocuments(processedData);
    
    // Generate embeddings
    console.log('Generating embeddings (this may take a while)...');
    try {
      // Generate document embeddings
      const documentEmbeddings = await generateDocumentEmbeddings(documents);
      
      // Save embeddings to file as backup
      await saveEmbeddingsToFile(documents, documentEmbeddings);
      
      // Store documents with embeddings using local file storage
      await storeDocumentsWithEmbeddings(documents, documentEmbeddings);
      
      console.log('Data processing and embedding complete!');
    } catch (error) {
      console.error(`Error generating or storing embeddings: ${error.message}`);
      console.error('Saving processed data and documents without embeddings...');
    }
    
  } catch (error) {
    console.error('Error processing data:', error);
  }
}

// Run the processor if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  combineData,
  cleanAndEnhanceData,
  createDocuments,
  generateDocumentEmbeddings,
  main
};