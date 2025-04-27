const express = require('express');
const { processQuery, analyzeQuery, extractKeywords } = require('./advisor');

const router = express.Router();

router.post('/advisor', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Missing required field: query',
        message: 'Please provide a strategy question in the "query" field'
      });
    }
    
    console.log('Received strategy query:', query);
    
    if (query.length < 5) {
      return res.status(400).json({
        error: 'Query too short',
        message: 'Please provide a more detailed question'
      });
    }
    
    const result = await processQuery(query);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Error in advisor API: ${error.message}`);
    return res.status(500).json({
      error: 'An error occurred while processing your query',
      message: error.message
    });
  }
});

router.post('/advisor/analyze', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        error: 'Missing required field: query'
      });
    }
    
    const analysis = analyzeQuery(query);
    const keywords = extractKeywords(query);
    
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