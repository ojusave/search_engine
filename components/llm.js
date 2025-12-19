/**
 * Groq LLM Component
 * Handles AI responses using Groq API
 */

const config = require('../config');

/**
 * Generate an answer using Groq LLM based on search results
 * @param {string} query - The user's original query
 * @param {Array} searchResults - Array of search results from Exa.ai
 * @param {Function} logCallback - Optional callback function for logging (step, message, data)
 * @returns {Promise<string>} The AI-generated answer
 */
async function generateAnswer(query, searchResults, logCallback = null) {
  try {
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

    // Format search results into context
    const context = searchResults.map((result, index) => {
      return `[Source ${index + 1}]
Title: ${result.title}
URL: ${result.url}
Content: ${result.text}
---`;
    }).join('\n\n');

    // Create the prompt
    const systemPrompt = `You are a helpful AI assistant that provides accurate, well-sourced answers based on the provided search results. 
Cite your sources using [Source X] format when referencing information from the search results.
Be concise but comprehensive. If the search results don't fully answer the question, say so.`;

    const userPrompt = `Question: ${query}

Search Results:
${context}

Please provide a comprehensive answer to the question based on the search results above. Cite your sources using [Source X] format.`;

    log('GROQ', 'Sending request to Groq API...', {
      model: config.groq.model,
      baseUrl: config.groq.baseUrl,
      promptLength: userPrompt.length,
      systemPromptLength: systemPrompt.length,
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
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
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
        statusText: response.statusText,
        error: errorData.error?.message || 'Unknown error',
        duration: `${requestDuration}ms`
      });
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';

    log('GROQ', 'Received response from Groq API', {
      model: data.model || config.groq.model,
      answerLength: answer.length,
      tokensUsed: data.usage?.total_tokens || 'unknown',
      promptTokens: data.usage?.prompt_tokens || 'unknown',
      completionTokens: data.usage?.completion_tokens || 'unknown',
      finishReason: data.choices[0]?.finish_reason || 'unknown',
      requestDuration: `${requestDuration}ms`,
      tokensPerSecond: data.usage?.total_tokens ? Math.round(data.usage.total_tokens / (requestDuration / 1000)) : 'unknown'
    });

    return answer;
  } catch (error) {
    console.error('Error generating answer with Groq:', error);
    throw error;
  }
}

module.exports = {
  generateAnswer
};

