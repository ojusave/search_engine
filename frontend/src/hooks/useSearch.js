/**
 * Custom hook for search functionality
 */
import { useState } from 'react';
import { searchService } from '../services/searchService';

export const useSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');

  const search = async (query, conversationId = null) => {
    setIsSearching(true);
    setCurrentResponse(null);
    setStreamingContent('');
    
    try {
      console.log('Starting search with:', { query, conversationId });
      const response = await searchService.search(query, conversationId);
      
      console.log('Search response:', { status: response.status, ok: response.ok });
      
      // Handle streaming response
      if (response.ok) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              setStreamingContent(prev => prev + data);
            }
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Search failed:', { status: response.status, error: errorText });
        throw new Error(`Search failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    search,
    isSearching,
    currentResponse,
    streamingContent,
  };
};
