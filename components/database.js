/**
 * Database Module
 * Handles PostgreSQL connection and queries for conversation persistence
 */

const { Pool } = require('pg');
const config = require('../config');

// Create connection pool
const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

/**
 * Initialize database schema
 */
async function initializeSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY,
        title VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        query TEXT,
        rewritten_query TEXT,
        answer TEXT,
        sources JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
    `);
    console.log('Database schema initialized');
  } finally {
    client.release();
  }
}

/**
 * Create a new conversation
 */
async function createConversation(id, title = null) {
  const result = await pool.query(
    'INSERT INTO conversations (id, title) VALUES ($1, $2) RETURNING *',
    [id, title]
  );
  return result.rows[0];
}

/**
 * Get a conversation by ID with all messages
 */
async function getConversation(id) {
  const convResult = await pool.query(
    'SELECT * FROM conversations WHERE id = $1',
    [id]
  );

  if (convResult.rows.length === 0) {
    return null;
  }

  const messagesResult = await pool.query(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [id]
  );

  return {
    ...convResult.rows[0],
    messages: messagesResult.rows
  };
}

/**
 * Get recent conversations (for sidebar)
 */
async function getRecentConversations(limit = 20) {
  const result = await pool.query(
    `SELECT c.*,
            (SELECT query FROM messages WHERE conversation_id = c.id ORDER BY created_at ASC LIMIT 1) as first_query
     FROM conversations c
     ORDER BY c.updated_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Add a message to a conversation
 */
async function addMessage(conversationId, message) {
  const { id, role, query, rewrittenQuery, answer, sources } = message;

  const result = await pool.query(
    `INSERT INTO messages (id, conversation_id, role, query, rewritten_query, answer, sources)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, conversationId, role, query, rewrittenQuery, answer, JSON.stringify(sources)]
  );

  // Update conversation's updated_at and title if first message
  await pool.query(
    `UPDATE conversations
     SET updated_at = NOW(),
         title = COALESCE(title, $2)
     WHERE id = $1`,
    [conversationId, query?.substring(0, 100)]
  );

  return result.rows[0];
}

/**
 * Get conversation history for context (last N messages)
 */
async function getConversationHistory(conversationId, limit = 10) {
  const result = await pool.query(
    `SELECT role, query, answer FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [conversationId, limit]
  );
  return result.rows.reverse(); // Return in chronological order
}

/**
 * Delete a conversation
 */
async function deleteConversation(id) {
  await pool.query('DELETE FROM conversations WHERE id = $1', [id]);
}

/**
 * Delete all conversations
 */
async function deleteAllConversations() {
  await pool.query('TRUNCATE conversations CASCADE');
}

/**
 * Check if database is connected
 */
async function isConnected() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Close database connection
 */
async function close() {
  await pool.end();
}

module.exports = {
  pool,
  initializeSchema,
  createConversation,
  getConversation,
  getRecentConversations,
  addMessage,
  getConversationHistory,
  deleteConversation,
  deleteAllConversations,
  isConnected,
  close
};
