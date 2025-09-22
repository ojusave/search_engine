/**
 * Search service
 * Handles search and history operations
 */
import api from './api';

export const searchService = {
  /**
   * Execute search with streaming response
   * Returns Response object for streaming
   */
  search: (query, conversationId = null) => {
    const token = localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_URL}/search`;
    
    console.log('Search request:', { query, conversationId, token: token ? 'present' : 'missing' });
    
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        conversation_id: conversationId,
      }),
    });
  },

  /**
   * Get all conversations
   */
  getHistory: () => api.get('/history/conversations'),

  /**
   * Get specific conversation with messages
   */
  getConversation: (id) => api.get(`/history/conversations/${id}`),

  /**
   * Delete specific conversation
   */
  deleteConversation: (id) => api.delete(`/history/conversations/${id}`),

  /**
   * Delete all conversations
   */
  deleteAllConversations: () => api.delete('/history/conversations'),
};
