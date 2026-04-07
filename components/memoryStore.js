/**
 * In-Memory Store
 * Fallback storage when PostgreSQL is not configured.
 * Mirrors the database module API so the server can swap transparently.
 */

const conversations = new Map();

function createConversation(id) {
  const conv = { id, messages: [], created_at: new Date().toISOString() };
  conversations.set(id, conv);
  return conv;
}

function getConversation(id) {
  return conversations.get(id) || null;
}

function addMessage(conversationId, message) {
  const conv = conversations.get(conversationId);
  if (conv) {
    conv.messages.push(message);
    conv.title = conv.title || message.query?.substring(0, 100);
  }
}

function getHistory(conversationId, limit = 10) {
  const conv = conversations.get(conversationId);
  if (!conv) return [];
  return conv.messages.slice(-limit).map(m => ({
    role: 'user',
    query: m.query,
    answer: m.answer
  }));
}

function getRecent(limit = 20) {
  return Array.from(conversations.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map(c => ({
      id: c.id,
      title: c.title,
      first_query: c.messages[0]?.query,
      created_at: c.created_at
    }));
}

function deleteConversation(id) {
  conversations.delete(id);
}

function deleteAll() {
  conversations.clear();
}

module.exports = {
  createConversation,
  getConversation,
  addMessage,
  getHistory,
  getRecent,
  deleteConversation,
  deleteAll
};
