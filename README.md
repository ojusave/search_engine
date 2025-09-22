# Fast Search Engine - AI-Powered Search Platform

A Perplexity-like AI search engine built with FastAPI, React, and deployed on Render. Features real-time web search with AI-powered responses using Groq LLM and Exa neural search.

**🔗 Repository**: [https://github.com/ojusave/search_engine](https://github.com/ojusave/search_engine)

## Description

A modern AI-powered search engine that combines real-time web search with intelligent responses. Built with FastAPI backend and React frontend, featuring user authentication, conversation memory, and streaming AI responses powered by Groq LLM and Exa neural search.

## Features

- **AI-Powered Search**: Real-time web search with streaming AI responses
- **User Authentication**: Secure JWT-based authentication system
- **Conversation Memory**: Save and retrieve search history with context
- **Modern UI**: Clean, responsive React frontend with Tailwind CSS
- **Rate Limiting**: Built-in rate limiting using Render Key Value
- **Full-Stack**: Complete backend and frontend solution

## Architecture

### Backend (FastAPI)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: PostgreSQL for persistent storage
- **Cache**: Render Key Value (Valkey 8.1) for rate limiting
- **AI Integration**: Groq LLM + Exa neural search
- **Streaming**: Real-time response streaming

### Frontend (React + Vite)
- **Authentication**: Context-based auth state management
- **Search Interface**: Real-time streaming search results
- **History Management**: View and delete conversation history
- **Responsive Design**: Mobile-friendly Tailwind CSS

### Infrastructure (Render)
- **Backend**: Python web service
- **Frontend**: Static site hosting
- **Database**: Managed PostgreSQL
- **Cache**: Managed Key Value store

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- Groq API key
- Exa API key

### Local Development

1. **Clone and setup backend**:
   ```bash
   cd fast-search-engine/backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Setup environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your API keys and database URLs
   ```

3. **Run backend**:
   ```bash
   uvicorn main:app --reload
   ```

4. **Setup frontend**:
   ```bash
   cd ../frontend
   npm install
   cp env.example .env
   # Edit .env with your backend URL
   ```

5. **Run frontend**:
   ```bash
   npm run dev
   ```

### Required API Keys

#### Groq API Key
1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key
3. Add to `.env` as `GROQ_API_KEY`

#### Exa API Key
1. Sign up at [exa.ai](https://exa.ai)
2. Create an API key
3. Add to `.env` as `EXA_API_KEY`

## Deployment to Render

### Method 1: Blueprint Deployment (Recommended)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [render.com](https://render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml`
   - Set `GROQ_API_KEY` and `EXA_API_KEY` in the dashboard
   - Deploy!

### Method 2: Manual Deployment

1. **Create PostgreSQL Database**:
   - New → PostgreSQL
   - Name: `search-postgres`
   - Plan: Starter (free)

2. **Create Key Value Store**:
   - New → Key Value
   - Name: `search-keyvalue`
   - Plan: Starter (free)

3. **Deploy Backend**:
   - New → Web Service
   - Connect GitHub repo
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Environment Variables:
     - `DATABASE_URL`: From PostgreSQL service
     - `REDIS_URL`: From Key Value service
     - `GROQ_API_KEY`: Your Groq API key
     - `EXA_API_KEY`: Your Exa API key
     - `JWT_SECRET`: Generate random string
     - `CORS_ORIGINS`: Your frontend URL

4. **Deploy Frontend**:
   - New → Static Site
   - Connect GitHub repo
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL`: Your backend URL

## Project Structure

```
fast-search-engine/
├── backend/                    # FastAPI application
│   ├── config/                # Configuration layer
│   ├── models/                 # Database models
│   ├── services/               # Business logic
│   ├── routes/                 # API endpoints
│   ├── middleware/             # Request processing
│   └── main.py                 # App entry point
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API communication
│   │   ├── context/            # State management
│   │   └── hooks/              # Custom hooks
│   └── package.json
├── render.yaml                 # Deployment config
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /auth/signup` - Create new user
- `POST /auth/login` - Login user

### Search
- `POST /search` - Execute search (streaming response)

### History
- `GET /history/conversations` - Get all conversations
- `GET /history/conversations/{id}` - Get specific conversation
- `DELETE /history/conversations/{id}` - Delete conversation
- `DELETE /history/conversations` - Delete all conversations

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: 100 requests per hour per user
- **CORS Protection**: Configured for specific origins
- **Input Validation**: Pydantic models for request validation

## Key Technologies

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Redis
- **Frontend**: React, Vite, Tailwind CSS, Axios
- **AI**: Groq LLM, Exa neural search
- **Deployment**: Render.com
- **Authentication**: JWT, bcrypt

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@host/dbname
REDIS_URL=redis://host:6379
GROQ_API_KEY=your_groq_api_key
EXA_API_KEY=your_exa_api_key
JWT_SECRET=your-secret-key
JWT_EXPIRE_HOURS=720
ENVIRONMENT=development
DEBUG=True
CORS_ORIGINS=http://localhost:5173
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

## 🔄 Updates

- **v1.0.0**: Initial release with core search functionality
- Real-time streaming responses
- Conversation history management
- User authentication system
- Render deployment configuration
