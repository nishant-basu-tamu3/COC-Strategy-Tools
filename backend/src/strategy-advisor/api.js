// src/strategy-advisor/api.js
const express = require('express');
const { processQuery, analyzeQuery, extractKeywords } = require('./advisor');

// Create router
const router = express.Router();

/**
 * API endpoint for strategy advice
 * POST /api/advisor
 * Request Body:
 * {
 *   "query": "What troops should I upgrade first at TH9?"
 * }
 */
router.post('/advisor', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Validate request body
    if (!query) {
      return res.status(400).json({
        error: 'Missing required field: query',
        message: 'Please provide a strategy question in the "query" field'
      });
    }
    
    // Log the request
    console.log('Received strategy query:', query);
    
    // Do a quick analysis to return immediately if query is too short
    if (query.length < 5) {
      return res.status(400).json({
        error: 'Query too short',
        message: 'Please provide a more detailed question'
      });
    }
    
    // Process the query
    const result = await processQuery(query);
    
    // Return the result
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Error in advisor API: ${error.message}`);
    return res.status(500).json({
      error: 'An error occurred while processing your query',
      message: error.message
    });
  }
});

/**
 * API endpoint to analyze a query (lightweight)
 * POST /api/advisor/analyze
 * Request Body:
 * {
 *   "query": "What troops should I upgrade first at TH9?"
 * }
 */
router.post('/advisor/analyze', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Validate request body
    if (!query) {
      return res.status(400).json({
        error: 'Missing required field: query'
      });
    }
    
    // Analyze the query
    const analysis = analyzeQuery(query);
    const keywords = extractKeywords(query);
    
    // Return the analysis
    return res.status(200).json({
      query,
      analysis,
      keywords
    });
  } catch (error) {
    console.error(`Error in advisor analysis API: ${error.message}`);
    return res.status(500).json({
      error: 'An error occurred while analyzing your query',
      message: error.message
    });
  }
});

module.exports = router;