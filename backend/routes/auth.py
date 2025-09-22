"""
Authentication Routes
Handles user signup, login, and authentication
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from config.render_postgres import get_db
from models.user import User
from services.auth.auth_service import hash_password, verify_password, create_jwt_token

router = APIRouter(prefix="/auth", tags=["authentication"])

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """
    Create new user account
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user with hashed password
    user = User(
        email=request.email,
        password_hash=hash_password(request.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate JWT token
    token = create_jwt_token(user.id)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email
        }
    }

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login existing user
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    
    # Verify credentials
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    # Generate JWT token
    token = create_jwt_token(user.id)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email
        }
    }

