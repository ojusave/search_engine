"""
Search Orchestrator
Main coordinator that brings together Exa search, Groq LLM, and database operations
"""
from services.external.exa_client import ExaClient
from services.external.groq_client import GroqClient
from models.conversation import Conversation
from models.message import Message, MessageRole
from sqlalchemy.orm import Session

class SearchOrchestrator:
    """Orchestrates the complete search workflow"""
    
    def __init__(self):
        """Initialize with Exa and Groq clients"""
        self.exa_client = ExaClient()
        self.groq_client = GroqClient()
    
    async def execute_search(
        self,
        query: str,
        user_id: int,
        db: Session,
        conversation_id: int = None
    ):
        """
        Execute complete search workflow:
        1. Get or create conversation
        2. Fetch conversation history
        3. Search with Exa
        4. Build context and generate response with Groq
        5. Save to database
        6. Stream response to user
        
        Args:
            query: User's search query
            user_id: ID of the user making the search
            db: Database session
            conversation_id: Optional existing conversation ID
        
        Yields:
            Text chunks from streaming response
        """
        # Step 1: Get or create conversation
        if conversation_id:
            conversation = db.query(Conversation).filter_by(
                id=conversation_id,
                user_id=user_id
            ).first()
        else:
            # Create new conversation
            conversation = Conversation(
                user_id=user_id,
                title=query[:50]  # Use first 50 chars of query as title
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
        
        # Step 2: Get conversation history
        history = [
            {
                "role": msg.role.value,
                "content": msg.content
            }
            for msg in conversation.messages
        ]
        
        # Step 3: Search with Exa
        search_results = self.exa_client.search_web(query)
        
        # Step 4: Build context for Groq
        messages = self.groq_client.build_context(search_results, history)
        messages.append({"role": "user", "content": query})
        
        # Step 5: Save user message to database
        user_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=query
        )
        db.add(user_message)
        db.commit()
        
        # Step 6: Generate and stream response
        full_response = ""
        
        for chunk in self.groq_client.generate_streaming(messages):
            full_response += chunk
            yield chunk
        
        # Step 7: Save assistant message to database
        assistant_message = Message(
            conversation_id=conversation.id,
            role=MessageRole.ASSISTANT,
            content=full_response,
            search_results=search_results
        )
        db.add(assistant_message)
        db.commit()

