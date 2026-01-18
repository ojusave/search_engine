/**
 * Main Express Server
 * Perplexity-style AI search with conversation memory
 * Supports streaming responses and PostgreSQL persistence
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const { searchWeb } = require('./components/search');
const { generateAnswer, generateAnswerStream } = require('./components/llm');
const { formatResponse } = require('./components/responseFormatter');
const { rewriteQuery, needsRewriting } = require('./components/queryRewriter');
const db = require('./components/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database on startup
let dbConnected = false;

// In-memory store for when database is not available
const memoryStore = {
  conversations: new Map(),

  createConversation(id) {
    const conv = { id, messages: [], created_at: new Date().toISOString() };
    this.conversations.set(id, conv);
    return conv;
  },

  getConversation(id) {
    return this.conversations.get(id) || null;
  },

  addMessage(conversationId, message) {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.messages.push(message);
      conv.title = conv.title || message.query?.substring(0, 100);
    }
  },

  getHistory(conversationId, limit = 10) {
    const conv = this.conversations.get(conversationId);
    if (!conv) return [];
    return conv.messages.slice(-limit).map(m => ({
      role: 'user',
      query: m.query,
      answer: m.answer
    }));
  },

  getRecent(limit = 20) {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map(c => ({
        id: c.id,
        title: c.title,
        first_query: c.messages[0]?.query,
        created_at: c.created_at
      }));
  }
};

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
    console.log('No DATABASE_URL configured - using in-memory storage');
  }
})();

// Health check endpoint
app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// Conversation API Endpoints
// ============================================

/**
 * Create a new conversation
 */
