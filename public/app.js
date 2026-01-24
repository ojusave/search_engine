/**
 * Frontend JavaScript
 * Perplexity-style conversational search with streaming
 */

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const chatThread = document.getElementById('chatThread');
const chatMessages = document.getElementById('chatMessages');
const welcomeSearchInput = document.getElementById('welcomeSearchInput');
const welcomeSearchButton = document.getElementById('welcomeSearchButton');
const followupInput = document.getElementById('followupInput');
const followupButton = document.getElementById('followupButton');
const newChatBtn = document.getElementById('newChatBtn');
const conversationList = document.getElementById('conversationList');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarResizeHandle = document.getElementById('sidebarResizeHandle');
const themeToggle = document.getElementById('themeToggle');

// State
let currentConversationId = null;
let isLoading = false;
let eventSource = null;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSidebarResize();
    initRouting();
    loadConversations();
    setupEventListeners();
});

function setupEventListeners() {
    // Welcome screen search
    welcomeSearchButton.addEventListener('click', () => startNewSearch(welcomeSearchInput.value));
    welcomeSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startNewSearch(welcomeSearchInput.value);
    });

    // Follow-up search
    followupButton.addEventListener('click', () => sendFollowup(followupInput.value));
    followupInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendFollowup(followupInput.value);
    });

    // New chat button
    newChatBtn.addEventListener('click', startNewConversation);

    // Example chips
    document.querySelectorAll('.example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            welcomeSearchInput.value = query;
            startNewSearch(query);
        });
    });

    // Sidebar toggle (mobile)
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
}

// ============================================
// Sidebar Resize
// ============================================

function initSidebarResize() {
    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
    }

    if (!sidebarResizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    sidebarResizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(window.getComputedStyle(sidebar).width, 10);
        sidebar.style.transition = 'none';
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const width = startWidth + e.clientX - startX;
        const minWidth = 200;
        const maxWidth = 500;

        if (width >= minWidth && width <= maxWidth) {
            document.documentElement.style.setProperty('--sidebar-width', width + 'px');
            localStorage.setItem('sidebarWidth', width);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            sidebar.style.transition = '';
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// ============================================
// Theme Management
// ============================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else if (prefersDark) {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// ============================================
// Routing
// ============================================

function initRouting() {
    // Check if we're on a conversation URL
    const path = window.location.pathname;
    const match = path.match(/^\/c\/([a-f0-9-]+)$/i);

    if (match) {
        const conversationId = match[1];
        loadConversation(conversationId);
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const path = window.location.pathname;
        const match = path.match(/^\/c\/([a-f0-9-]+)$/i);

        if (match) {
            loadConversation(match[1]);
        } else {
            showWelcomeScreen();
        }
    });
}

function navigateToConversation(id) {
    history.pushState({ conversationId: id }, '', `/c/${id}`);
    currentConversationId = id;
}

// ============================================
// Conversation Management
// ============================================

async function loadConversations() {
    try {
        const response = await fetch('/api/conversations');
        const conversations = await response.json();
        renderConversationList(conversations);
    } catch (error) {
        console.error('Failed to load conversations:', error);
    }
}

function renderConversationList(conversations) {
    if (conversations.length === 0) {
        conversationList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No recent searches</p>';
        return;
    }

    conversationList.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}"
             data-id="${conv.id}">
            <div class="conversation-item-content" onclick="loadConversation('${conv.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>${escapeHtml(conv.title || conv.first_query || 'New Search')}</span>
            </div>
            <button class="delete-conversation-btn" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" 
                    title="Delete conversation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

async function loadConversation(id) {
    try {
        const response = await fetch(`/api/conversations/${id}`);

        if (!response.ok) {
            showWelcomeScreen();
            return;
        }

        const conversation = await response.json();
        currentConversationId = id;

        showChatThread();
        renderMessages(conversation.messages || []);
        updateActiveConversation(id);

        // Update URL if not already there
        if (!window.location.pathname.includes(id)) {
            navigateToConversation(id);
        }

    } catch (error) {
        console.error('Failed to load conversation:', error);
        showWelcomeScreen();
    }
}

function startNewConversation() {
    currentConversationId = null;
    history.pushState({}, '', '/');
    showWelcomeScreen();
    welcomeSearchInput.value = '';
    welcomeSearchInput.focus();
}

// ============================================
// UI State
// ============================================

function showWelcomeScreen() {
    welcomeScreen.style.display = 'flex';
    chatThread.style.display = 'none';
    currentConversationId = null;
    updateActiveConversation(null);
}

function showChatThread() {
    welcomeScreen.style.display = 'none';
    chatThread.style.display = 'flex';
}

function updateActiveConversation(id) {
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === id);
    });
}

