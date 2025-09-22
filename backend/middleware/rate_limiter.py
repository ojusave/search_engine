"""
Rate Limiter Middleware
Uses Render Key Value to track and limit request rates
"""
from fastapi import HTTPException, status
from config.render_keyvalue import increment_counter

def check_rate_limit(user_id: int, endpoint: str = "search", limit: int = 100):
    """
    Check if user has exceeded rate limit
    Uses Render Key Value for distributed rate limiting
    
    Args:
        user_id: ID of the user making the request
        endpoint: API endpoint being accessed
        limit: Maximum requests allowed per hour
    
    Raises:
        HTTPException: If rate limit exceeded
    """
    key = f"rate_limit:{user_id}:{endpoint}"
    
    # Increment counter in Render Key Value (with 1 hour expiry)
    count = increment_counter(key, expiry_seconds=3600)
    
    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {limit} requests per hour."
        )

