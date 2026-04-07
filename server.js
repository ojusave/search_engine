/**
 * Main Express Server
 * Perplexity-style AI search with conversation memory.
 * Supports streaming responses and PostgreSQL persistence.
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const config = require('./config');
const { searchWeb } = require('./components/search');
const { generateAnswer, generateAnswerStream } = require('./components/llm');
const { formatResponse } = require('./components/responseFormatter');
const { rewriteQuery, needsRewriting } = require('./components/queryRewriter');
const db = require('./components/database');
const memoryStore = require('./components/memoryStore');

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true
}));

// ============================================
// Database initialization
// ============================================

let dbConnected = false;

(async () => {
  if (config.database.url) {
    try {
      await db.initializeSchema();
      dbConnected = true;
      console.log('Database connected and initialized');
    } catch (error) {
      console.error('Database initialization failed:', error.message);
      console.log('App will run with in-memory storage');
    }
  } else {
    console.log('No DATABASE_URL configured — using in-memory storage');
  }
})();

// ============================================
// Periodic cleanup — wipe conversations every 15 minutes
// ============================================

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

const cleanupTimer = setInterval(async () => {
  try {
    if (dbConnected) {
      await db.deleteAllConversations();
    }
    memoryStore.deleteAll();
    console.log(`[CLEANUP] All conversations purged (runs every 15 min)`);
  } catch (err) {
    console.error('[CLEANUP] Failed:', err.message);
  }
}, CLEANUP_INTERVAL_MS);

cleanupTimer.unref();

// ============================================
// Health check
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// Conversation CRUD
// ============================================

app.post('/api/conversations', async (req, res) => {
  try {
    const id = uuidv4();
    const conversation = dbConnected
      ? await db.createConversation(id)
      : memoryStore.createConversation(id);
    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = dbConnected
      ? await db.getRecentConversations(20)
      : memoryStore.getRecent(20);
    res.json(conversations);
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

app.get('/api/conversations/:id', async (req, res) => {
  try {
    const conversation = dbConnected
      ? await db.getConversation(req.params.id)
      : memoryStore.getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json(conversation);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

app.delete('/api/conversations/:id', async (req, res) => {
  try {
    dbConnected
      ? await db.deleteConversation(req.params.id)
      : memoryStore.deleteConversation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

app.delete('/api/conversations', async (req, res) => {
  try {
    dbConnected
      ? await db.deleteAllConversations()
      : memoryStore.deleteAll();
    res.json({ success: true, message: 'All conversations deleted' });
  } catch (error) {
    console.error('Error deleting all conversations:', error);
    res.status(500).json({ error: 'Failed to delete all conversations' });
  }
});

// ============================================
// Streaming search with conversation context
// ============================================

app.get('/api/conversations/:conversationId/search/stream', async (req, res) => {
  const startTime = Date.now();
  const { conversationId } = req.params;
  const query = req.query.q;
  const numResults = parseInt(req.query.numResults) || 5;

  if (!query?.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const abortController = new AbortController();
  const { signal } = abortController;

  req.on('close', () => {
    abortController.abort();
  });

  const sendEvent = (event, data) => {
    if (!signal.aborted) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const messageId = uuidv4();

    let history = [];
    try {
      history = dbConnected
        ? await db.getConversationHistory(conversationId, 10)
        : memoryStore.getHistory(conversationId, 10);
    } catch (e) {
      console.log('Could not fetch history:', e.message);
    }

    console.log(`[CONTEXT] Conversation ${conversationId}: ${history.length} prior messages`);
    sendEvent('status', { message: 'Processing query...', step: 1 });

    let searchQuery = query;
    if (history.length > 0 && needsRewriting(query)) {
      sendEvent('status', { message: 'Understanding context...', step: 1 });
      searchQuery = await rewriteQuery(query, history, { signal });
      console.log(`[REWRITE] "${query}" -> "${searchQuery}"`);
      sendEvent('rewrite', { original: query, rewritten: searchQuery });
    }

    sendEvent('status', { message: 'Searching the web...', step: 2 });
    const searchStartTime = Date.now();
    const searchResults = await searchWeb(searchQuery, numResults, { signal });
    const searchDuration = Date.now() - searchStartTime;

    if (!searchResults?.length) {
      sendEvent('error', { message: 'No search results found' });
      return res.end();
    }

    const sources = searchResults.map((result, i) => ({
      number: i + 1,
      title: result.title,
      url: result.url,
      snippet: result.text?.substring(0, 150) + '...'
    }));

    sendEvent('sources', { sources, sourceCount: sources.length, searchDuration: `${searchDuration}ms` });
    sendEvent('status', { message: 'Generating answer...', step: 3 });

    const llmStartTime = Date.now();
    let fullAnswer = '';

    await generateAnswerStream(
      searchQuery,
      searchResults,
      (chunk) => { fullAnswer += chunk; sendEvent('chunk', { text: chunk }); },
      (step, msg) => console.log(`[${step}] ${msg}`),
      { signal }
    );

    const llmDuration = Date.now() - llmStartTime;

    const messageData = {
      id: messageId,
      role: 'user',
      query,
      rewrittenQuery: searchQuery !== query ? searchQuery : null,
      answer: fullAnswer,
      sources
    };

    try {
      dbConnected
        ? await db.addMessage(conversationId, messageData)
        : memoryStore.addMessage(conversationId, messageData);
    } catch (e) {
      console.error('Failed to save message:', e.message);
    }

    sendEvent('done', {
      messageId,
      totalDuration: `${Date.now() - startTime}ms`,
      searchDuration: `${searchDuration}ms`,
      llmDuration: `${llmDuration}ms`
    });

    res.end();
  } catch (error) {
    if (signal.aborted) return;
    console.error('Error in streaming search:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }
});

// ============================================
// Simple streaming search (no conversation)
// ============================================

app.get('/api/search/stream', async (req, res) => {
  const startTime = Date.now();
  const query = req.query.q;
  const numResults = parseInt(req.query.numResults) || 5;

  if (!query?.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const abortController = new AbortController();
  const { signal } = abortController;

  req.on('close', () => {
    abortController.abort();
  });

  const sendEvent = (event, data) => {
    if (!signal.aborted) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    sendEvent('status', { message: 'Searching the web...', step: 1 });

    const searchStartTime = Date.now();
    const searchResults = await searchWeb(query, numResults, { signal });
    const searchDuration = Date.now() - searchStartTime;

    if (!searchResults?.length) {
      sendEvent('error', { message: 'No search results found' });
      return res.end();
    }

    const sources = searchResults.map((result, i) => ({
      number: i + 1,
      title: result.title,
      url: result.url,
      snippet: result.text?.substring(0, 150) + '...'
    }));

    sendEvent('sources', { sources, sourceCount: sources.length, searchDuration: `${searchDuration}ms` });
    sendEvent('status', { message: 'Generating answer...', step: 2 });

    const llmStartTime = Date.now();
    await generateAnswerStream(
      query,
      searchResults,
      (chunk) => sendEvent('chunk', { text: chunk }),
      (step, msg) => console.log(`[${step}] ${msg}`),
      { signal }
    );

    sendEvent('done', {
      totalDuration: `${Date.now() - startTime}ms`,
      searchDuration: `${searchDuration}ms`,
      llmDuration: `${Date.now() - llmStartTime}ms`
    });

    res.end();
  } catch (error) {
    if (signal.aborted) return;
    console.error('Error in streaming search:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }
});

// ============================================
// Non-streaming search
// ============================================

app.post('/api/search', async (req, res) => {
  const startTime = Date.now();
  try {
    const { query, numResults = 5 } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const searchResults = await searchWeb(query, numResults);
    if (!searchResults?.length) {
      return res.status(404).json({ error: 'No search results found' });
    }

    const answer = await generateAnswer(query, searchResults);
    const formattedResponse = formatResponse(answer, searchResults);

    res.json({ ...formattedResponse, duration: `${Date.now() - startTime}ms` });
  } catch (error) {
    console.error('Error in /api/search:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ============================================
// Frontend routes
// ============================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/c/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// Start server
// ============================================

const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database: ${dbConnected ? 'connected' : 'not configured'}`);
});

// Keep-alive timeout should exceed any load balancer's idle timeout (Render uses 60s)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function gracefulShutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close(async () => {
    if (dbConnected) {
      await db.close();
      console.log('Database pool closed');
    }
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