// ============================================
// Search Functions
// ============================================

async function startNewSearch(query) {
    if (!query || query.trim().length === 0 || isLoading) return;

    // Create new conversation
    try {
        const response = await fetch('/api/conversations', { method: 'POST' });
        const conversation = await response.json();
        currentConversationId = conversation.id;
        navigateToConversation(conversation.id);
    } catch (error) {
        console.error('Failed to create conversation:', error);
        // Continue with a temporary ID
        currentConversationId = 'temp-' + Date.now();
    }

    showChatThread();
    chatMessages.innerHTML = '';
    performSearch(query);
    loadConversations(); // Refresh sidebar
}

async function sendFollowup(query) {
    if (!query || query.trim().length === 0 || isLoading || !currentConversationId) return;

    followupInput.value = '';
    performSearch(query);
}

async function performSearch(query) {
    if (isLoading) return;

    isLoading = true;
    setLoadingState(true);

    // Add message container
    const messageId = 'msg-' + Date.now();
    const messageHtml = `
        <div class="message" id="${messageId}">
            <div class="message-query">
                <div class="message-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div>
                    <div class="query-text">${escapeHtml(query)}</div>
                    <div class="rewritten-query" id="${messageId}-rewrite" style="display: none;"></div>
                </div>
            </div>
            <div class="message-answer">
                <div class="answer-content" id="${messageId}-answer">
                    <div class="loading">
                        <span>Searching</span>
                        <div class="loading-dots"><span></span><span></span><span></span></div>
                    </div>
                </div>
            </div>
            <div class="message-sources" id="${messageId}-sources" style="display: none;">
                <div class="sources-header">Sources</div>
                <div class="sources-grid" id="${messageId}-sources-grid"></div>
            </div>
        </div>
    `;

    chatMessages.insertAdjacentHTML('beforeend', messageHtml);
    scrollToBottom();

    // Close any existing event source
    if (eventSource) {
        eventSource.close();
    }

    try {
        const streamUrl = `/api/conversations/${currentConversationId}/search/stream?q=${encodeURIComponent(query)}&numResults=5`;
        eventSource = new EventSource(streamUrl);

        let answerText = '';
        const answerDiv = document.getElementById(`${messageId}-answer`);
        const sourcesDiv = document.getElementById(`${messageId}-sources`);
        const sourcesGrid = document.getElementById(`${messageId}-sources-grid`);
        const rewriteDiv = document.getElementById(`${messageId}-rewrite`);

        eventSource.addEventListener('status', (e) => {
            const data = JSON.parse(e.data);
            answerDiv.innerHTML = `
                <div class="loading">
                    <span>${data.message}</span>
                    <div class="loading-dots"><span></span><span></span><span></span></div>
                </div>
            `;
        });

        eventSource.addEventListener('rewrite', (e) => {
            const data = JSON.parse(e.data);
            rewriteDiv.textContent = `Searched for: "${data.rewritten}"`;
            rewriteDiv.style.display = 'block';
        });

        eventSource.addEventListener('sources', (e) => {
            const data = JSON.parse(e.data);

            // Display sources
            sourcesGrid.innerHTML = data.sources.map(source => `
                <a href="${source.url}" target="_blank" class="source-card">
                    <span class="source-card-number">${source.number}</span>
                    <span class="source-card-title">${escapeHtml(source.title)}</span>
                    <div class="source-card-url">${new URL(source.url).hostname}</div>
                </a>
            `).join('');

            sourcesDiv.style.display = 'block';

            // Clear loading, prepare for answer
            answerDiv.innerHTML = '';
        });

        eventSource.addEventListener('chunk', (e) => {
            const data = JSON.parse(e.data);
            answerText += data.text;
            answerDiv.innerHTML = formatAnswer(answerText);
            scrollToBottom();
        });

        eventSource.addEventListener('done', (e) => {
            eventSource.close();
            eventSource = null;
            isLoading = false;
            setLoadingState(false);
            loadConversations(); // Refresh sidebar
            followupInput.focus();
        });

        eventSource.addEventListener('error', (e) => {
            let errorMessage = 'An error occurred';
            if (e.data) {
                const data = JSON.parse(e.data);
                errorMessage = data.message || errorMessage;
            }

            answerDiv.innerHTML = `<div class="error-message">${escapeHtml(errorMessage)}</div>`;

            eventSource.close();
            eventSource = null;
            isLoading = false;
            setLoadingState(false);
        });

        eventSource.onerror = () => {
            if (eventSource && eventSource.readyState === EventSource.CLOSED) {
                return;
            }

            answerDiv.innerHTML = `<div class="error-message">Connection lost. Please try again.</div>`;

            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            isLoading = false;
            setLoadingState(false);
        };

    } catch (error) {
        console.error('Search error:', error);
        document.getElementById(`${messageId}-answer`).innerHTML =
            `<div class="error-message">${escapeHtml(error.message)}</div>`;
        isLoading = false;
        setLoadingState(false);
    }
}

