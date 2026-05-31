export const API_BASE_URL = 'http://127.0.0.1:8000';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

export async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Setup default headers
    const defaultHeaders = {};
    if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
    }
    
    // Inject Authorization header if JWT token is stored locally
    const token = localStorage.getItem('athena_token');
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const fetchOptions = {
        ...options,
        credentials: 'include',
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, fetchOptions);
        
        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }
        
        if (!response.ok) {
            let errorMessage = `API Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // If response is not JSON
            }
            throw new ApiError(errorMessage, response.status);
        }
        
        // Return JSON if present
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
    }
}

export const api = {
    // 1. Auth email/password login
    login: async (username, password) => {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        
        return await fetchAPI('/auth/jwt/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });
    },

    // 2. Auth register
    register: async (email, password) => {
        return await fetchAPI('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    // 3. Google OAuth Authorize redirect
    getGoogleAuthorizeUrl: async () => {
        return await fetchAPI('/auth/google/authorize', {
            credentials: 'include'
        });
    },

    // 4. Google OAuth Callback
    googleCallback: async (code, state) => {
        return await fetchAPI(`/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
            credentials: 'include'
        });
    },

    // 5. Get current profile details
    getMe: async () => {
        return await fetchAPI('/users/me');
    },

    // 6. Conversations list
    getConversations: async () => {
        return await fetchAPI('/conversation');
    },

    // 7. Get single conversation
    getConversation: async (id) => {
        return await fetchAPI(`/conversation/${id}`);
    },

    // 8. Create conversation
    createConversation: async (userId, title = 'New Chat') => {
        return await fetchAPI('/conversation', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, title })
        });
    },

    // 9. Rename conversation
    renameConversation: async (id, newName) => {
        return await fetchAPI(`/conversation/${id}?new_name=${encodeURIComponent(newName)}`, {
            method: 'PATCH'
        });
    },

    // 10. Delete conversation
    deleteConversation: async (id) => {
        return await fetchAPI(`/conversation/${id}`, {
            method: 'DELETE'
        });
    },

    // 11. Load thread message history
    getConversationMessages: async (conversationId) => {
        return await fetchAPI(`/conversation/${conversationId}/messages`);
    },

    // 12. Send message prompt
    sendChatMessage: async (conversationId, content, deepThink = false) => {
        return await fetchAPI('/chat', {
            method: 'POST',
            body: JSON.stringify({
                conversation_id: conversationId,
                content: content,
                deep_think: deepThink
            })
        });
    },

    // 13. Fetch cited source documents for a message
    getMessageSources: async (conversationId, messageId) => {
        return await fetchAPI(`/conversation/${conversationId}/messages/${messageId}/sources`);
    },

    // 14. Upload document
    uploadFile: async (conversationId, file, provider) => {
        const formData = new FormData();
        formData.append('file', file);
        
        return await fetchAPI(`/uploads?conversation_id=${conversationId}&provider=${provider}`, {
            method: 'POST',
            body: formData
        });
    },

    // 15. Fetch global files
    getGlobalAttachments: async () => {
        return await fetchAPI('/uploads');
    },

    // 16. Fetch thread files
    getConversationAttachments: async (conversationId) => {
        return await fetchAPI(`/uploads/conversation/${conversationId}`);
    },

    // 17. Delete file from storage
    deleteAttachment: async (conversationId, fileId, provider) => {
        return await fetchAPI(`/uploads/conversation/${conversationId}/${fileId}?provider=${provider}`, {
            method: 'DELETE'
        });
    }
};

window.api = api; // Expose globally for convenience
