/**
 * Search input component
 */
import { useState } from 'react';
import { Send } from 'lucide-react';

export default function SearchBar({ onSearch, disabled }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !disabled) {
      onSearch(query);
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask me anything... (e.g., 'What is artificial intelligence?')"
          className="flex-1 px-6 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !query.trim()}
          className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          <Send size={24} />
        </button>
      </div>
    </form>
  );
}
