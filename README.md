# AI Search Assistant

A simple, easy-to-follow AI search assistant built with Groq and Exa.ai APIs. This project demonstrates how to combine web search with AI to create an intelligent search assistant.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ojusave/search_engine)

## Features

- **Web Search**: Uses Exa.ai to search the web for relevant sources
- **AI-Powered Answers**: Uses Groq LLM to synthesize answers from search results
- **Source Citations**: Displays sources with clickable links
- **Clean UI**: Modern, responsive design
- **Component-Based**: Easy to understand and modify

## Project Structure

```
searchagent-with-groq-and-exa/
├── server.js                 # Main Express server
├── config.js                 # Configuration & API setup
├── components/
│   ├── search.js            # Exa.ai API handler
│   ├── llm.js               # Groq API handler
│   └── responseFormatter.js # Format final response
├── public/
│   ├── index.html           # Frontend UI
│   ├── style.css            # Styling
│   └── app.js               # Frontend JavaScript
├── package.json             # Dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get API Keys

1. **Groq API Key**: 
   - Sign up at [https://console.groq.com/](https://console.groq.com/)
   - Create an API key from the dashboard

2. **Exa.ai API Key**:
   - Sign up at [https://dashboard.exa.ai/](https://dashboard.exa.ai/)
   - Get your API key from the dashboard

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```
GROQ_API_KEY=your_groq_api_key_here
EXA_API_KEY=your_exa_api_key_here
PORT=3000
```

### 4. Run the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## Deployment on Render

### Option 1: Using Render Dashboard

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: ai-search-assistant (or your choice)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add environment variables:
   - `GROQ_API_KEY`: Your Groq API key
   - `EXA_API_KEY`: Your Exa.ai API key
7. Deploy!

### Option 2: Using render.yaml (Recommended)

Create a `render.yaml` file in your project root:

```yaml
services:
  - type: web
    name: ai-search-assistant
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: GROQ_API_KEY
        sync: false
      - key: EXA_API_KEY
        sync: false
```

Then deploy from Render dashboard by selecting the repository with `render.yaml`.

## How It Works

1. **User Query**: User enters a search query in the frontend
2. **Web Search**: Backend sends query to Exa.ai to get relevant web results
3. **AI Synthesis**: Backend sends query + search results to Groq to generate an answer
4. **Response**: Formatted answer with sources is returned to the frontend
5. **Display**: Frontend displays the answer with clickable source links

## Customization

### Change Groq Model

Edit `config.js`:

```javascript
model: 'llama-3.3-70b-versatile' // Change to other Groq models
```

Available models (check [Groq Console](https://console.groq.com/docs/models) for latest):
- `llama-3.3-70b-versatile` (default - recommended)
- `llama-3.1-8b-instant` (faster, smaller)
- `mixtral-8x7b-32768`
- `gemma-7b-it`
- `llama-3.1-70b-versatile` (deprecated - use llama-3.3-70b-versatile instead)

### Adjust Search Results

In `public/app.js`, change the `numResults` parameter:

```javascript
numResults: 5  // Change to get more/fewer results
```

### Modify Prompt

Edit the system prompt in `components/llm.js` to change how the AI responds.

## Troubleshooting

### API Key Errors

- Make sure your `.env` file exists and contains valid API keys
- Check that API keys are correctly set in Render environment variables

### CORS Issues

- The server includes CORS middleware, so this should work out of the box
- If issues persist, check the `cors` configuration in `server.js`

### No Search Results

- Verify your Exa.ai API key is valid
- Check your Exa.ai account has available credits
- Try a different search query

## License

MIT

## Credits

- [Groq](https://groq.com/) - Fast LLM inference
- [Exa.ai](https://exa.ai/) - Web search API
- [Render](https://render.com/) - Cloud hosting platform


