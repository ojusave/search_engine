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

// Handle search on button click
searchButton.addEventListener('click', performSearch);

// Handle search on Enter key
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
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

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                numResults: 5
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'An error occurred');
        }

        // Display results
        displayResults(data);

    } catch (error) {
        console.error('Search error:', error);
        showError(error.message || 'Failed to perform search. Please try again.');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Display search results
 */
function displayResults(data) {
    // Display answer
    answerDiv.innerHTML = formatAnswer(data.answer);

    // Display source count
    sourceCountSpan.textContent = `(${data.sourceCount})`;

    // Display sources
    sourcesDiv.innerHTML = data.sources.map(source => `
        <div class="source-item" onclick="window.open('${source.url}', '_blank')">
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
    // Convert [Source X] to styled citations
    let formatted = answer.replace(
        /\[Source (\d+)\]/g,
        '<span style="background: #2d3a5c; color: #8b9aff; padding: 2px 6px; border-radius: 4px; font-weight: 600;">[$1]</span>'
    );
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

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


