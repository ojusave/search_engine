/**
 * History page - shows conversation history
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchService } from '../services/searchService';
import DeleteButton from '../components/history/DeleteButton';
import { LogOut } from 'lucide-react';

export default function History() {
  const { user, logout } = useAuth();
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

  const handleDeleteConversation = async (conversationId) => {
    try {
      await searchService.deleteConversation(conversationId);
      setConversations(conversations.filter(c => c.id !== conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all conversations?')) {
      try {
        await searchService.deleteAllConversations();
        setConversations([]);
      } catch (error) {
        console.error('Error deleting all conversations:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Conversation History</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Conversations</h2>
          {conversations.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete All
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations yet. Start searching to create your first conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{conversation.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {conversation.message_count} messages
                    </p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(conversation.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Updated: {new Date(conversation.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <DeleteButton
                    onDelete={() => handleDeleteConversation(conversation.id)}
                    itemName="conversation"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
