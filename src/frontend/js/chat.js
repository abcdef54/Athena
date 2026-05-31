import { api } from './api.js';
import { auth } from './auth.js';
import { ui } from './ui.js';
import { attachments } from './attachments.js';

export const chat = {
    conversations: [],
    activeConversationId: null,
    messages: [],
    isWaiting: false,
    deepThink: false,

    // Initialize event handlers and listeners
    init: () => {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const deepThinkToggle = document.getElementById('deepThinkToggle');
        const newChatBtn = document.getElementById('newChatBtn');
        const renameBtn = document.getElementById('renameConvBtn');
        const deleteBtn = document.getElementById('deleteConvBtn');

        // Input text auto-resize
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            const newHeight = Math.min(input.scrollHeight, 150);
            input.style.height = newHeight + 'px';
            sendBtn.disabled = input.value.trim().length === 0 || chat.isWaiting;
        });

        // Keydown handling (Enter to send, Shift+Enter for newline)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    chat.handleSend();
                }
            }
        });

        // Click to send
        sendBtn.addEventListener('click', () => {
            if (!sendBtn.disabled) {
                chat.handleSend();
            }
        });

        // Deep Think switch toggling
        deepThinkToggle.addEventListener('change', (e) => {
            chat.deepThink = e.target.checked;
            ui.showToast(`Deep Think ${chat.deepThink ? 'Enabled (Neon reasoning mode)' : 'Disabled'}`, 'success');
        });

        // Sidebar new chat trigger
        newChatBtn.addEventListener('click', () => chat.createNewChat());

        // Header controls (Rename/Delete)
        renameBtn.addEventListener('click', () => chat.handleRenameActive());
        deleteBtn.addEventListener('click', () => chat.handleDeleteActive());
        
        // Setup initial disabled inputs representing Welcome state
        input.disabled = false;
        input.placeholder = "Message Athena...";
        sendBtn.disabled = true;
    },

    // Load all conversations in the sidebar
    loadConversations: async () => {
        const loader = document.getElementById('sidebarLoader');
        const emptyState = document.getElementById('sidebarEmpty');
        const ul = document.getElementById('conversationList');
        
        loader.classList.remove('hidden');
        ul.innerHTML = '';
        emptyState.classList.add('hidden');
        
        try {
            const data = await api.getConversations();
            // Chronological sort: newest first
            chat.conversations = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            if (chat.conversations.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                chat.renderConversationsList();
            }
        } catch (error) {
            ui.showToast('Failed to load conversations');
        } finally {
            loader.classList.add('hidden');
        }
    },

    // Render list items in sidebar
    renderConversationsList: () => {
        const ul = document.getElementById('conversationList');
        ul.innerHTML = '';
        
        chat.conversations.forEach(conv => {
            const li = document.createElement('li');
            li.className = `conversation-item ${conv.id === chat.activeConversationId ? 'active' : ''}`;
            li.dataset.id = conv.id;
            
            li.innerHTML = `
                <svg class="conv-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="conv-title">${conv.title || 'New Conversation'}</span>
            `;
            
            li.addEventListener('click', () => chat.selectConversation(conv.id));
            ul.appendChild(li);
        });
    },

    // Trigger creating a new chat from button
    createNewChat: async (optionalTitle = 'New Chat') => {
        try {
            if (!auth.user) return;
            const newConv = await api.createConversation(auth.user.id, optionalTitle);
            chat.conversations.unshift(newConv);
            chat.renderConversationsList();
            await chat.selectConversation(newConv.id);
            return newConv;
        } catch (error) {
            ui.showToast('Failed to create new conversation');
            throw error;
        }
    },

    // Select and activate conversation
    selectConversation: async (id) => {
        chat.activeConversationId = id;
        localStorage.setItem('activeConversationId', id);
        
        // Render updated active class list
        chat.renderConversationsList();
        
        const conv = chat.conversations.find(c => c.id === id);
        const headerActions = document.getElementById('chatHeaderActions');
        const chatTitle = document.getElementById('chatTitle');

        if (conv) {
            chatTitle.textContent = conv.title || 'Chat';
            headerActions.classList.remove('hidden');
        } else {
            chatTitle.textContent = 'Select a conversation';
            headerActions.classList.add('hidden');
        }
        
        // Hide File Drawer if open
        ui.closeDrawer();

        // Load message history & attachments list
        await chat.loadMessages(id);
        await attachments.loadForConversation(id);
        
        // Close sidebar backdrop for mobile views
        ui.closeMobileSidebar();
    },

    // Clear active selection and return to welcome page
    resetToWelcome: () => {
        chat.activeConversationId = null;
        localStorage.removeItem('activeConversationId');
        chat.renderConversationsList();
        
        document.getElementById('chatTitle').textContent = 'Select a conversation';
        document.getElementById('chatHeaderActions').classList.add('hidden');
        
        const container = document.getElementById('messagesContainer');
        const emptyState = document.getElementById('chatEmptyState');
        
        // Clear old message views
        Array.from(container.children).forEach(child => {
            if (child.id !== 'chatEmptyState') {
                child.remove();
            }
        });
        emptyState.classList.remove('hidden');
        
        // Reset inputs
        const input = document.getElementById('messageInput');
        input.value = '';
        input.style.height = 'auto';
        input.disabled = false;
        
        attachments.resetDrawerFiles();
        ui.closeDrawer();
    },

    // Fetch and render historical logs
    loadMessages: async (id) => {
        chat.messages = [];
        const container = document.getElementById('messagesContainer');
        const emptyState = document.getElementById('chatEmptyState');
        
        // Clear container except welcome screen
        Array.from(container.children).forEach(child => {
            if (child.id !== 'chatEmptyState') {
                child.remove();
            }
        });
        
        try {
            const data = await api.getConversationMessages(id);
            if (data && data.length > 0) {
                emptyState.classList.add('hidden');
                
                // Chronological sort: oldest first
                const sorted = data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                
                const fragment = document.createDocumentFragment();
                for (const msg of sorted) {
                    chat.messages.push(msg);
                    const node = await chat.createMessageNode(msg);
                    fragment.appendChild(node);
                }
                container.appendChild(fragment);
                ui.scrollToBottom('messagesContainer');
            } else {
                emptyState.classList.remove('hidden');
            }
        } catch (error) {
            ui.showToast('Failed to load message history');
        }
    },

    // Create DOM element for user/assistant messages
    createMessageNode: async (msg) => {
        const div = document.createElement('div');
        div.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;
        div.dataset.id = msg.id;
        
        const timeStr = new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        div.innerHTML = `
            <div class="message-bubble">
                <div class="message-content">
                    ${ui.renderMarkdown(msg.content)}
                </div>
                <div class="message-meta">
                    <span>${timeStr}</span>
                </div>
            </div>
        `;

        // If assistant message, fetch citations/sources
        if (msg.role === 'assistant') {
            try {
                const citations = await api.getMessageSources(msg.conversation_id, msg.id);
                if (citations && citations.length > 0) {
                    const bubble = div.querySelector('.message-bubble');
                    
                    const citationWrapper = document.createElement('div');
                    citationWrapper.className = 'citations-wrapper';
                    
                    citations.forEach((cit, idx) => {
                        const pill = document.createElement('button');
                        pill.className = 'citation-pill';
                        pill.innerHTML = `
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                            </svg>
                            <span>[${idx + 1}] ${cit.file_name}</span>
                        `;
                        pill.addEventListener('click', (e) => {
                            e.stopPropagation();
                            ui.showCitationPopover(pill, cit);
                        });
                        citationWrapper.appendChild(pill);
                    });
                    
                    bubble.appendChild(citationWrapper);
                }
            } catch (err) {
                console.error(`Citations fetch failed for message ${msg.id}:`, err);
            }
        }
        
        return div;
    },

    // Add single message dynamically
    appendMessage: async (msg) => {
        const emptyState = document.getElementById('chatEmptyState');
        if (emptyState) emptyState.classList.add('hidden');

        chat.messages.push(msg);
        const node = await chat.createMessageNode(msg);
        
        const container = document.getElementById('messagesContainer');
        container.appendChild(node);
        ui.scrollToBottom('messagesContainer');
    },

    // Blinking typing loaders
    showTypingIndicator: () => {
        const container = document.getElementById('messagesContainer');
        const div = document.createElement('div');
        div.className = 'message assistant typing-node';
        div.id = 'typingIndicator';
        div.innerHTML = `
            <div class="message-bubble">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                ${chat.deepThink ? '<div style="font-size:0.75rem; color:var(--accent-cyan); margin-top:4px; font-weight:500; text-transform:uppercase; letter-spacing:0.5px; text-shadow:0 0 6px rgba(0,210,255,0.3);">Athena is thinking...</div>' : ''}
            </div>
        `;
        container.appendChild(div);
        ui.scrollToBottom('messagesContainer');
    },

    hideTypingIndicator: () => {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    },

    // Control chat inputs during networking
    setWaitingState: (waiting) => {
        chat.isWaiting = waiting;
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const deepThinkToggle = document.getElementById('deepThinkToggle');
        
        if (waiting) {
            input.disabled = true;
            sendBtn.disabled = true;
            deepThinkToggle.disabled = true;
            chat.showTypingIndicator();
        } else {
            input.disabled = false;
            deepThinkToggle.disabled = false;
            input.value = '';
            input.style.height = 'auto';
            input.focus();
            chat.hideTypingIndicator();
        }
    },

    // Core message send orchestrator
    handleSend: async () => {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        if (!content || chat.isWaiting) return;

        chat.setWaitingState(true);

        try {
            // Auto-create thread if in Welcome view
            if (!chat.activeConversationId) {
                // Determine a nice title from first user query
                const initialTitle = content.length > 20 ? content.substring(0, 20) + "..." : content;
                const newConv = await chat.createNewChat(initialTitle);
                if (!newConv) throw new Error("Could not initialize thread");
            }
            
            const activeId = chat.activeConversationId;

            // Render optimistic user message
            const tempId = 'temp-' + Date.now();
            const userMsg = {
                id: tempId,
                conversation_id: activeId,
                content: content,
                role: 'user',
                created_at: new Date().toISOString()
            };
            await chat.appendMessage(userMsg);

            // Fetch AI prompt response
            const responseMsg = await api.sendChatMessage(activeId, content, chat.deepThink);
            
            chat.setWaitingState(false);
            
            // Render genuine assistant message
            await chat.appendMessage(responseMsg);
        } catch (error) {
            chat.setWaitingState(false);
            ui.showToast(error.message || 'Failed to send message');
        }
    },

    // Handles active renaming prompt
    handleRenameActive: async () => {
        if (!chat.activeConversationId) return;
        const conv = chat.conversations.find(c => c.id === chat.activeConversationId);
        if (!conv) return;

        const currentName = conv.title || 'New Chat';
        const newName = prompt('Rename this conversation:', currentName);
        
        if (newName && newName.trim() && newName.trim() !== currentName) {
            try {
                const updated = await api.renameConversation(chat.activeConversationId, newName.trim());
                conv.title = updated.title;
                document.getElementById('chatTitle').textContent = updated.title;
                chat.renderConversationsList();
                ui.showToast('Conversation renamed successfully', 'success');
            } catch (error) {
                ui.showToast('Failed to rename conversation');
            }
        }
    },

    // Handles active deletion prompt
    handleDeleteActive: async () => {
        if (!chat.activeConversationId) return;
        const confirmDelete = confirm('Are you sure you want to delete this conversation thread? This deletes all associated message logs and ingested vectors permanently.');
        
        if (confirmDelete) {
            try {
                await api.deleteConversation(chat.activeConversationId);
                const index = chat.conversations.findIndex(c => c.id === chat.activeConversationId);
                if (index !== -1) {
                    chat.conversations.splice(index, 1);
                }
                chat.resetToWelcome();
                ui.showToast('Conversation deleted', 'success');
            } catch (error) {
                ui.showToast('Failed to delete conversation');
            }
        }
    }
};

window.chat = chat; // Expose globally for convenience
