"""
Exa API Client
Wrapper for Exa's neural search engine
Documentation: https://docs.exa.ai
"""
from exa_py import Exa
from config.settings import settings

class ExaClient:
    """Client for Exa AI search API"""
    
    def __init__(self):
        """Initialize Exa client with API key"""
        self.client = Exa(api_key=settings.EXA_API_KEY)
    
    def search_web(self, query: str, num_results: int = 10) -> dict:
        """
        Search the web using Exa's neural search
        Args:
            query: Search query string
            num_results: Number of results to return (default 10)
        Returns:
            Dictionary containing search results and metadata
        """
        try:
            # Perform neural search with content extraction
            results = self.client.search_and_contents(
                query,
                num_results=num_results,
                text={"max_characters": 2000},  # Get text content
                highlights=True  # Get highlighted relevant sections
            )
            
            # Format results for consistency
            formatted_results = {
                "results": [
                    {
                        "title": r.title,
                        "url": r.url,
                        "text": r.text if hasattr(r, 'text') else "",
                        "highlights": r.highlights if hasattr(r, 'highlights') else []
                    }
                    for r in results.results
                ],
                "total": len(results.results)
            }
            
            return formatted_results
            
        except Exception as e:
            print(f"Exa search error: {e}")
            return {"results": [], "total": 0}

