/**
 * Displays streaming AI response
 */
import { useState, useEffect, useRef } from 'react';

export default function StreamingAnswer({ response }) {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const readerRef = useRef(null);

  useEffect(() => {
    if (!response || !response.body) return;

    // Reset content when new response comes in
    setContent('');
    setIsStreaming(true);

    const readStream = async () => {
      try {
        // Check if stream is already locked
        if (response.body.locked) {
          console.error('Stream is already locked');
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              setContent((prev) => prev + data);
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        setContent(prev => prev + '\n\n[Streaming error occurred]');
      } finally {
        setIsStreaming(false);
        readerRef.current = null;
      }
    };

    readStream();

    // Cleanup function
    return () => {
      if (readerRef.current) {
        readerRef.current.cancel().catch(console.error);
      }
    };
  }, [response]);

  return (
    <div className="prose max-w-none">
      <div className="whitespace-pre-wrap">
        {content}
        {isStreaming && <span className="animate-pulse">|</span>}
      </div>
    </div>
  );
}
