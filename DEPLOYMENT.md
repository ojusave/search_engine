# Deployment Guide - Fast Search Engine

This guide provides step-by-step instructions for deploying the Fast Search Engine to Render.com.

## Quick Deploy (Blueprint Method)

### 1. Prepare Your Repository
```bash
# Initialize git repository
cd fast-search-engine
git init
git add .
git commit -m "Initial commit: AI Search Engine"

# Push to GitHub
git remote add origin https://github.com/yourusername/fast-search-engine.git
git push -u origin main
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click **"Apply"** to create all services

### 3. Configure Environment Variables
After deployment, go to your backend service dashboard and add:

**Required API Keys:**
- `GROQ_API_KEY`: Get from [console.groq.com](https://console.groq.com)
- `EXA_API_KEY`: Get from [exa.ai](https://exa.ai)

**Auto-configured:**
- `DATABASE_URL`: Automatically set from PostgreSQL service
- `REDIS_URL`: Automatically set from Key Value service
- `JWT_SECRET`: Auto-generated secure secret
- `CORS_ORIGINS`: Set to your frontend URL

## Manual Deployment

If you prefer to set up services manually:

### 1. Create Database Services

**PostgreSQL Database:**
- Service Type: PostgreSQL
- Name: `search-postgres`
- Plan: Starter (Free)
- Database Name: `searchengine`
- User: `searchuser`

**Key Value Store:**
- Service Type: Key Value
- Name: `search-keyvalue`
- Plan: Starter (Free)
- Max Memory Policy: `allkeys-lru`

### 2. Deploy Backend

**Web Service:**
- Build Command: `pip install -r backend/requirements.txt`
- Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/health`
- Root Directory: `backend`

**Environment Variables:**
```bash
DATABASE_URL=<from-postgres-service>
REDIS_URL=<from-keyvalue-service>
GROQ_API_KEY=<your-groq-key>
EXA_API_KEY=<your-exa-key>
JWT_SECRET=<generate-random-string>
CORS_ORIGINS=https://your-frontend-url.onrender.com
```

### 3. Deploy Frontend

**Static Site:**
- Build Command: `cd frontend && npm install && npm run build`
- Publish Directory: `frontend/dist`
- Root Directory: `frontend`

**Environment Variables:**
```bash
VITE_API_URL=https://your-backend-url.onrender.com
```

## Getting API Keys

### Groq API Key
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `gsk_`)

### Exa API Key
1. Visit [exa.ai](https://exa.ai)
2. Sign up for a free account
3. Go to API section in dashboard
4. Create a new API key
5. Copy the key

## Service URLs

After deployment, you'll get URLs like:
- **Backend**: `https://search-backend.onrender.com`
- **Frontend**: `https://search-frontend.onrender.com`

Update the frontend's `VITE_API_URL` to point to your backend URL.

## Testing Your Deployment

1. **Health Check**: Visit `https://your-backend-url.onrender.com/health`
2. **API Docs**: Visit `https://your-backend-url.onrender.com/docs`
3. **Frontend**: Visit your frontend URL and try signing up

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check environment variables are set correctly
- Verify API keys are valid
- Check build logs for dependency issues

**Database connection errors:**
- Ensure `DATABASE_URL` is correctly set
- Check PostgreSQL service is running
- Verify database credentials

**Frontend build fails:**
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check build logs for specific errors

**CORS errors:**
- Ensure `CORS_ORIGINS` includes your frontend URL
- Check frontend `VITE_API_URL` points to correct backend

### Logs and Debugging

**View Logs:**
- Backend: Render Dashboard → Your Service → Logs
- Frontend: Render Dashboard → Your Service → Logs

**Debug Locally:**
```bash
# Test backend locally
cd backend
source venv/bin/activate
uvicorn main:app --reload

# Test frontend locally
cd frontend
npm run dev
```

## Monitoring

Render provides built-in monitoring:
- **Metrics**: CPU, Memory, Response times
- **Logs**: Real-time application logs
- **Health Checks**: Automatic service monitoring

## Updates and Maintenance

**Updating Code:**
1. Push changes to GitHub
2. Render automatically redeploys
3. Check logs for any issues

**Scaling:**
- Upgrade database plan for more storage
- Scale web service for more resources
- Monitor usage and upgrade as needed

## Cost Management

**Free Tier Limits:**
- PostgreSQL: 256MB RAM, 1GB storage
- Key Value: 25MB storage
- Web Service: 750 hours/month
- Static Site: Unlimited

**Upgrade When:**
- Database storage exceeds 1GB
- Need more reliable uptime
- Require faster response times

## Support

**Render Support:**
- Documentation: [render.com/docs](https://render.com/docs)
- Community: [render.com/community](https://render.com/community)
- Support: Available in dashboard

**Project Issues:**
- Check README.md for setup instructions
- Review logs for error details
- Test locally before deploying
