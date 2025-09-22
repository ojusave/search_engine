"""
Authentication Middleware
Provides JWT verification for protected routes
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from config.render_postgres import get_db
from models.user import User
from services.auth.auth_service import decode_jwt_token

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Verify JWT token and return current user
    Used as a dependency in protected routes
    
    Args:
        credentials: HTTP Bearer token from request header
        db: Database session
    
    Returns:
        User object if token is valid
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    try:
        token = credentials.credentials
        user_id = decode_jwt_token(token)
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