// ============================================
// Render Functions
// ============================================

function renderMessages(messages) {
    if (messages.length === 0) {
        chatMessages.innerHTML = '';
        return;
    }

    chatMessages.innerHTML = messages.map(msg => {
        const sources = typeof msg.sources === 'string' ? JSON.parse(msg.sources) : msg.sources;

        return `
            <div class="message">
                <div class="message-query">
                    <div class="message-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <div>
                        <div class="query-text">${escapeHtml(msg.query)}</div>
                        ${msg.rewritten_query ? `<div class="rewritten-query">Searched for: "${escapeHtml(msg.rewritten_query)}"</div>` : ''}
                    </div>
                </div>
                <div class="message-answer">
                    <div class="answer-content">${formatAnswer(msg.answer || '')}</div>
                </div>
                ${sources && sources.length > 0 ? `
                    <div class="message-sources">
                        <div class="sources-header">Sources</div>
                        <div class="sources-grid">
                            ${sources.map(source => `
                                <a href="${source.url}" target="_blank" class="source-card">
                                    <span class="source-card-number">${source.number}</span>
                                    <span class="source-card-title">${escapeHtml(source.title)}</span>
                                    <div class="source-card-url">${new URL(source.url).hostname}</div>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    scrollToBottom();
}

function formatAnswer(answer) {
    if (!answer) return '';

    // Convert [Source X] to clickable citations
    let formatted = answer.replace(
        /\[Source (\d+)\]/g,
        '<span class="source-citation" data-source="$1">$1</span>'
    );

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

// ============================================
// Utility Functions
// ============================================

function setLoadingState(loading) {
    const buttons = [welcomeSearchButton, followupButton];
    const inputs = [welcomeSearchInput, followupInput];

    buttons.forEach(btn => {
        if (btn) btn.disabled = loading;
    });

    inputs.forEach(input => {
        if (input) input.disabled = loading;
    });

    // Update button text
    if (welcomeSearchButton) {
        const btnText = welcomeSearchButton.querySelector('.btn-text');
        const btnLoader = welcomeSearchButton.querySelector('.btn-loader');
        if (btnText && btnLoader) {
            btnText.style.display = loading ? 'none' : 'inline';
            btnLoader.style.display = loading ? 'inline' : 'none';
        }
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Delete Functions
// ============================================

async function deleteConversation(id) {
    if (!confirm('Are you sure you want to delete this conversation?')) {
        return;
    }

    try {
        const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
        
        if (!response.ok) {
            throw new Error('Failed to delete conversation');
        }

        // If we deleted the current conversation, go back to welcome screen
        if (id === currentConversationId) {
            showWelcomeScreen();
        }

        // Reload conversation list
        loadConversations();
    } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation. Please try again.');
    }
}

async function deleteAllConversations() {
    if (!confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch('/api/conversations', { method: 'DELETE' });
        
        if (!response.ok) {
            throw new Error('Failed to delete all conversations');
        }

        // Go back to welcome screen
        showWelcomeScreen();
        
        // Reload conversation list
        loadConversations();
        
        alert('All conversations have been deleted.');
    } catch (error) {
        console.error('Error deleting all conversations:', error);
        alert('Failed to delete all conversations. Please try again.');
    }
}

// Make functions globally accessible for onclick handlers
window.loadConversation = loadConversation;
window.deleteConversation = deleteConversation;
window.deleteAllConversations = deleteAllConversations;
