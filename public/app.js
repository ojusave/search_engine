/**
 * Frontend JavaScript
 * Handles user interactions and API calls
 */

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resultsContainer = document.getElementById('results');
const answerDiv = document.getElementById('answer');
const sourcesDiv = document.getElementById('sources');
const sourceCountSpan = document.getElementById('sourceCount');
const errorDiv = document.getElementById('error');
const debugToggle = document.getElementById('debugToggle');
const debugPanel = document.getElementById('debugPanel');
const debugLogs = document.getElementById('debugLogs');
const closeDebugPanel = document.getElementById('closeDebugPanel');

let eventSource = null;
let currentSessionId = null;

// Handle search on button click
searchButton.addEventListener('click', performSearch);

// Handle search on Enter key
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Handle debug toggle
debugToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        debugPanel.style.display = 'block';
        // Ensure we can scroll to bottom when panel opens
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    } else {
        debugPanel.style.display = 'none';
        // Close any active debug stream
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    }
});

/**
 * Scroll debug logs to bottom
 */
function scrollToBottom() {
    if (debugLogs) {
        debugLogs.scrollTop = debugLogs.scrollHeight;
    }
}

// Handle close debug panel
closeDebugPanel.addEventListener('click', () => {
    debugPanel.style.display = 'none';
    debugToggle.checked = false;
    // Close any active debug stream
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
});

/**
 * Perform the search
 */
async function performSearch() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showError('Please enter a search query');
        return;
    }

    // Hide previous results and errors
    resultsContainer.style.display = 'none';
    errorDiv.style.display = 'none';

    // Show loading state
    setLoadingState(true);
    answerDiv.innerHTML = '<div class="loading">Searching and generating answer</div>';
    sourcesDiv.innerHTML = '';

    // Clear previous debug logs
    if (debugToggle.checked) {
        debugLogs.innerHTML = '';
    }

    try {
        const isDebugMode = debugToggle.checked;
        currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Set up real-time debug logging if debug mode is enabled
        // Wait for connection to be ready before starting search
        if (isDebugMode) {
            await setupDebugStream(currentSessionId);
            // Small delay to ensure connection is fully established
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                numResults: 5,
                debug: isDebugMode,
                sessionId: currentSessionId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'An error occurred');
        }

        // Don't close stream here - let server send CLOSED message
        // Stream will close automatically when CLOSED message is received

        // Display debug logs if available (fallback for non-streaming)
        if (isDebugMode && data.debugLogs && data.debugLogs.length > 0) {
            // Only add if we didn't already receive them via stream
            const existingLogs = debugLogs.querySelectorAll('.debug-log-entry').length;
            if (existingLogs === 0) {
                displayDebugLogs(data.debugLogs);
            }
        }

        // Display results
        displayResults(data);

    } catch (error) {
        console.error('Search error:', error);
        showError(error.message || 'Failed to perform search. Please try again.');
        
        // Close debug stream on error
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    } finally {
        setLoadingState(false);
    }
}

/**
 * Set up Server-Sent Events stream for real-time debug logs
 * Returns a promise that resolves when the connection is ready
 */
