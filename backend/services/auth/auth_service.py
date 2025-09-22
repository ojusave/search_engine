"""
Authentication Service
Handles password hashing and JWT token operations
"""
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from config.settings import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt
    Args:
        password: Plain text password
    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash
    Args:
        plain_password: Plain text password to check
        hashed_password: Stored hash to compare against
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(user_id: int) -> str:
    """
    Create a JWT token for a user
    Args:
        user_id: User's database ID
    Returns:
        Encoded JWT token string
    """
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),  # Subject (user ID)
        "exp": expire          # Expiration time
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_jwt_token(token: str) -> int:
    """
    Decode and validate a JWT token
    Args:
        token: JWT token string
    Returns:
        User ID from token
    Raises:
        ValueError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = int(payload.get("sub"))
        return user_id
    except JWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")

