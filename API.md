# API Documentation - Fast Search Engine

Complete API reference for the Fast Search Engine backend.

## Base URL
- **Local**: `http://localhost:8000`
- **Production**: `https://your-backend-url.onrender.com`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400`: Email already registered
- `422`: Invalid email format or weak password

#### POST /auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `401`: Invalid email or password
- `422`: Invalid request format

### Search

#### POST /search
Execute AI-powered search with streaming response.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "What is artificial intelligence?",
  "conversation_id": 123
}
```

**Parameters:**
- `query` (required): Search query string
- `conversation_id` (optional): Continue existing conversation

**Response:**
Server-Sent Events stream with AI response chunks:
```
data: Artificial intelligence (AI) is...

data: the simulation of human intelligence...

data: in machines that are programmed...
```

**Error Responses:**
- `401`: Unauthorized (invalid/missing token)
- `429`: Rate limit exceeded (100 requests/hour)
- `422`: Invalid request format

### History Management

#### GET /history/conversations
Get all conversations for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "What is artificial intelligence?",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:35:00Z",
    "message_count": 4
  },
  {
    "id": 2,
    "title": "How does machine learning work?",
    "created_at": "2024-01-15T11:00:00Z",
    "updated_at": "2024-01-15T11:05:00Z",
    "message_count": 6
  }
]
```

#### GET /history/conversations/{conversation_id}
Get specific conversation with all messages.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "title": "What is artificial intelligence?",
  "created_at": "2024-01-15T10:30:00Z",
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "What is artificial intelligence?",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Artificial intelligence (AI) is...",
      "created_at": "2024-01-15T10:30:05Z"
    }
  ]
}
```

**Error Responses:**
- `404`: Conversation not found
- `401`: Unauthorized

#### DELETE /history/conversations/{conversation_id}
Delete specific conversation.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted"
}
```

#### DELETE /history/conversations
Delete all conversations for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "All conversations deleted"
}
```

### System Endpoints

#### GET /
Root endpoint with API information.

**Response:**
```json
{
  "message": "Fast Search Engine API",
  "version": "1.0.0",
  "status": "running"
}
```

#### GET /health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy"
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "detail": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `422`: Validation Error
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

## Rate Limiting

- **Search endpoint**: 100 requests per hour per user
- **Other endpoints**: No rate limiting
- **Headers**: Rate limit info not included in responses
- **Storage**: Uses Render Key Value for distributed rate limiting

## Data Models

### User
```json
{
  "id": 1,
  "email": "user@example.com",
  "created_at": "2024-01-15T10:00:00Z"
}
```

### Conversation
```json
{
  "id": 1,
  "user_id": 1,
  "title": "Search query title",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z"
}
```

### Message
```json
{
  "id": 1,
  "conversation_id": 1,
  "role": "user|assistant",
  "content": "Message content",
  "created_at": "2024-01-15T10:30:00Z"
}
```

## WebSocket/Streaming

The search endpoint uses Server-Sent Events (SSE) for real-time streaming:

**Client Implementation:**
```javascript
const response = await fetch('/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: 'your search' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      // Process streaming data
    }
  }
}
```

## Testing

### Using curl

**Signup:**
```bash
curl -X POST "https://your-api.com/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST "https://your-api.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Search:**
```bash
curl -X POST "https://your-api.com/search" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is AI?"}'
```

### Interactive API Documentation

Visit `https://your-api.com/docs` for interactive Swagger/OpenAPI documentation.

## SDK Examples

### JavaScript/TypeScript
```typescript
class SearchAPI {
  constructor(private baseURL: string, private token: string) {}
  
  async search(query: string, conversationId?: number) {
    const response = await fetch(`${this.baseURL}/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, conversation_id: conversationId })
    });
    return response;
  }
}
```

### Python
```python
import requests

class SearchAPI:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def search(self, query: str, conversation_id: int = None):
        response = requests.post(
            f'{self.base_url}/search',
            headers=self.headers,
            json={'query': query, 'conversation_id': conversation_id}
        )
        return response
```
