/**
 * Groq LLM Component
 * Handles AI responses using Groq API with streaming support
 */

const config = require('../config');

/**
 * Build the prompt for the LLM
 * @param {string} query - The user's query
 * @param {Array} searchResults - Search results from Exa.ai
 * @returns {Object} System and user prompts
 */
function buildPrompt(query, searchResults) {
  // Format search results into context (truncate each to ~500 chars for speed)
  const context = searchResults.map((result, index) => {
    const truncatedText = result.text?.substring(0, 500) || '';
    return `[Source ${index + 1}]
Title: ${result.title}
URL: ${result.url}
Content: ${truncatedText}${result.text?.length > 500 ? '...' : ''}
---`;
  }).join('\n\n');

  const systemPrompt = `You are a helpful AI assistant that provides accurate, well-sourced answers based on the provided search results.
Cite your sources using [Source X] format when referencing information from the search results.
Be concise but comprehensive. If the search results don't fully answer the question, say so.`;

  const userPrompt = `Question: ${query}

Search Results:
${context}

Please provide a comprehensive answer to the question based on the search results above. Cite your sources using [Source X] format.`;

  return { systemPrompt, userPrompt };
}

/**
 * Generate an answer using Groq LLM with streaming
 * @param {string} query - The user's original query
 * @param {Array} searchResults - Array of search results from Exa.ai
 * @param {Function} onChunk - Callback for each text chunk (chunk) => void
 * @param {Function} logCallback - Optional callback function for logging
 * @returns {Promise<string>} The complete AI-generated answer
 */
async function generateAnswerStream(query, searchResults, onChunk, logCallback = null) {
  const log = (step, message, data = null) => {
    if (logCallback) {
      logCallback(step, message, data);
    }
    console.log(`[${step}] ${message}`, data || '');
  };

  log('GROQ', 'Preparing context from search results...', {
    sourceCount: searchResults.length,
    totalContextLength: searchResults.reduce((sum, r) => sum + (r.text?.length || 0), 0)
  });

  const { systemPrompt, userPrompt } = buildPrompt(query, searchResults);

  log('GROQ', 'Starting streaming request to Groq API...', {
    model: config.groq.model,
    streaming: true,
    promptLength: userPrompt.length
  });

  const requestStartTime = Date.now();

  const response = await fetch(`${config.groq.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.groq.apiKey}`
    },
    body: JSON.stringify({
      model: config.groq.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    log('GROQ_ERROR', 'Groq API request failed', {
      status: response.status,
      error: errorData.error?.message || 'Unknown error'
    });
    throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  // Process the stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullAnswer = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

        if (trimmedLine.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmedLine.slice(6));
            const content = json.choices?.[0]?.delta?.content;

            if (content) {
              fullAnswer += content;
              onChunk(content);
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const requestDuration = Date.now() - requestStartTime;

  log('GROQ', 'Streaming complete', {
    answerLength: fullAnswer.length,
    requestDuration: `${requestDuration}ms`,
    estimatedTokens: Math.ceil(fullAnswer.length / 4)
  });

  return fullAnswer;
}

/**
 * Generate an answer using Groq LLM (non-streaming, kept for compatibility)
 * @param {string} query - The user's original query
 * @param {Array} searchResults - Array of search results from Exa.ai
 * @param {Function} logCallback - Optional callback function for logging
 * @returns {Promise<string>} The AI-generated answer
 */
async function generateAnswer(query, searchResults, logCallback = null) {
  const log = (step, message, data = null) => {
    if (logCallback) {
      logCallback(step, message, data);
    }
    console.log(`[${step}] ${message}`, data || '');
  };

  log('GROQ', 'Preparing context from search results...', {
    sourceCount: searchResults.length,
    totalContextLength: searchResults.reduce((sum, r) => sum + (r.text?.length || 0), 0)
  });

  const { systemPrompt, userPrompt } = buildPrompt(query, searchResults);

  log('GROQ', 'Sending request to Groq API...', {
    model: config.groq.model,
    promptLength: userPrompt.length,
    temperature: 0.7,
    maxTokens: 2000
  });

  const requestStartTime = Date.now();
  const response = await fetch(`${config.groq.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.groq.apiKey}`
    },
    body: JSON.stringify({
      model: config.groq.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  const requestDuration = Date.now() - requestStartTime;

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    log('GROQ_ERROR', 'Groq API request failed', {
      status: response.status,
      error: errorData.error?.message || 'Unknown error',
      duration: `${requestDuration}ms`
    });
    throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const answer = data.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';

  log('GROQ', 'Received response from Groq API', {
    answerLength: answer.length,
    tokensUsed: data.usage?.total_tokens || 'unknown',
    requestDuration: `${requestDuration}ms`,
    tokensPerSecond: data.usage?.total_tokens ? Math.round(data.usage.total_tokens / (requestDuration / 1000)) : 'unknown'
  });

  return answer;
}

module.exports = {
  generateAnswer,
  generateAnswerStream
};
