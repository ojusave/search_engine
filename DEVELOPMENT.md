# Development Setup Guide

## Local Development Configuration

### Database Configuration

For local development, the application uses **SQLite** instead of PostgreSQL:

```bash
# Local Development (.env)
DATABASE_URL=sqlite:///./search_engine.db
```

**Why SQLite for local development?**
- Render PostgreSQL is only accessible from within Render's network
- SQLite is perfect for local development - no setup required
- Automatically creates `search_engine.db` file in the backend directory
- All SQLAlchemy models work the same way

### Cache Configuration

For local development, the application uses **in-memory storage** instead of Redis:

```bash
# Local Development (.env)
REDIS_URL=redis://localhost:6379
```

**Why in-memory fallback?**
- Render Key Value (Redis) is only accessible from within Render's network
- Application automatically falls back to in-memory storage when Redis is unavailable
- Rate limiting and caching still work for development
- No Redis installation required

### Production vs Development

| Service | Development | Production (Render) |
|---------|-------------|-------------------|
| Database | SQLite (local file) | PostgreSQL (Render) |
| Cache | In-memory | Key Value (Render) |
| API Keys | Required | Required |

## Running the Application

### Quick Start
```bash
./start.sh
```

### Manual Start
```bash
# Terminal 1: Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2: Frontend  
cd frontend && npm run dev
```

## API Keys Required

Both development and production need these API keys:

1. **Groq API Key**: https://console.groq.com
2. **Exa API Key**: https://exa.ai

Add them to `backend/.env`:
```bash
GROQ_API_KEY=your_groq_key_here
EXA_API_KEY=your_exa_key_here
```

## Database File

The SQLite database file `search_engine.db` will be created automatically in the `backend/` directory when you first run the application.

## Troubleshooting

### Database Issues
- SQLite file is created automatically
- If you need to reset: delete `backend/search_engine.db`
- All tables are created automatically on startup

### Cache Issues
- In-memory cache resets when backend restarts
- This is normal for development
- Production uses persistent Redis

### Connection Issues
- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- Check both are running with `curl http://localhost:8000/health`

## Deployment to Render

When deploying to Render, the `render.yaml` configuration automatically:
- Uses Render PostgreSQL (not SQLite)
- Uses Render Key Value (not in-memory)
- Sets correct environment variables
- Connects services via private network

The same code works in both environments!
