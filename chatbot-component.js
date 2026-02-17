/**
 * Universal Chatbot Component for F1 Card Collection App
 * Can be included in any screen (main, dashboard, etc.)
 */

// Global chatbot state
window.chatbotState = {
    showChatbot: false,
    chatMessages: [],
    chatInput: '',
    chatLoading: false
};

// Initialize chatbot functionality
window.initializeChatbot = function(contextProvider) {
    // Add chatbot container to page if it doesn't exist
    if (!document.querySelector('.universal-chatbot-container')) {
        const chatbotContainer = document.createElement('div');
        chatbotContainer.className = 'fixed left-6 bottom-6 z-30 universal-chatbot-container';
        document.body.appendChild(chatbotContainer);
    }
    
    // Store context provider function
    window.chatbotContextProvider = contextProvider;
    
    // Render initial state
    updateChatbotInterface();
};

// Send chat message
window.sendChatMessage = async function(message) {
    if (!message.trim() || window.chatbotState.chatLoading) return;

    // Add user message to chat
    const userMessage = { role: 'user', content: message, timestamp: Date.now() };
    window.chatbotState.chatMessages.push(userMessage);
    window.chatbotState.chatInput = '';
    window.chatbotState.chatLoading = true;

    updateChatbotInterface();

    try {
        // Get context from provider function
        const contextInfo = window.chatbotContextProvider ? window.chatbotContextProvider() : 
            "You are an AI assistant integrated into an F1 card collection tracking application. Be helpful and knowledgeable about F1 cards, collecting, grading, and card values. Keep responses concise and relevant.";

        const requestBody = {
            model: 'claude-3-haiku-20240307',
            max_tokens: 1500,
            messages: [
                { role: 'system', content: contextInfo },
                ...window.chatbotState.chatMessages.slice(-11, -1), // Keep last 10 messages for context
                { role: 'user', content: message }
            ]
        };

        console.log('Sending universal chat request:', requestBody);

        // Get API configuration from the current page
        const API_URL = window.API_URL || (window.API_BASE + "/api/recognize") || 'https://f1-card-tracker-backend-1.onrender.com/api/recognize';
        const getAuthHeaders = window.getAuthHeaders || function() {
            const token = localStorage.getItem('f1-token');
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Universal Chat API Response:', data);
        
        if (data.content && data.content.length > 0) {
            const assistantMessage = {
                role: 'assistant',
                content: data.content.filter(block => block.type === 'text').map(block => block.text).join('\n'),
                timestamp: Date.now()
            };
            window.chatbotState.chatMessages.push(assistantMessage);
        } else if (data.analysis) {
            // Handle backend format
            const assistantMessage = {
                role: 'assistant',
                content: data.analysis,
                timestamp: Date.now()
            };
            window.chatbotState.chatMessages.push(assistantMessage);
        } else {
            throw new Error('No response content received');
        }
    } catch (error) {
        console.error('Universal Chat error:', error);
        
        let errorMsg = 'Sorry, I encountered an error. Please try again.';
        if (error.message.includes('401')) {
            errorMsg = 'Authentication error. Please check your API key.';
        } else if (error.message.includes('429')) {
            errorMsg = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message.includes('fetch')) {
            errorMsg = 'Network error. Please check your connection and try again.';
        }
        
        const errorMessage = {
            role: 'assistant',
            content: errorMsg,
            timestamp: Date.now(),
            error: true
        };
        window.chatbotState.chatMessages.push(errorMessage);
    } finally {
        window.chatbotState.chatLoading = false;
        updateChatbotInterface();
    }
};

// Clear chat
window.clearChat = function() {
    window.chatbotState.chatMessages = [];
    updateChatbotInterface();
};

// Toggle chatbot
window.toggleChatbot = function() {
    window.chatbotState.showChatbot = !window.chatbotState.showChatbot;
    updateChatbotInterface();
};

// Handle chat input
window.handleChatKeyDown = function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
};

window.handleChatInput = function() {
    const textarea = document.getElementById('universal-chat-input');
    if (textarea) {
        window.chatbotState.chatInput = textarea.value;
        // Auto-resize
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 96) + 'px';
    }
};

window.handleSendMessage = function() {
    if (!window.chatbotState.chatInput.trim() || window.chatbotState.chatLoading) return;
    window.sendChatMessage(window.chatbotState.chatInput);
};

