"""
Response formatting helpers
"""
from datetime import datetime
from typing import Dict, Any, List

def format_conversation_response(conversation) -> Dict[str, Any]:
    """
    Format conversation for API response
    Args:
        conversation: Conversation model instance
    Returns:
        Formatted conversation dictionary
    """
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "updated_at": conversation.updated_at.isoformat(),
        "message_count": len(conversation.messages)
    }

def format_message_response(message) -> Dict[str, Any]:
    """
    Format message for API response
    Args:
        message: Message model instance
    Returns:
        Formatted message dictionary
    """
    return {
        "id": message.id,
        "role": message.role.value,
        "content": message.content,
        "created_at": message.created_at.isoformat()
    }

def format_search_results(results: List[Dict]) -> List[Dict]:
    """
    Format search results for consistent API response
    Args:
        results: List of search result dictionaries
    Returns:
        Formatted search results
    """
    formatted = []
    for i, result in enumerate(results):
        formatted.append({
            "id": i + 1,
            "title": result.get("title", ""),
            "url": result.get("url", ""),
            "text": result.get("text", ""),
            "highlights": result.get("highlights", [])
        })
    return formatted

def format_error_response(message: str, code: int = 400) -> Dict[str, Any]:
    """
    Format error response
    Args:
        message: Error message
        code: Error code
    Returns:
        Formatted error response
    """
    return {
        "error": True,
        "message": message,
        "code": code,
        "timestamp": datetime.utcnow().isoformat()
    }
