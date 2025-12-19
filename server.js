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

// Store active SSE connections for real-time logging
const activeConnections = new Map();

// SSE endpoint for real-time debug logs
app.get('/api/debug-stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Store connection
  activeConnections.set(sessionId, res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ step: 'CONNECTED', message: 'Debug stream connected', timestamp: new Date().toISOString() })}\n\n`);
  
  // Handle client disconnect
  req.on('close', () => {
    activeConnections.delete(sessionId);
    res.end();
  });
});

// Helper function to send log to SSE clients
async function sendDebugLog(sessionId, step, message, data = null) {
  const logEntry = {
    step,
    message,
    timestamp: new Date().toISOString(),
    data
  };
  
  const connection = activeConnections.get(sessionId);
  if (connection) {
    try {
      connection.write(`data: ${JSON.stringify(logEntry)}\n\n`);
      // Small delay to ensure each log is sent separately and visible
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error('Error sending debug log:', error);
    }
  }
  
  console.log(`[${step}] ${message}`, data || '');
}

// Main search endpoint
app.post('/api/search', async (req, res) => {
  const debugLogs = [];
  const startTime = Date.now();
  const sessionId = req.body.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const isDebugMode = req.body.debug === true;
  
  try {
    const { query, numResults = 5 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Query is required' 
      });
    }

    const logStep = async (step, message, data = null) => {
      const timestamp = new Date().toISOString();
      const logEntry = { step, message, timestamp, data };
      debugLogs.push(logEntry);
      
      // Send to SSE if debug mode is enabled (await to ensure proper streaming)
      if (isDebugMode) {
        await sendDebugLog(sessionId, step, message, data);
      }
    };

    await logStep(1, 'Received search query', { query, numResults });

    // Step 1: Search the web using Exa.ai
    await logStep(2, 'Initiating web search with Exa.ai...');
    const searchStartTime = Date.now();
    const searchResults = await searchWeb(query, numResults);
    const searchDuration = Date.now() - searchStartTime;
    
    if (!searchResults || searchResults.length === 0) {
      await logStep('ERROR', 'No search results found');
      return res.status(404).json({ 
        error: 'No search results found',
        sessionId,
        ...(isDebugMode && { debugLogs })
      });
    }

    await logStep(3, `Found ${searchResults.length} search results`, {
      duration: `${searchDuration}ms`,
      results: searchResults.map(r => ({ title: r.title, url: r.url }))
    });

    // Step 2: Generate answer using Groq
    await logStep(4, 'Generating AI answer with Groq...');
    const llmStartTime = Date.now();
    
    // Create logging callback for Groq component
    const groqLogCallback = isDebugMode ? async (step, message, data = null) => {
      await sendDebugLog(sessionId, step, message, data);
    } : null;
    
    const answer = await generateAnswer(query, searchResults, groqLogCallback);
    const llmDuration = Date.now() - llmStartTime;
    
    await logStep(5, 'Answer generated successfully', {
      duration: `${llmDuration}ms`,
      answerLength: answer.length
    });

    // Step 3: Format the response
    await logStep(6, 'Formatting response...');
    const formattedResponse = formatResponse(answer, searchResults);
    
    const totalDuration = Date.now() - startTime;
    await logStep('COMPLETE', 'Search completed', {
      totalDuration: `${totalDuration}ms`,
      sourceCount: formattedResponse.sourceCount
    });

    // Close SSE connection
    if (isDebugMode) {
      const connection = activeConnections.get(sessionId);
      if (connection) {
        connection.write(`data: ${JSON.stringify({ step: 'CLOSED', message: 'Stream closed', timestamp: new Date().toISOString() })}\n\n`);
        activeConnections.delete(sessionId);
        connection.end();
      }
    }

    // Return the formatted response
    res.json({
      ...formattedResponse,
      sessionId,
      ...(isDebugMode && { debugLogs })
    });

  } catch (error) {
    const errorLog = {
      step: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      data: { error: error.toString() }
    };
    debugLogs.push(errorLog);
    
    if (isDebugMode) {
      await sendDebugLog(sessionId, 'ERROR', error.message, { error: error.toString() });
      const connection = activeConnections.get(sessionId);
      if (connection) {
        connection.write(`data: ${JSON.stringify({ step: 'CLOSED', message: 'Stream closed due to error', timestamp: new Date().toISOString() })}\n\n`);
        activeConnections.delete(sessionId);
        connection.end();
      }
    }
    
    console.error('Error in /api/search:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      sessionId,
      ...(isDebugMode && { debugLogs })
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


