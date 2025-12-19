/**
 * Response Formatter Component
 * Formats the final response with sources and answer
 */

/**
 * Format the response for the frontend
 * @param {string} answer - The AI-generated answer
 * @param {Array} sources - Array of search result sources
 * @returns {Object} Formatted response object
 */
function formatResponse(answer, sources) {
  // Extract source citations from the answer
  const sourceCitations = extractSourceCitations(answer);
  
  // Format sources with numbering
  const formattedSources = sources.map((source, index) => ({
    number: index + 1,
    title: source.title,
    url: source.url,
    snippet: source.text.substring(0, 200) + '...' // Preview snippet
  }));

  return {
    answer: answer,
    sources: formattedSources,
    sourceCount: sources.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Extract source citations from the answer text
 * @param {string} answer - The answer text
 * @returns {Array} Array of source numbers mentioned in the answer
 */
function extractSourceCitations(answer) {
  const citationRegex = /\[Source (\d+)\]/g;
  const citations = [];
  let match;
  
  while ((match = citationRegex.exec(answer)) !== null) {
    citations.push(parseInt(match[1]));
  }
  
  return [...new Set(citations)]; // Remove duplicates
}

module.exports = {
  formatResponse,
  extractSourceCitations
};


