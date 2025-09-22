/**
 * Displays search result cards
 */
export default function ResultCard({ result, index }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-blue-600 mb-2">
        <a href={result.url} target="_blank" rel="noopener noreferrer">
          {result.title}
        </a>
      </h3>
      <p className="text-gray-600 mb-2">{result.text}</p>
      <div className="text-sm text-gray-500">
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {result.url}
        </a>
      </div>
      {result.highlights && result.highlights.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-700">
            <strong>Highlights:</strong> {result.highlights.join(' • ')}
          </p>
        </div>
      )}
    </div>
  );
}
