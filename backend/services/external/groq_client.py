"""
Groq API Client
Wrapper for Groq's ultra-fast LLM inference
Documentation: https://console.groq.com/docs
"""
from groq import Groq
from config.settings import settings

class GroqClient:
    """Client for Groq LLM API"""
    
    def __init__(self):
        """Initialize Groq client with API key"""
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "llama-3.3-70b-versatile"  # Fast and capable model
    
    def build_context(self, search_results: dict, history: list) -> list:
        """
        Build message context for Groq from search results and conversation history
        Args:
            search_results: Dictionary from Exa search
            history: List of previous messages
        Returns:
            List of message dictionaries for Groq API
        """
        messages = []
        
        # Add conversation history (last 5 messages for context)
        if history:
            for msg in history[-5:]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Build system prompt with search results
        search_context = "\n\n".join([
            f"[{i+1}] {r['title']}\n{r['url']}\n{r['text'][:500]}..."
            for i, r in enumerate(search_results.get("results", [])[:5])
        ])
        
        system_prompt = f"""You are a helpful AI search assistant. Answer questions based on these search results:

{search_context}

Provide comprehensive, accurate answers with citations. Be concise but informative."""
        
        # System message should be first
        messages.insert(0, {"role": "system", "content": system_prompt})
        
        return messages
    
    def generate_streaming(self, messages: list):
        """
        Generate streaming response from Groq
        Args:
            messages: List of message dictionaries
        Yields:
            Text chunks from the streaming response
        """
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=2048,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            print(f"Groq generation error: {e}")
            yield f"Error generating response: {str(e)}"

