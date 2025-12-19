/**
 * Groq LLM Component
 * Handles AI responses using Groq API
 */

const config = require('../config');

/**
 * Generate an answer using Groq LLM based on search results
 * @param {string} query - The user's original query
 * @param {Array} searchResults - Array of search results from Exa.ai
 * @returns {Promise<string>} The AI-generated answer
 */
async function generateAnswer(query, searchResults) {
  try {
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';

    return answer;
  } catch (error) {
    console.error('Error generating answer with Groq:', error);
    throw error;
  }
}

module.exports = {
  generateAnswer
};

