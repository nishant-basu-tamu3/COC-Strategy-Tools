const express = require('express');
const cors = require('cors');
const simulatorRouter = require('./strategy-simulator/api');
const advisorRouter = require('./strategy-advisor/api');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use('/api', simulatorRouter);
app.use('/api', advisorRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'Clash of Clans Strategy API',
    version: '1.0.0',
    endpoints: [
      {
        path: '/api/simulate',
        method: 'POST',
        description: 'Simulate a battle between an army and a base'
      },
      {
        path: '/api/advisor',
        method: 'POST',
        description: 'Get strategy advice for Clash of Clans'
      },
      {
        path: '/api/advisor/analyze',
        method: 'POST',
        description: 'Analyze a strategy query without generating a full response'
      }
    ]
  });
});

// Add simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Strategy Simulator: http://localhost:${PORT}/api/simulate`);
  console.log(`- Strategy Advisor: http://localhost:${PORT}/api/advisor`);
  console.log(`- Query Analysis: http://localhost:${PORT}/api/advisor/analyze`);
});

module.exports = app;