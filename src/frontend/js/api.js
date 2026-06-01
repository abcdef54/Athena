export const API_BASE_URL = 'http://127.0.0.1:8000';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

export async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders = {};
    if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

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

        if (response.status === 204) {
            return null;
        }

        if (!response.ok) {
            let errorMessage = `API Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
            }
            throw new ApiError(errorMessage, response.status);
        }

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

    register: async (email, password) => {
        return await fetchAPI('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    getGoogleAuthorizeUrl: async () => {
        return await fetchAPI('/auth/google/authorize', {
            credentials: 'include'
        });
    },

    googleCallback: async (code, state) => {
        return await fetchAPI(`/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
            credentials: 'include'
        });
    },

    getMe: async () => {
        return await fetchAPI('/users/me');
    },
    getConversations: async () => {
        return await fetchAPI('/conversation');
    },

    getConversation: async (id) => {
        return await fetchAPI(`/conversation/${id}`);
    },

    createConversation: async (userId, title = 'New Chat') => {
        return await fetchAPI('/conversation', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, title })
        });
    },

    renameConversation: async (id, newName) => {
        return await fetchAPI(`/conversation/${id}?new_name=${encodeURIComponent(newName)}`, {
            method: 'PATCH'
        });
    },

    deleteConversation: async (id) => {
        return await fetchAPI(`/conversation/${id}`, {
            method: 'DELETE'
        });
    },

    getConversationMessages: async (conversationId) => {
        return await fetchAPI(`/conversation/${conversationId}/messages`);
    },

    sendChatMessage: async (conversationId, content, deepThink = false, personality = 'general') => {
        return await fetchAPI('/chat', {
            method: 'POST',
            body: JSON.stringify({
                conversation_id: conversationId,
                content: content,
                deep_think: deepThink,
                personality: personality
            })
        });
    },


    getMessageSources: async (conversationId, messageId) => {
        return await fetchAPI(`/conversation/${conversationId}/messages/${messageId}/sources`);
    },


    uploadFile: async (conversationId, file, provider) => {
        const formData = new FormData();
        formData.append('file', file);

        return await fetchAPI(`/uploads?conversation_id=${conversationId}&provider=${provider}`, {
            method: 'POST',
            body: formData
        });
    },


    getGlobalAttachments: async () => {
        return await fetchAPI('/uploads');
    },


    getConversationAttachments: async (conversationId) => {
        return await fetchAPI(`/uploads/conversation/${conversationId}`);
    },


    deleteAttachment: async (conversationId, fileId, provider) => {
        return await fetchAPI(`/uploads/conversation/${conversationId}/${fileId}?provider=${provider}`, {
            method: 'DELETE'
        });
    }
};

window.api = api; // Expose globally for convenience
