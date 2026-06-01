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
    personality: 'general',
    deletingConversationId: null,

    init: () => {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const deepThinkToggle = document.getElementById('deepThinkToggle');
        const newChatBtn = document.getElementById('newChatBtn');
        const personalitySelect = document.getElementById('personalitySelect');

        // Input text auto-resize
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            const newHeight = Math.min(input.scrollHeight, 150);
            input.style.height = newHeight + 'px';
            sendBtn.disabled = input.value.trim().length === 0 || chat.isWaiting;
        });

        // Keydown handling
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

        // Deep Think
        deepThinkToggle.addEventListener('change', (e) => {
            chat.deepThink = e.target.checked;
            ui.showToast(`Deep Think ${chat.deepThink ? 'Enabled' : 'Disabled'}`, 'success');
        });

        // Personality
        if (personalitySelect) {
            personalitySelect.addEventListener('change', (e) => {
                chat.personality = e.target.value;
                ui.showToast(`Personality set to: ${chat.personality.toUpperCase()}`, 'success');
            });
        }

        // Deletion modal custom event listeners
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const deleteModal = document.getElementById('deleteModal');

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => chat.closeDeleteModal());
        }
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => chat.closeDeleteModal());
        }
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => chat.executeDelete());
        }
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    chat.closeDeleteModal();
                }
            });
        }

        // Sidebar new chat trigger
        newChatBtn.addEventListener('click', () => chat.createNewChat());

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
                <div class="conv-actions">
                    <button class="conv-action-btn rename-btn" title="Rename Chat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                        </svg>
                    </button>
                    <button class="conv-action-btn delete-btn" title="Delete Chat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            li.addEventListener('click', (e) => {
                // If clicking active element, do not switch if input is active
                if (li.querySelector('.conversation-rename-input')) return;
                chat.selectConversation(conv.id);
            });

            // Bind inline action triggers
            const renameBtn = li.querySelector('.rename-btn');
            const deleteBtn = li.querySelector('.delete-btn');

            if (renameBtn) {
                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    chat.startInlineRename(conv.id, li);
                });
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    chat.openDeleteModal(conv.id);
                });
            }

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
        const chatTitle = document.getElementById('chatTitle');

        if (conv) {
            chatTitle.textContent = conv.title || 'Chat';
        } else {
            chatTitle.textContent = 'Select a conversation';
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
                ${chat.deepThink ? '<div style="font-size:0.75rem; color:var(--accent-primary); margin-top:4px; font-weight:500; text-transform:uppercase; letter-spacing:0.5px; text-shadow:0 0 6px rgba(0,162,255,0.3);">Athena is thinking...</div>' : ''}
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
            const personalitySelect = document.getElementById('personalitySelect');
            if (personalitySelect) personalitySelect.disabled = true;
            chat.showTypingIndicator();
        } else {
            input.disabled = false;
            deepThinkToggle.disabled = false;
            const personalitySelect = document.getElementById('personalitySelect');
            if (personalitySelect) personalitySelect.disabled = false;
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
            if (!chat.activeConversationId) {
                const initialTitle = content.length > 20 ? content.substring(0, 20) + "..." : content;
                const newConv = await chat.createNewChat(initialTitle);
                if (!newConv) throw new Error("Could not initialize thread");
            }

            const activeId = chat.activeConversationId;

            const tempId = 'temp-' + Date.now();
            const userMsg = {
                id: tempId,
                conversation_id: activeId,
                content: content,
                role: 'user',
                created_at: new Date().toISOString()
            };
            await chat.appendMessage(userMsg);

            const responseMsg = await api.sendChatMessage(activeId, content, chat.deepThink, chat.personality);

            chat.setWaitingState(false);

            await chat.appendMessage(responseMsg);
        } catch (error) {
            chat.setWaitingState(false);
            ui.showToast(error.message || 'Failed to send message');
        }
    },

    // Starts in-line editable content renaming
    startInlineRename: (id, li) => {
        const titleSpan = li.querySelector('.conv-title');
        const currentTitle = titleSpan.textContent;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'conversation-rename-input';
        input.value = currentTitle;

        const convIcon = li.querySelector('.conv-icon');
        const convActions = li.querySelector('.conv-actions');

        if (convIcon) convIcon.style.display = 'none';
        if (convActions) convActions.style.display = 'none';
        titleSpan.style.display = 'none';

        li.appendChild(input);
        input.focus();
        input.select();

        let finished = false;

        const commitRename = async () => {
            if (finished) return;
            finished = true;

            const newTitle = input.value.trim();
            if (newTitle && newTitle !== currentTitle) {
                try {
                    const updated = await api.renameConversation(id, newTitle);
                    const conv = chat.conversations.find(c => c.id === id);
                    if (conv) {
                        conv.title = updated.title;
                        if (id === chat.activeConversationId) {
                            document.getElementById('chatTitle').textContent = updated.title;
                        }
                    }
                    ui.showToast('Conversation renamed successfully', 'success');
                } catch (error) {
                    ui.showToast('Failed to rename conversation');
                }
            }

            chat.renderConversationsList();
        };

        const cancelRename = () => {
            if (finished) return;
            finished = true;
            chat.renderConversationsList();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitRename();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelRename();
            }
        });

        input.addEventListener('blur', () => {
            commitRename();
        });
    },

    // Handles active deletion modal trigger
    openDeleteModal: (id) => {
        chat.deletingConversationId = id;
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    closeDeleteModal: () => {
        chat.deletingConversationId = null;
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    executeDelete: async () => {
        const id = chat.deletingConversationId;
        if (!id) return;

        try {
            await api.deleteConversation(id);
            const index = chat.conversations.findIndex(c => c.id === id);
            if (index !== -1) {
                chat.conversations.splice(index, 1);
            }

            if (id === chat.activeConversationId) {
                chat.resetToWelcome();
            } else {
                chat.renderConversationsList();
            }

            ui.showToast('Conversation deleted', 'success');
        } catch (error) {
            ui.showToast('Failed to delete conversation');
        } finally {
            chat.closeDeleteModal();
        }
    }
};

window.chat = chat;
