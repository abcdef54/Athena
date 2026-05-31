// Handles sidebar logic
const conversations = {
    list: [],
    activeId: null,

    init: async () => {
        const newBtn = document.getElementById('newChatBtn');
        newBtn.addEventListener('click', () => conversations.createNew());
        
        // Retrieve last active
        const savedId = localStorage.getItem('activeConversationId');
        
        await conversations.loadAll();
        
        if (savedId && conversations.list.find(c => c.id === savedId)) {
            conversations.select(savedId);
        } else if (conversations.list.length > 0) {
            // Don't auto select, leave empty state or select first
            // We leave empty state for better UX, or select first depending on preference
        }
    },

    loadAll: async () => {
        const loader = document.getElementById('sidebarLoader');
        const emptyState = document.getElementById('sidebarEmpty');
        const ul = document.getElementById('conversationList');
        
        loader.classList.remove('hidden');
        ul.innerHTML = '';
        emptyState.classList.add('hidden');
        
        try {
            const data = await window.api.getConversations();
            conversations.list = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            if (conversations.list.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                conversations.renderList();
            }
        } catch (error) {
            window.ui.showToast('Failed to load conversations');
        } finally {
            loader.classList.add('hidden');
        }
    },

    renderList: () => {
        const ul = document.getElementById('conversationList');
        ul.innerHTML = '';
        
        conversations.list.forEach(conv => {
            const li = document.createElement('li');
            li.className = `conversation-item ${conv.id === conversations.activeId ? 'active' : ''}`;
            li.dataset.id = conv.id;
            
            li.innerHTML = `
                <svg class="conv-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="conv-title">${conv.title || 'New Conversation'}</span>
            `;
            
            li.addEventListener('click', () => conversations.select(conv.id));
            ul.appendChild(li);
        });
    },

    createNew: async () => {
        try {
            const newConv = await window.api.createConversation('New Chat');
            conversations.list.unshift(newConv);
            conversations.renderList();
            conversations.select(newConv.id);
        } catch (error) {
            window.ui.showToast('Failed to create new chat');
        }
    },

    select: async (id) => {
        conversations.activeId = id;
        localStorage.setItem('activeConversationId', id);
        
        // Update UI
        conversations.renderList();
        
        const conv = conversations.list.find(c => c.id === id);
        if (conv) {
            document.getElementById('chatTitle').textContent = conv.title || 'Chat';
        }
        
        // Load messages
        await window.chat.loadForConversation(id);
        
        // Close mobile sidebar if open
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            if (backdrop) backdrop.classList.remove('show');
        }
    }
};

window.conversations = conversations;
