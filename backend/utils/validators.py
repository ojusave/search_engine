"""
Input validation helpers
"""
import re
from typing import Optional

def validate_email(email: str) -> bool:
    """
    Validate email format
    Args:
        email: Email string to validate
    Returns:
        True if valid email format, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength
    Args:
        password: Password string to validate
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    return True, None

def sanitize_query(query: str) -> str:
    """
    Sanitize search query
    Args:
        query: Raw search query
    Returns:
        Sanitized query string
    """
    # Remove excessive whitespace
    query = re.sub(r'\s+', ' ', query.strip())
    
    # Limit length
    if len(query) > 500:
        query = query[:500]
    
    return query
