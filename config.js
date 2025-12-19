/**
 * Configuration file for API keys and settings
 * Make sure to set these in your .env file
 */

require('dotenv').config();

const config = {
  // Groq API Configuration
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile' // Updated to current model (replaces decommissioned llama-3.1-70b-versatile)
  },
  
  // Exa.ai API Configuration
  exa: {
    apiKey: process.env.EXA_API_KEY,
    baseUrl: 'https://api.exa.ai'
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3000
  }
};

// Validate required API keys
if (!config.groq.apiKey) {
  console.warn('Warning: GROQ_API_KEY not set in environment variables');
}

if (!config.exa.apiKey) {
  console.warn('Warning: EXA_API_KEY not set in environment variables');
}

module.exports = config;


