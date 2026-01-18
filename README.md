# AI Search Assistant

A [Perplexity](https://perplexity.ai/)-style AI search assistant built with [Groq](https://groq.com/), [Exa.ai](https://exa.ai/), and [Render](https://render.com/) (with [Render Postgres](https://render.com/docs/postgresql-refresh)). Features conversational search with context memory, real-time streaming responses, and a modern dark/light theme UI.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ojusave/search_engine)

## Features

- **Conversational Search** - Ask follow-up questions that understand context (e.g., "What is Tesla?" → "Who founded it?")
- **Real-time Streaming** - Answers appear word-by-word using [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- **Smart Query Rewriting** - Automatically expands ambiguous queries using conversation history
- **Source Citations** - Inline citations with clickable source cards
- **Conversation History** - [Render Postgres](https://render.com/docs/postgresql-refresh) persistence or in-memory storage
- **One-Click Deployment** - Deploy to [Render](https://render.com/) with automatic database provisioning

## Quick Start

### 1. Get API Keys

- **Groq**: Sign up at [console.groq.com](https://console.groq.com/) and create an API key
- **Exa.ai**: Sign up at [dashboard.exa.ai](https://dashboard.exa.ai/) and get your API key

### 2. Local Development

```bash
npm install
cp .env.example .env
# Edit .env and add your API keys:
# GROQ_API_KEY=your_groq_key
# EXA_API_KEY=your_exa_key
# DATABASE_URL=postgresql://localhost:5432/search_assistant  # Optional
npm start
```

Open `http://localhost:3000`

### 3. Deploy to Render

Click the "Deploy to Render" button above. The `render.yaml` file automatically provisions the web service and database. See [Deployment](#deployment-on-render) for details.

**Quick steps:**
1. Click the deploy button
2. Add your API keys in Render dashboard (Environment Variables):
   - `GROQ_API_KEY`
   - `EXA_API_KEY`

> **Note**: Free [Render Postgres](https://render.com/docs/postgresql-refresh) tier (1GB, 30-day expiry). For production, upgrade to a paid plan ($7/month+).

## Architecture

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

## How It Works

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

**Process:**
1. Load conversation history for context
2. Rewrite ambiguous queries (e.g., "Who founded it?" → "Who founded Tesla?")
3. Search the web using [Exa.ai](https://exa.ai/)'s neural search
4. Stream AI-generated answers from [Groq](https://groq.com/) with source citations
5. Save Q&A pair to conversation history

## Project Structure

| File | Purpose |
|------|---------|
| [`server.js`](server.js) | Express server with conversation APIs |
| [`config.js`](config.js) | API configuration |
| [`components/search.js`](components/search.js) | [Exa.ai](https://exa.ai/) integration |
| [`components/llm.js`](components/llm.js) | [Groq](https://groq.com/) streaming and query rewriting |
| [`components/database.js`](components/database.js) | [PostgreSQL](https://www.postgresql.org/) / [Render Postgres](https://render.com/docs/postgresql-refresh) connection |
| [`components/queryRewriter.js`](components/queryRewriter.js) | Context-aware query expansion |
| [`components/responseFormatter.js`](components/responseFormatter.js) | Format final response |
| [`public/index.html`](public/index.html) | Frontend UI with sidebar layout |
| [`public/app.js`](public/app.js) | EventSource streaming client |
| [`public/style.css`](public/style.css) | Render-style CSS with themes |
| [`render.yaml`](render.yaml) | [Render Blueprint](https://render.com/docs/blueprint-spec) deployment config |
| [`.env.example`](.env.example) | Environment variables template |

## Configuration

### Environment Variables

```bash
GROQ_API_KEY=your_groq_key      # Required - see [Quick Start](#quick-start)
EXA_API_KEY=your_exa_key        # Required - see [Quick Start](#quick-start)
DATABASE_URL=postgresql://...    # Optional - see [Database Setup](#database-setup)
PORT=3000                        # Optional, defaults to 3000
```

### Customization

**Change AI Model** (edit [`config.js`](config.js)):
```javascript
model: 'llama-3.3-70b-versatile'  // Default - best quality
// Other options:
// - 'llama-3.1-8b-instant' (560 t/s, faster for simpler queries)
// - 'openai/gpt-oss-120b' (500 t/s, OpenAI open-weight)
// - 'openai/gpt-oss-20b' (1000 t/s, fastest)
```

See [Groq Models Documentation](https://console.groq.com/docs/models) for full list.

**Adjust Search Results** (edit [`public/app.js`](public/app.js)):
```javascript
numResults: 5  // Change number of sources
```

See the [Exa.ai Search API docs](https://docs.exa.ai/reference/search) for more options.

**Modify AI Behavior** - Edit the system prompt in [`components/llm.js`](components/llm.js) to change answer format, citation style, and tone.

## Database Setup

### [Render Postgres](https://render.com/docs/postgresql-refresh) (Recommended for Production)

[Render Postgres](https://render.com/docs/postgresql-refresh) is automatically provisioned via [`render.yaml`](render.yaml) when deploying to [Render](https://render.com/). The `DATABASE_URL` is automatically injected and the schema is created on first startup. See [Deployment](#deployment-on-render) for full details.

**Benefits of Render Postgres:**
- Zero-configuration setup
- Automatic backups and monitoring
- SSL connections by default
- Free tier available (1GB, 30-day expiry)
- Managed service with automatic maintenance

### Local Development with [PostgreSQL](https://www.postgresql.org/)

For local development, you can use a local [PostgreSQL](https://www.postgresql.org/) installation:

1. **Install [PostgreSQL](https://www.postgresql.org/)**:
   ```bash
   # macOS (using Homebrew)
   brew install postgresql@15
   brew services start postgresql@15

   # Ubuntu/Debian
   sudo apt install postgresql
   sudo systemctl start postgresql
   ```

2. **Create database**:
   ```bash
   createdb search_assistant
   ```

3. **Set connection string** in `.env`:
   ```
   DATABASE_URL=postgresql://localhost:5432/search_assistant
   ```

4. **Run the app** - tables are created automatically:
   ```bash
   npm start
   ```

> **Tip**: Use [pgAdmin](https://www.pgadmin.org/) or [TablePlus](https://tableplus.com/) to browse your database visually.

**Schema** (auto-created on startup):

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

### In-Memory Storage

If `DATABASE_URL` is not set, the app uses in-memory storage (conversations stored in a JavaScript `Map`, lost on restart). Useful for local development and testing.

## Deployment on Render

### Option 1: Using render.yaml (Recommended)

The project includes a [`render.yaml`](render.yaml) blueprint that automatically provisions the web service and [Render Postgres](https://render.com/docs/postgresql-refresh) database. Deploy from [Render Dashboard](https://dashboard.render.com/) by selecting the repository with `render.yaml`.

**What gets provisioned:**
- Web service with Node.js runtime
- Free [Render Postgres](https://render.com/docs/postgresql-refresh) database (1GB, 30-day expiry) - see [Database Setup](#database-setup)
- `DATABASE_URL` environment variable (auto-injected)

**You need to add:**
- `GROQ_API_KEY` - Get from [console.groq.com](https://console.groq.com/)
- `EXA_API_KEY` - Get from [dashboard.exa.ai](https://dashboard.exa.ai/)

Add these in the [Render Dashboard](https://dashboard.render.com/) under Environment Variables.

<details>
<summary>View render.yaml configuration</summary>

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

</details>

### Option 2: Using Render Dashboard

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: ai-search-assistant (or your choice)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add environment variables (see [Quick Start](#quick-start) for API key setup):
   - `GROQ_API_KEY`: Your Groq API key
   - `EXA_API_KEY`: Your Exa.ai API key
   - `DATABASE_URL`: (Optional) Your [PostgreSQL](https://www.postgresql.org/) / [Render Postgres](https://render.com/docs/postgresql-refresh) connection string (see [Database Setup](#database-setup))
7. Deploy!

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/conversations` | Create a new conversation |
| `GET` | `/api/conversations` | List recent conversations |
| `GET` | `/api/conversations/:id` | Get conversation with messages |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |
| `GET` | `/api/conversations/:id/search/stream` | Streaming search with context (SSE) |
| `GET` | `/api/search/stream` | Simple streaming search (no context) |
| `POST` | `/api/search` | Non-streaming search |

### Server-Sent Events (SSE)

The streaming endpoints use [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) to push real-time updates:

| Event | Data | Description |
|-------|------|-------------|
| `status` | `{ message, step }` | Progress updates |
| `rewrite` | `{ original, rewritten }` | Query was rewritten for context |
| `sources` | `{ sources[], sourceCount }` | Search results found |
| `chunk` | `{ text }` | Answer text chunk |
| `done` | `{ messageId, totalDuration }` | Stream complete |
| `error` | `{ message }` | Error occurred |

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **[Groq](https://groq.com/)** | Ultra-fast LLM inference (<1s responses) |
| **[Exa.ai](https://exa.ai/)** | Neural search (semantic understanding) |
| **[Render](https://render.com/)** | Zero-config cloud hosting with auto-scaling |
| **[Render Postgres](https://render.com/docs/postgresql-refresh)** | Managed PostgreSQL with automatic provisioning |

**Key Benefits:** Real-time streaming responses, conversational context memory, semantically relevant search results, source citations, and persistent conversation history.

## License

[MIT](https://opensource.org/licenses/MIT)