function setupDebugStream(sessionId) {
    return new Promise((resolve, reject) => {
        // Close existing connection if any
        if (eventSource) {
            eventSource.close();
        }
        
        // Create new EventSource connection
        eventSource = new EventSource(`/api/debug-stream/${sessionId}`);
        
        // Wait for connection to be established
        eventSource.onopen = () => {
            console.log('Debug stream connected');
            resolve();
        };
        
        eventSource.onmessage = (event) => {
            try {
                const logEntry = JSON.parse(event.data);
                
                // If this is the CONNECTED message, connection is ready
                if (logEntry.step === 'CONNECTED') {
                    resolve();
                    return;
                }
                
                addDebugLog(logEntry);
                
                // Close connection if we receive CLOSED message
                if (logEntry.step === 'CLOSED') {
                    setTimeout(() => {
                        if (eventSource) {
                            eventSource.close();
                            eventSource = null;
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Error parsing debug log:', error);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('Debug stream error:', error);
            // If connection fails, still proceed with search
            resolve();
        };
        
        // Timeout after 2 seconds if connection doesn't establish
        setTimeout(() => {
            if (eventSource && eventSource.readyState !== EventSource.OPEN) {
                console.warn('Debug stream connection timeout');
                resolve(); // Still proceed with search
            }
        }, 2000);
    });
}

/**
 * Add a single debug log entry in real-time
 */
function addDebugLog(log) {
    const stepClass = log.step === 'ERROR' || log.step === 'GROQ_ERROR' ? 'error' : 
                     log.step === 'COMPLETE' ? 'complete' : 
                     log.step === 'CLOSED' ? 'closed' : 
                     log.step === 'GROQ' ? 'groq' : 'step';
    
    const dataStr = log.data ? JSON.stringify(log.data, null, 2) : '';
    
    const logEntry = document.createElement('div');
    logEntry.className = `debug-log-entry ${stepClass}`;
    logEntry.innerHTML = `
        <div class="debug-log-header">
            <span class="debug-step">[${log.step}]</span>
            <span class="debug-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="debug-message">${escapeHtml(log.message)}</div>
        ${dataStr ? `<pre class="debug-data">${escapeHtml(dataStr)}</pre>` : ''}
    `;
    
    debugLogs.appendChild(logEntry);
    
    // Auto-scroll to bottom with a small delay to ensure DOM is updated
    requestAnimationFrame(() => {
        scrollToBottom();
        // Also scroll the last element into view as a fallback
        logEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

/**
 * Display search results
 */
function displayResults(data) {
    // Display answer
    answerDiv.innerHTML = formatAnswer(data.answer);

    // Display source count
    sourceCountSpan.textContent = `(${data.sourceCount})`;

    // Display sources with data attributes for citation linking
    sourcesDiv.innerHTML = data.sources.map(source => `
        <div class="source-item" data-source-number="${source.number}" onclick="window.open('${source.url}', '_blank')">
            <span class="source-number">${source.number}</span>
            <a href="${source.url}" target="_blank" class="source-title" onclick="event.stopPropagation()">
                ${escapeHtml(source.title)}
            </a>
            <a href="${source.url}" target="_blank" class="source-url" onclick="event.stopPropagation()">
                ${source.url}
            </a>
            ${source.snippet ? `<div class="source-snippet">${escapeHtml(source.snippet)}</div>` : ''}
        </div>
    `).join('');

    // Show results container
    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Format the answer text (convert [Source X] to styled citations)
 */
function formatAnswer(answer) {
    // Convert [Source X] to clickable citations that scroll to sources
    let formatted = answer.replace(
        /\[Source (\d+)\]/g,
        '<a href="#source-$1" class="source-citation" data-source="$1">[$1]</a>'
    );
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

/**
 * Display debug logs in the debug panel
 */
function displayDebugLogs(logs) {
    debugLogs.innerHTML = logs.map(log => {
        const stepClass = log.step === 'ERROR' ? 'error' : log.step === 'COMPLETE' ? 'complete' : 'step';
        const dataStr = log.data ? JSON.stringify(log.data, null, 2) : '';
        return `
            <div class="debug-log-entry ${stepClass}">
                <div class="debug-log-header">
                    <span class="debug-step">[${log.step}]</span>
                    <span class="debug-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="debug-message">${escapeHtml(log.message)}</div>
                ${dataStr ? `<pre class="debug-data">${escapeHtml(dataStr)}</pre>` : ''}
            </div>
        `;
    }).join('');
    
    // Auto-scroll to bottom
    debugLogs.scrollTop = debugLogs.scrollHeight;
}

// Handle citation clicks to scroll to sources
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('source-citation')) {
        e.preventDefault();
        const sourceNum = e.target.getAttribute('data-source');
        const sourceElement = document.querySelector(`[data-source-number="${sourceNum}"]`);
        if (sourceElement) {
            sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the source briefly
            sourceElement.style.transition = 'background-color 0.3s';
            sourceElement.style.backgroundColor = '#3d3d5c';
            setTimeout(() => {
                sourceElement.style.backgroundColor = '';
            }, 2000);
        }
    }
});

/**
 * Show error message
 */
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Set loading state
 */
function setLoadingState(loading) {
    searchInput.disabled = loading;
    searchButton.disabled = loading;
    
    const btnText = searchButton.querySelector('.btn-text');
    const btnLoader = searchButton.querySelector('.btn-loader');
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


