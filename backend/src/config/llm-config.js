// src/config/llm-config.js
const dotenv = require('dotenv');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

// Load environment variables
dotenv.config();

// LLM Provider Configuration
const LLM_PROVIDERS = {
  OLLAMA: 'ollama',
  GEMINI: 'gemini'
};

// Configuration class to manage LLM settings
class LLMConfigManager {
  constructor() {
    // Default to Ollama
    this.currentProvider = process.env.LLM_PROVIDER || LLM_PROVIDERS.OLLAMA;
    
    // Ollama Configuration
    this.ollamaConfig = {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_LLM_MODEL || 'mistral:7b',
      embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
    };
    
    // Gemini Configuration
    this.geminiConfig = {
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash',
      embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'models/embedding-001'
    };
  }

  /**
   * Switch the current LLM provider
   * @param {string} provider - The provider to switch to (ollama or gemini)
   */
  switchProvider(provider) {
    if (!Object.values(LLM_PROVIDERS).includes(provider)) {
      throw new Error(`Invalid LLM provider. Must be one of: ${Object.values(LLM_PROVIDERS).join(', ')}`);
    }
    
    this.currentProvider = provider;
    console.log(`Switched LLM provider to: ${provider}`);
  }

  /**
   * Get the current LLM provider
   * @returns {string} - Current LLM provider
   */
  getCurrentProvider() {
    return this.currentProvider;
  }

  /**
   * Generate embeddings for a query
   * @param {string} query - The query to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateQueryEmbedding(query) {
    if (this.currentProvider === LLM_PROVIDERS.OLLAMA) {
      try {
        const response = await axios.post(`${this.ollamaConfig.baseUrl}/api/embeddings`, {
          model: this.ollamaConfig.embeddingModel,
          prompt: query
        });
        
        return response.data.embedding;
      } catch (error) {
        console.error(`Ollama embedding error: ${error.message}`);
        throw error;
      }
    } else if (this.currentProvider === LLM_PROVIDERS.GEMINI) {
      try {
        // Initialize Gemini embedding
        const embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey: this.geminiConfig.apiKey,
          modelName: this.geminiConfig.embeddingModel,
        });
        
        return await embeddings.embedQuery(query);
      } catch (error) {
        console.error(`Gemini embedding error: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Run LLM inference
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} [options={}] - Additional options for inference
   * @returns {Promise<string>} - The LLM's response
   */
  async runLLMInference(prompt, options = {}) {
    if (this.currentProvider === LLM_PROVIDERS.OLLAMA) {
      try {
        const response = await axios.post(`${this.ollamaConfig.baseUrl}/api/generate`, {
          model: this.ollamaConfig.model,
          prompt: prompt,
          temperature: options.temperature || 0.5,
          num_predict: options.numPredict || 2048,
          top_p: options.topP || 0.9,
          top_k: options.topK || 40,
          stop: options.stop || [],
          stream: false,
          ...options
        });
        
        return response.data.response;
      } catch (error) {
        console.error(`Ollama inference error: ${error.message}`);
        throw error;
      }
    } else if (this.currentProvider === LLM_PROVIDERS.GEMINI) {
      try {
        // Initialize Gemini model
        const genAI = new GoogleGenerativeAI(this.geminiConfig.apiKey);
        const model = genAI.getGenerativeModel({
          model: this.geminiConfig.modelName,
          generationConfig: {
            temperature: options.temperature || 0.5,
            topP: options.topP || 0.9,
            topK: options.topK || 40,
            maxOutputTokens: options.numPredict || 1024,
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            },
          ],
        });
        
        // Generate content
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        console.error(`Gemini inference error: ${error.message}`);
        throw error;
      }
    }
  }
}

// Export a singleton instance
module.exports = new LLMConfigManager();