// Update chatbot interface
function updateChatbotInterface() {
    const chatbotContainer = document.querySelector('.universal-chatbot-container');
    if (!chatbotContainer) return;

    const isMobile = window.innerWidth < 768;
    
    if (!window.chatbotState.showChatbot) {
        chatbotContainer.innerHTML = `
            <button
                onclick="toggleChatbot()"
                class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105"
                title="Open AI Assistant"
            >
                <span class="text-2xl">🤖</span>
            </button>
        `;
    } else {
        chatbotContainer.innerHTML = `
            <div class="${isMobile ? 'w-80 h-96' : 'w-96 h-[500px]'} bg-slate-800 rounded-2xl border border-slate-600 shadow-2xl flex flex-col">
                <!-- Chat Header -->
                <div class="flex items-center justify-between p-4 border-b border-slate-600">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🤖</span>
                        <span class="font-semibold text-white">AI Assistant</span>
                        <span class="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">Haiku</span>
                    </div>
                    <div class="flex gap-1">
                        <button
                            onclick="clearChat()"
                            class="text-slate-400 hover:text-white text-sm px-2 py-1 rounded transition-colors"
                            title="Clear chat"
                        >
                            🗑️
                        </button>
                        <button
                            onclick="toggleChatbot()"
                            class="text-slate-400 hover:text-white text-lg px-2 py-1 rounded transition-colors"
                            title="Minimize"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Chat Messages -->
                <div class="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide universal-chat-messages">
                    ${window.chatbotState.chatMessages.length === 0 ? `
                        <div class="text-center text-slate-400 text-sm py-8">
                            <span class="text-2xl mb-2 block">👋</span>
                            Hi! I'm your F1 card collection assistant. I can help you with card values, collecting tips, and questions about your collection.
                        </div>
                    ` : ''}
                    
                    ${window.chatbotState.chatMessages.map((message, index) => `
                        <div class="flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}">
                            <div class="max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                message.role === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : message.error
                                    ? 'bg-red-900/50 text-red-300 border border-red-700'
                                    : 'bg-slate-700 text-slate-100'
                            }">
                                <div class="whitespace-pre-wrap break-words">${message.content}</div>
                                <div class="text-xs mt-1 opacity-70 ${
                                    message.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                                }">
                                    ${new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${window.chatbotState.chatLoading ? `
                        <div class="flex justify-start">
                            <div class="bg-slate-700 text-slate-100 rounded-2xl px-4 py-2 text-sm">
                                <div class="flex items-center gap-1">
                                    <span>Thinking</span>
                                    <div class="flex gap-1">
                                        <div class="w-1 h-1 bg-slate-400 rounded-full animate-pulse"></div>
                                        <div class="w-1 h-1 bg-slate-400 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                                        <div class="w-1 h-1 bg-slate-400 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Chat Input -->
                <div class="p-4 border-t border-slate-600">
                    <div class="flex gap-2">
                        <textarea
                            id="universal-chat-input"
                            placeholder="Ask about your collection..."
                            class="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none max-h-24"
                            rows="1"
                            style="min-height: 40px; height: auto; max-height: 96px;"
                            onkeydown="handleChatKeyDown(event)"
                            oninput="handleChatInput()"
                            ${window.chatbotState.chatLoading ? 'disabled' : ''}
                        >${window.chatbotState.chatInput}</textarea>
                        <button
                            onclick="handleSendMessage()"
                            ${window.chatbotState.chatLoading || !window.chatbotState.chatInput.trim() ? 'disabled' : ''}
                            class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors self-end"
                        >
                            ${window.chatbotState.chatLoading ? '⟳' : '→'}
                        </button>
                    </div>
                    <div class="text-xs text-slate-500 mt-2 text-center">
                        Press Enter to send • Shift+Enter for new line
                    </div>
                </div>
            </div>
        `;

        // Auto-scroll to bottom
        setTimeout(() => {
            const messagesContainer = document.querySelector('.universal-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    }
}

// Add required CSS if not already present
if (!document.querySelector('#universal-chatbot-styles')) {
    const style = document.createElement('style');
    style.id = 'universal-chatbot-styles';
    style.textContent = `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .universal-chatbot-container { z-index: 1000; }
    `;
    document.head.appendChild(style);
}
