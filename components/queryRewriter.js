/**
 * Query Rewriter Component
 * Uses Groq to expand ambiguous follow-up queries using conversation context
 */

const config = require('../config');

/**
 * Rewrite a follow-up query using conversation history
 * @param {string} query - The user's current query (potentially ambiguous)
 * @param {Array} history - Previous messages in the conversation
 * @returns {Promise<string>} The rewritten, standalone query
 */
async function rewriteQuery(query, history = []) {
  // If no history, return original query
  if (!history || history.length === 0) {
    return query;
  }

  // Build conversation context
  const contextMessages = history.slice(-6).map(msg => {
    if (msg.role === 'user') {
      return `User: ${msg.query}`;
    } else {
      // Truncate assistant answers to save tokens
      const shortAnswer = msg.answer?.substring(0, 200) || '';
      return `Assistant: ${shortAnswer}...`;
    }
  }).join('\n');

  const systemPrompt = `You are a query rewriter. Your job is to take a follow-up question that may contain pronouns or references to previous context, and rewrite it as a standalone search query.

Rules:
1. Replace pronouns (he, she, it, they, etc.) with the actual entity from context
2. Include relevant context (dates, names, topics) to make the query self-contained
3. Keep the query concise and search-friendly
4. If the query is already standalone, return it unchanged
5. Return ONLY the rewritten query, nothing else

Examples:
- Context: Discussion about Elon Musk buying Twitter
  Input: "How much did he pay?"
  Output: "How much did Elon Musk pay for Twitter"

- Context: Discussion about Python programming
  Input: "What are the best libraries for it?"
  Output: "What are the best Python programming libraries"

- Context: Discussion about climate change effects
  Input: "What can we do about it?"
  Output: "What can we do about climate change"`;

  const userPrompt = `Conversation context:
${contextMessages}

Current user query: "${query}"

Rewrite this as a standalone search query:`;

  try {
    const response = await fetch(`${config.groq.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.groq.apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Use faster model for query rewriting
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1, // Low temperature for consistent rewrites
        max_tokens: 150
      })
    });

    if (!response.ok) {
      console.error('Query rewrite failed, using original query');
      return query;
    }

    const data = await response.json();
    const rewrittenQuery = data.choices[0]?.message?.content?.trim() || query;

    // Clean up the response (remove quotes if present)
    const cleaned = rewrittenQuery.replace(/^["']|["']$/g, '').trim();

    console.log(`[REWRITE] "${query}" → "${cleaned}"`);

    return cleaned;
  } catch (error) {
    console.error('Error rewriting query:', error);
    return query; // Fall back to original query
  }
}

/**
 * Check if a query likely needs rewriting (contains pronouns/references)
 */
function needsRewriting(query) {
  const pronounPatterns = /\b(he|she|it|they|them|his|her|its|their|this|that|these|those|the same|more about|tell me more|what about|how about)\b/i;
  return pronounPatterns.test(query);
}

module.exports = {
  rewriteQuery,
  needsRewriting
};
