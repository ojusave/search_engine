/**
 * Main Express Server
 * Handles API requests and serves the frontend
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { searchWeb } = require('./components/search');
const { generateAnswer } = require('./components/llm');
const { formatResponse } = require('./components/responseFormatter');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, numResults = 5 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query is required' 
      });
    }

    console.log(`Searching for: ${query}`);

    // Step 1: Search the web using Exa.ai
    console.log('Step 1: Searching web with Exa.ai...');
    const searchResults = await searchWeb(query, numResults);
    
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ 
        error: 'No search results found' 
      });
    }

    console.log(`Found ${searchResults.length} search results`);

    // Step 2: Generate answer using Groq
    console.log('Step 2: Generating answer with Groq...');
    const answer = await generateAnswer(query, searchResults);
    
    console.log('Answer generated successfully');

    // Step 3: Format the response
    const formattedResponse = formatResponse(answer, searchResults);

    // Return the formatted response
    res.json(formattedResponse);

  } catch (error) {
    console.error('Error in /api/search:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Make sure to set GROQ_API_KEY and EXA_API_KEY in your .env file`);
});


