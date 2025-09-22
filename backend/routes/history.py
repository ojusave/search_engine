"""
History Routes
Handles conversation history retrieval and deletion
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.render_postgres import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from models.conversation import Conversation

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/conversations")
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for current user"""
    conversations = db.query(Conversation).filter_by(
        user_id=current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "message_count": len(c.messages)
        }
        for c in conversations
    ]

@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific conversation with all messages"""
    conversation = db.query(Conversation).filter_by(
        id=conversation_id,
        user_id=current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )
    
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "messages": [
            {
                "id": m.id,
                "role": m.role.value,
                "content": m.content,
                "created_at": m.created_at.isoformat()
            }
            for m in conversation.messages
        ]
    }

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete specific conversation"""
    conversation = db.query(Conversation).filter_by(
        id=conversation_id,
        user_id=current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )
    
    db.delete(conversation)
    db.commit()
    
    return {"success": True, "message": "Conversation deleted"}

@router.delete("/conversations")
def delete_all_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all conversations for current user"""
    db.query(Conversation).filter_by(user_id=current_user.id).delete()
    db.commit()
    
    return {"success": True, "message": "All conversations deleted"}

