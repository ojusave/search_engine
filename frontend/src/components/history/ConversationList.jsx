/**
 * Displays list of conversations
 */
import { useState, useEffect } from 'react';
import { searchService } from '../../services/searchService';
import DeleteButton from './DeleteButton';

export default function ConversationList({ onSelectConversation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await searchService.getHistory();
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId) => {
    try {
      await searchService.deleteConversation(conversationId);
      setConversations(conversations.filter(c => c.id !== conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return <div className="text-center py-4 text-gray-500">No conversations yet</div>;
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div
            className="flex-1 cursor-pointer"
            onClick={() => onSelectConversation(conversation.id)}
          >
            <h3 className="font-medium">{conversation.title}</h3>
            <p className="text-sm text-gray-500">
              {conversation.message_count} messages • {new Date(conversation.updated_at).toLocaleDateString()}
            </p>
          </div>
          <DeleteButton
            onDelete={() => handleDelete(conversation.id)}
            itemName="conversation"
          />
        </div>
      ))}
    </div>
  );
}
