/**
 * Exa.ai Search Component
 * Handles web search using Exa.ai API
 */

const config = require('../config');

/**
 * Search the web using Exa.ai
 * @param {string} query - The search query
 * @param {number} numResults - Number of results to return (default: 5)
 * @returns {Promise<Array>} Array of search results with content
 */
async function searchWeb(query, numResults = 5) {
  try {
    const response = await fetch(`${config.exa.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.exa.apiKey
      },
      body: JSON.stringify({
        query: query,
        num_results: numResults,
        contents: {
          text: {
            max_characters: 1000 // Limit text content per result
          }
        },
        use_autoprompt: true // Let Exa improve the query
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Exa.ai API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Format results for easier use
    const formattedResults = data.results.map(result => ({
      title: result.title,
      url: result.url,
      text: result.text?.substring(0, 1000) || result.text || '',
      publishedDate: result.published_date,
      author: result.author
    }));

    return formattedResults;
  } catch (error) {
    console.error('Error searching with Exa.ai:', error);
    throw error;
  }
}

module.exports = {
  searchWeb
};