app.post('/api/conversations', async (req, res) => {
  try {
    const id = uuidv4();
    if (dbConnected) {
      const conversation = await db.createConversation(id);
      res.json(conversation);
    } else {
      const conversation = memoryStore.createConversation(id);
      res.json(conversation);
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Get a conversation with all messages
 */
app.get('/api/conversations/:id', async (req, res) => {
  try {
    let conversation;
    if (dbConnected) {
      conversation = await db.getConversation(req.params.id);
    } else {
      conversation = memoryStore.getConversation(req.params.id);
    }
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

/**
 * Get recent conversations (for sidebar)
 */
app.get('/api/conversations', async (req, res) => {
  try {
    let conversations;
    if (dbConnected) {
      conversations = await db.getRecentConversations(20);
    } else {
      conversations = memoryStore.getRecent(20);
    }
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

/**
 * Delete a conversation
 */
app.delete('/api/conversations/:id', async (req, res) => {
  try {
    if (dbConnected) {
      await db.deleteConversation(req.params.id);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ============================================
// Streaming Search with Conversation Context
// ============================================

/**
 * Streaming search endpoint with conversation context
 */
app.get('/api/conversations/:conversationId/search/stream', async (req, res) => {
  const startTime = Date.now();
  const { conversationId } = req.params;
  const query = req.query.q;
  const numResults = parseInt(req.query.numResults) || 5;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const messageId = uuidv4();

    // Get conversation history for context
    let history = [];
    if (dbConnected) {
      try {
        history = await db.getConversationHistory(conversationId, 10);
      } catch (e) {
        console.log('Could not fetch history:', e.message);
      }
    } else {
      history = memoryStore.getHistory(conversationId, 10);
    }

    console.log(`[CONTEXT] Conversation ${conversationId}: ${history.length} messages in history`);

    sendEvent('status', { message: 'Processing query...', step: 1 });

    // Rewrite query if it needs context
    let searchQuery = query;
    if (history.length > 0 && needsRewriting(query)) {
      sendEvent('status', { message: 'Understanding context...', step: 1 });
      searchQuery = await rewriteQuery(query, history);
      console.log(`[REWRITE] "${query}" -> "${searchQuery}"`);
      sendEvent('rewrite', { original: query, rewritten: searchQuery });
    }

    // Step 1: Search the web
    sendEvent('status', { message: 'Searching the web...', step: 2 });
    const searchStartTime = Date.now();
    const searchResults = await searchWeb(searchQuery, numResults);
    const searchDuration = Date.now() - searchStartTime;

    if (!searchResults || searchResults.length === 0) {
      sendEvent('error', { message: 'No search results found' });
      res.end();
      return;
    }

    // Send sources immediately
    const sources = searchResults.map((result, index) => ({
      number: index + 1,
      title: result.title,
      url: result.url,
      snippet: result.text?.substring(0, 150) + '...'
    }));

    sendEvent('sources', {
      sources,
      sourceCount: sources.length,
      searchDuration: `${searchDuration}ms`
    });

    sendEvent('status', { message: 'Generating answer...', step: 3 });

    // Step 2: Stream the answer from Groq
    const llmStartTime = Date.now();
    let fullAnswer = '';

    await generateAnswerStream(
      searchQuery,
      searchResults,
      (chunk) => {
        fullAnswer += chunk;
        sendEvent('chunk', { text: chunk });
      },
      (step, message, data) => {
        console.log(`[${step}] ${message}`, data || '');
      }
    );

    const llmDuration = Date.now() - llmStartTime;
    const totalDuration = Date.now() - startTime;

    // Save message to conversation history
    const messageData = {
      id: messageId,
      role: 'user',
      query: query,
      rewrittenQuery: searchQuery !== query ? searchQuery : null,
      answer: fullAnswer,
      sources: sources
    };

    if (dbConnected) {
      try {
        await db.addMessage(conversationId, messageData);
      } catch (e) {
        console.error('Failed to save message:', e.message);
      }
    } else {
      memoryStore.addMessage(conversationId, messageData);
    }

    // Send completion event
    sendEvent('done', {
      messageId,
      totalDuration: `${totalDuration}ms`,
      searchDuration: `${searchDuration}ms`,
      llmDuration: `${llmDuration}ms`
    });

    res.end();

  } catch (error) {
    console.error('Error in streaming search:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }
});

// ============================================
// Legacy Endpoints (kept for compatibility)
// ============================================

/**
 * Simple streaming search (no conversation context)
 */
app.get('/api/search/stream', async (req, res) => {
  const startTime = Date.now();
  const query = req.query.q;
  const numResults = parseInt(req.query.numResults) || 5;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('status', { message: 'Searching the web...', step: 1 });

    const searchStartTime = Date.now();
    const searchResults = await searchWeb(query, numResults);
    const searchDuration = Date.now() - searchStartTime;

    if (!searchResults || searchResults.length === 0) {
      sendEvent('error', { message: 'No search results found' });
      res.end();
      return;
    }

    const sources = searchResults.map((result, index) => ({
      number: index + 1,
      title: result.title,
      url: result.url,
      snippet: result.text?.substring(0, 150) + '...'
    }));

    sendEvent('sources', {
      sources,
      sourceCount: sources.length,
      searchDuration: `${searchDuration}ms`
    });

    sendEvent('status', { message: 'Generating answer...', step: 2 });

    const llmStartTime = Date.now();

    await generateAnswerStream(
      query,
      searchResults,
      (chunk) => {
        sendEvent('chunk', { text: chunk });
      },
      (step, message, data) => {
        console.log(`[${step}] ${message}`, data || '');
      }
    );

    const llmDuration = Date.now() - llmStartTime;
    const totalDuration = Date.now() - startTime;

    sendEvent('done', {
      totalDuration: `${totalDuration}ms`,
      searchDuration: `${searchDuration}ms`,
      llmDuration: `${llmDuration}ms`
    });

    res.end();

  } catch (error) {
    console.error('Error in streaming search:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }
});

/**
 * Non-streaming search endpoint
 */
app.post('/api/search', async (req, res) => {
  const startTime = Date.now();

  try {
    const { query, numResults = 5 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const searchResults = await searchWeb(query, numResults);

    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ error: 'No search results found' });
    }

    const answer = await generateAnswer(query, searchResults);
    const formattedResponse = formatResponse(answer, searchResults);

    res.json({
      ...formattedResponse,
      duration: `${Date.now() - startTime}ms`
    });

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

// Handle conversation routes on frontend (SPA-style)
app.get('/c/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database: ${dbConnected ? 'connected' : 'not configured'}`);
});
