# Clash of Clans Strategy Tools

A comprehensive strategy tool for Clash of Clans using RAG (Retrieval Augmented Generation) and LLMs to provide intelligent battle simulations and strategy advice.

## Features

- **Battle Simulator**: Simulate attacks between custom armies and bases with detailed results
- **Strategy Advisor**: Get AI-powered advice for upgrades, attacks, base designs, and resource management
- **RAG System**: Uses retrieval augmented generation to provide contextually relevant advice
- **Responsive UI**: Modern Vue.js interface for easy strategy planning

## Project Structure

```
coc-strategy-tools/
├── data/               # Data files
│   ├── raw/            # Raw scraped data
│   ├── processed/      # Processed data and embeddings
│   └── chroma_db/      # Vector database
├── src/
│   ├── app.js          # Express server entry point
│   ├── config/         # Configuration files
│   ├── data-collection/# Web scraping tools
│   ├── data-processing/# Data processing and embedding generation
│   ├── strategy-advisor/# Strategy advisor service
│   └── strategy-simulator/# Battle simulator service
└── frontend/           # Vue.js frontend application
```

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- NPM or Yarn
- Google API key (for Gemini LLM) or Ollama (for local LLM)

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/coc-strategy-tools.git
   cd coc-strategy-tools
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set your LLM provider and API keys

4. Run data collection (optional, data is included):
   ```
   npm run scrape
   ```

5. Process data and generate embeddings:
   ```
   npm run process
   ```

6. Start the backend server:
   ```
   npm run start
   ```

The server will run on http://localhost:3000 by default.

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run serve
   ```

The frontend will be available at http://localhost:8080.

## API Endpoints

### Strategy Simulator

- **POST /api/simulate**
  - Simulates a battle between an army and a base
  - Request body: `{ army: {...}, target: {...} }`
  - Returns battle results with stars, destruction percentage, and detailed analysis

### Strategy Advisor

- **POST /api/advisor**
  - Provides strategic advice based on a natural language query
  - Request body: `{ query: "What should I upgrade first at TH9?" }`
  - Returns formatted advice with sources and metadata

- **POST /api/advisor/analyze**
  - Analyzes a query to determine intent and extract parameters
  - Request body: `{ query: "What should I upgrade first at TH9?" }`
  - Returns query analysis and extracted keywords

## LLM Configuration

The system supports two LLM providers:

1. **Gemini** (Google AI):
   - Set `LLM_PROVIDER=gemini` in .env
   - Configure `GOOGLE_API_KEY` and model names

2. **Ollama** (Local LLM):
   - Set `LLM_PROVIDER=ollama` in .env
   - Configure `OLLAMA_BASE_URL` and model names
   - Requires Ollama to be running locally

## License

This project is for educational purposes only. Clash of Clans is owned by Supercell.