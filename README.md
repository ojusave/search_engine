# AI Search Assistant

A [Perplexity](https://perplexity.ai/)-style AI search assistant built with [Groq](https://groq.com/) and [Exa.ai](https://exa.ai/) APIs. Features conversational search with context memory, real-time streaming responses, and a modern dark/light theme UI.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ojusave/search_engine)

## Features

- **Conversational Search**: Ask follow-up questions that understand context (e.g., "What is Tesla?" → "Who founded it?")
- **Real-time Streaming**: Answers appear word-by-word using [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- **Smart Query Rewriting**: Automatically expands ambiguous queries using conversation history
- **Web Search**: Uses [Exa.ai](https://exa.ai/) neural search to find relevant sources
- **AI-Powered Answers**: Uses [Groq](https://groq.com/) LLM for ultra-fast answer synthesis
- **Source Citations**: Inline citations with clickable source cards
- **Conversation History**: [PostgreSQL](https://www.postgresql.org/) persistence or in-memory storage
- **Modern UI**: [Render](https://render.com/)-inspired design with dark/light theme toggle
- **Sidebar Navigation**: Browse and manage past conversations

## Architecture Overview

```mermaid
graph TB
    subgraph Client["🌐 Browser"]
        UI[Frontend UI]
        ES[EventSource API]
    end

    subgraph Server["⚙️ Express Server"]
        API[REST API]
        SSE[SSE Stream Handler]
        QR[Query Rewriter]
    end

    subgraph External["☁️ External Services"]
        GROQ[Groq API<br/>LLM Inference]
        EXA[Exa.ai API<br/>Neural Search]
    end

    subgraph Storage["💾 Storage"]
        PG[(Render Postgres)]
        MEM[(In-Memory Store)]
    end

    UI -->|HTTP Request| API
    ES <-->|SSE Stream| SSE
    API --> QR
    QR -->|Rewrite Query| GROQ
    SSE -->|Search| EXA
    SSE -->|Generate Answer| GROQ
    API --> PG
    API -.->|Fallback| MEM

    style GROQ fill:#f9f,stroke:#333
    style EXA fill:#9ff,stroke:#333
    style PG fill:#ff9,stroke:#333
```

## Project Structure

| File | Description |
|------|-------------|
| [`server.js`](server.js) | Main [Express](https://expressjs.com/) server with conversation APIs |
| [`config.js`](config.js) | Configuration & API setup |
| [`components/search.js`](components/search.js) | [Exa.ai](https://exa.ai/) API handler |
| [`components/llm.js`](components/llm.js) | [Groq](https://groq.com/) API handler (streaming + non-streaming) |
| [`components/database.js`](components/database.js) | [PostgreSQL](https://www.postgresql.org/) connection & queries |
| [`components/queryRewriter.js`](components/queryRewriter.js) | Context-aware query expansion |
| [`components/responseFormatter.js`](components/responseFormatter.js) | Format final response |
| [`public/index.html`](public/index.html) | Frontend UI with sidebar layout |
| [`public/style.css`](public/style.css) | Render-style CSS with themes |
| [`public/app.js`](public/app.js) | Frontend JavaScript with [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) streaming |
| [`render.yaml`](render.yaml) | [Render Blueprint](https://render.com/docs/blueprint-spec) deployment config |
| [`package.json`](package.json) | Dependencies |
| [`.env.example`](.env.example) | Environment variables template |

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
DATABASE_URL=postgresql://localhost:5432/search_assistant  # Optional
PORT=3000
```

> **Note**: `DATABASE_URL` is optional. Without it, the app uses in-memory storage (conversations are lost on restart).

### 4. Run the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## How to Use

### Basic Search
1. Open `http://localhost:3000` in your browser
2. Type a question in the search bar (e.g., "What is quantum computing?")
3. Press Enter or click the search button
4. Watch as sources appear, then the answer streams in word-by-word

### Conversational Follow-ups
The app maintains context within a conversation, so you can ask follow-up questions:

1. **First query**: "What is SpaceX?"
2. **Follow-up**: "Who founded it?" → The app understands "it" refers to SpaceX
3. **Another follow-up**: "What rockets do they make?" → Still knows the context

Behind the scenes, the app rewrites ambiguous queries. For example:
- "Who founded it?" becomes "Who founded SpaceX?"
- "What's their stock price?" becomes "What is SpaceX stock price?"

### Managing Conversations
- **New conversation**: Click the "+" button in the sidebar
- **View history**: Past conversations appear in the sidebar
- **Switch conversations**: Click any conversation to load it
- **Delete**: Hover over a conversation and click the trash icon

### Theme Toggle
Click the sun/moon icon in the header to switch between light and dark themes.

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

The project includes a `render.yaml` blueprint that sets up both the web service and PostgreSQL database:

```yaml
databases:
  - name: search-assistant-db
    plan: free
    databaseName: search_assistant
    user: search_user

services:
  - type: web
    name: ai-search-assistant
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: GROQ_API_KEY
        sync: false
      - key: EXA_API_KEY
        sync: false
      - key: DATABASE_URL
        fromDatabase:
          name: search-assistant-db
          property: connectionString
```

Deploy from Render dashboard by selecting the repository with `render.yaml`. The database will be automatically provisioned and connected.

## Render Postgres

This app uses [Render Postgres](https://render.com/docs/postgresql-refresh) to persist conversation history across sessions.

### Why Render Postgres?

- **Zero configuration**: Automatically provisioned via [`render.yaml`](render.yaml)
- **Managed service**: [Automated backups](https://render.com/docs/databases#backups), monitoring, and maintenance
- **Direct integration**: `DATABASE_URL` is [injected automatically](https://render.com/docs/configure-environment-variables#linking-services)
- **SSL by default**: Secure connections in production

### Free Tier

[Render offers a free PostgreSQL tier](https://render.com/pricing):
- **Storage**: 1 GB SSD
- **Expiration**: Free databases expire after 30 days (with 14-day grace period)
- **No credit card required**

> **Note**: For production use, [upgrade to a paid plan](https://render.com/pricing) to avoid expiration. Plans start at $7/month for persistent databases.

### Database Schema

The app automatically creates these tables on startup:

```mermaid
erDiagram
    CONVERSATIONS ||--o{ MESSAGES : contains
    CONVERSATIONS {
        uuid id PK
        varchar title
        timestamp created_at
        timestamp updated_at
    }
    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        varchar role
        text query
        text rewritten_query
        text answer
        jsonb sources
        timestamp created_at
    }
```

<details>
<summary>View SQL Schema</summary>

```sql
-- Stores conversation metadata
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores individual messages (queries and answers)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  query TEXT,
  rewritten_query TEXT,  -- Stores expanded query if rewriting occurred
  answer TEXT,
  sources JSONB,         -- Stores source URLs and snippets
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

</details>

### Local Development with PostgreSQL

To use [PostgreSQL](https://www.postgresql.org/) locally:

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS (using Homebrew - https://brew.sh/)
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt install postgresql
   sudo systemctl start postgresql
   ```

2. **Create a database**:
   ```bash
   createdb search_assistant
   ```

3. **Set the connection string** in [`.env`](.env.example):
   ```
   DATABASE_URL=postgresql://localhost:5432/search_assistant
   ```

4. **Run the app** - tables are created automatically:
   ```bash
   npm start
   ```

> **Tip**: Use [pgAdmin](https://www.pgadmin.org/) or [TablePlus](https://tableplus.com/) to browse your database visually.

### Without a Database

The app works without PostgreSQL using in-memory storage:
- Conversations are stored in a JavaScript `Map`
- Data is lost when the server restarts
- Useful for local development and testing

Simply don't set `DATABASE_URL` and the app will use in-memory storage automatically.

## Tech Stack & Architecture

This project combines cutting-edge AI and search technologies to deliver fast, accurate, and well-sourced answers:

### Why This Stack is Powerful

**[Groq](https://groq.com/)** - Ultra-fast LLM inference
- **Value**: Provides near-instant AI responses (often <1 second) compared to traditional LLM APIs
- **Why it matters**: Real-time user experience without waiting for slow AI generation
- **Technology**: Optimized inference engine with hardware acceleration

**[Exa.ai](https://exa.ai/)** - Neural search API
- **Value**: Semantic understanding of queries, not just keyword matching
- **Why it matters**: Returns more relevant, contextually appropriate results
- **Technology**: Neural embeddings and semantic search algorithms

**[Render](https://render.com/)** - Cloud hosting platform
- **Value**: Zero-config deployment, automatic scaling, and global CDN
- **Why it matters**: Production-ready infrastructure without DevOps overhead

**[Render Postgres](https://render.com/docs/postgresql-refresh)** - Managed PostgreSQL database
- **Value**: Automatic provisioning, backups, and SSL connections
- **Why it matters**: Persistent conversation history without database administration
- **Technology**: PostgreSQL with connection pooling and automatic schema migration

### Request Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    participant U as 🧑 User
    participant F as 🌐 Frontend
    participant S as ⚙️ Server
    participant DB as 💾 Database
    participant G as 🤖 Groq API
    participant E as 🔍 Exa.ai

    U->>F: Enter search query
    F->>S: GET /api/conversations/:id/search/stream

    S->>DB: Load conversation history
    DB-->>S: Previous Q&A pairs

    alt Query needs rewriting
        S->>G: Rewrite ambiguous query
        G-->>S: "Who founded it?" → "Who founded Tesla?"
    end

    S->>E: Neural web search
    E-->>S: Search results with content
    S-->>F: SSE: sources event

    S->>G: Generate answer (streaming)
    loop Stream chunks
        G-->>S: Answer chunk
        S-->>F: SSE: chunk event
    end

    S->>DB: Save message to history
    S-->>F: SSE: done event
    F->>U: Display complete answer
```

### Key Advantages

1. **Speed**: [Groq's](https://groq.com/) optimized inference + streaming means answers appear word-by-word in real-time
2. **Context**: Conversation memory enables natural follow-up questions
3. **Relevance**: [Exa.ai's](https://exa.ai/) neural search finds semantically relevant content, not just keyword matches
4. **Accuracy**: AI synthesizes information from multiple sources with proper citations
5. **Transparency**: Every claim is linked back to its source
6. **Persistence**: [PostgreSQL](https://www.postgresql.org/) stores conversations across sessions (optional)
7. **Scalability**: [Render](https://render.com/) handles traffic spikes automatically

## How It Works

1. **User Query**: User enters a search query in the frontend
2. **Context Check**: Server loads conversation history and checks if query needs rewriting
3. **Query Rewriting**: If the query is ambiguous (contains pronouns like "it", "they", "he"), [Groq](https://groq.com/) rewrites it using context
4. **Web Search**: Expanded query is sent to [Exa.ai](https://exa.ai/) for neural web search
5. **Streaming Response**: [Groq](https://groq.com/) generates the answer, streaming chunks via [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
6. **Save to History**: The Q&A pair is saved to the conversation for future context
7. **Display**: Frontend displays sources and streams the answer in real-time

### Query Rewriting Example

```mermaid
flowchart LR
    subgraph Context["📝 Conversation History"]
        Q1["Q: What is Tesla?"]
        A1["A: Tesla is an electric vehicle company..."]
    end

    subgraph Rewrite["🔄 Query Rewriter"]
        Input["Who founded it?"]
        Check{Contains<br/>pronoun?}
        LLM["Groq LLM<br/>(llama-3.1-8b)"]
        Output["Who founded Tesla?"]
    end

    subgraph Search["🔍 Web Search"]
        EXA["Exa.ai"]
    end

    Context --> Check
    Input --> Check
    Check -->|Yes| LLM
    Check -->|No| EXA
    LLM --> Output
    Output --> EXA

    style LLM fill:#f9f,stroke:#333
    style EXA fill:#9ff,stroke:#333
```

## Customization

### Change Groq Model

Edit [`config.js`](config.js):

```javascript
model: 'llama-3.3-70b-versatile' // Change to other Groq models
```

Available production models (see [Groq Models Documentation](https://console.groq.com/docs/models) for complete list):

**Production Models:**
- [`llama-3.3-70b-versatile`](https://console.groq.com/docs/models#llama-33-70b-versatile) (default - 280 t/s, best quality for complex tasks)
- [`llama-3.1-8b-instant`](https://console.groq.com/docs/models#llama-31-8b-instant) (560 t/s, faster and more cost-effective for simpler queries)
- `openai/gpt-oss-120b` (500 t/s, OpenAI's open-weight model with 120B parameters)
- `openai/gpt-oss-20b` (1000 t/s, faster OpenAI open-weight model)

**Preview Models:**
- `meta-llama/llama-4-maverick-17b-128e-instruct` (600 t/s)
- `meta-llama/llama-4-scout-17b-16e-instruct` (750 t/s)
- [`qwen/qwen3-32b`](https://console.groq.com/docs/models#qwen-32b) (400 t/s)

For the latest models and pricing, visit the [Groq Models Documentation](https://console.groq.com/docs/models).

### Adjust Search Results

In [`public/app.js`](public/app.js), change the `numResults` parameter:

```javascript
numResults: 5  // Change to get more/fewer results
```

See the [Exa.ai Search API docs](https://docs.exa.ai/reference/search) for more search options.

### Modify Prompt

Edit the system prompt in [`components/llm.js`](components/llm.js) to change how the AI responds. The prompt controls:
- Answer format and length
- Citation style
- Tone and personality

## API Reference

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations` | List recent conversations |
| `GET` | `/api/conversations/:id` | Get conversation with messages |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/conversations/:id/search/stream` | Streaming search with context (SSE) |
| `GET` | `/api/search/stream` | Simple streaming search (no context) |
| `POST` | `/api/search` | Non-streaming search |

### Streaming Events (SSE)

The streaming endpoints use [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) to push real-time updates:

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: GET /search/stream?q=...

    S-->>C: event: status<br/>data: {"message": "Searching..."}
    S-->>C: event: sources<br/>data: {"sources": [...]}
    S-->>C: event: status<br/>data: {"message": "Generating..."}

    loop Answer chunks
        S-->>C: event: chunk<br/>data: {"text": "The"}
        S-->>C: event: chunk<br/>data: {"text": " answer"}
        S-->>C: event: chunk<br/>data: {"text": " is..."}
    end

    S-->>C: event: done<br/>data: {"totalDuration": "1234ms"}
```

| Event | Data | Description |
|-------|------|-------------|
| `status` | `{ message, step }` | Progress updates |
| `rewrite` | `{ original, rewritten }` | Query was rewritten for context |
| `sources` | `{ sources, sourceCount }` | Search results found |
| `chunk` | `{ text }` | Answer text chunk |
| `done` | `{ messageId, totalDuration }` | Stream complete |
| `error` | `{ message }` | Error occurred |

## Troubleshooting

### API Key Errors

- Make sure your [`.env`](.env.example) file exists and contains valid API keys
- Get your Groq API key from [console.groq.com](https://console.groq.com/)
- Get your Exa.ai API key from [dashboard.exa.ai](https://dashboard.exa.ai/)
- Check that API keys are correctly set in [Render environment variables](https://render.com/docs/configure-environment-variables)

### CORS Issues

- The server includes [CORS middleware](https://expressjs.com/en/resources/middleware/cors.html), so this should work out of the box
- If issues persist, check the `cors` configuration in [`server.js`](server.js)

### No Search Results

- Verify your [Exa.ai](https://exa.ai/) API key is valid
- Check your [Exa.ai dashboard](https://dashboard.exa.ai/) for available credits
- Try a different search query

### Context Not Working

- Make sure you're using the same conversation (check the URL has `/c/{id}`)
- Check server logs for `[CONTEXT]` messages showing history count
- Follow-up questions need pronouns or references (e.g., "Who founded it?" not "Who founded?")
- See the [Query Rewriting Example](#query-rewriting-example) for how context works

### Database Connection Issues

- If `DATABASE_URL` is not set, the app uses in-memory storage (works fine, but conversations are lost on restart)
- For PostgreSQL, ensure the connection string format is: `postgresql://user:password@host:port/database`
- On [Render](https://render.com/), the `DATABASE_URL` is automatically provided when using [`render.yaml`](render.yaml)
- See [Render Postgres docs](https://render.com/docs/postgresql-refresh) for more details

## License

[MIT](https://opensource.org/licenses/MIT)

## Credits

- [Groq](https://groq.com/) - Fast LLM inference
- [Exa.ai](https://exa.ai/) - Neural web search API
- [Render](https://render.com/) - Cloud hosting platform
- [Render Postgres](https://render.com/docs/postgresql-refresh) - Managed PostgreSQL database


