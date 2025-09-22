"""
Search Routes
Handles search requests with streaming responses
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from config.render_postgres import get_db
from middleware.auth_middleware import get_current_user
from middleware.rate_limiter import check_rate_limit
from services.orchestrator.search_orchestrator import SearchOrchestrator
from models.user import User

router = APIRouter(prefix="/search", tags=["search"])
orchestrator = SearchOrchestrator()

class SearchRequest(BaseModel):
    query: str
    conversation_id: Optional[int] = None

@router.post("")
async def search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute search and stream AI response
    Uses Server-Sent Events for real-time streaming
    """
    # Check rate limit (100 searches per hour)
    check_rate_limit(current_user.id, "search", limit=100)
    
    # Stream response
    async def generate():
        async for chunk in orchestrator.execute_search(
            query=request.query,
            user_id=current_user.id,
            db=db,
            conversation_id=request.conversation_id
        ):
            # Format as Server-Sent Event
            yield f"data: {chunk}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

