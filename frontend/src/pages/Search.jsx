/**
 * Main search page
 */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../hooks/useSearch';
import SearchBar from '../components/search/SearchBar';
import ConversationList from '../components/history/ConversationList';
import { LogOut } from 'lucide-react';

export default function Search() {
  const { user, logout } = useAuth();
  const { search, isSearching, streamingContent } = useSearch();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (query) => {
    try {
      setError(null);
      await search(query, selectedConversation);
    } catch (error) {
      console.error('Search failed:', error);
      setError(error.message || 'Search failed. Please try again.');
    }
  };

  const handleSelectConversation = (conversationId) => {
    setSelectedConversation(conversationId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Search Engine
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {user?.email}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Interface */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Search Bar */}
              <SearchBar onSearch={handleSearch} disabled={isSearching} />
              
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loading State */}
              {isSearching && !streamingContent && (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-gray-200">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <span className="ml-4 text-gray-600 text-lg">Searching the web...</span>
                  </div>
                </div>
              )}
              
              {/* Search Results */}
              {streamingContent && (
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-gray-200">
                  <h2 className="text-xl font-semibold mb-6 text-gray-800">AI Response</h2>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-lg">
                      {streamingContent}
                      {isSearching && <span className="animate-pulse text-blue-500 font-bold">|</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Conversation History</h2>
              <ConversationList onSelectConversation={handleSelectConversation} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
