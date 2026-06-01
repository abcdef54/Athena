import { api } from './api.js';

export const auth = {
    user: null,

    setToken: (token) => {
        localStorage.setItem('athena_token', token);
    },

    getToken: () => {
        return localStorage.getItem('athena_token');
    },

    clearToken: () => {
        localStorage.removeItem('athena_token');
        localStorage.removeItem('activeConversationId');
        auth.user = null;
    },

    login: async (email, password) => {
        try {
            const data = await api.login(email, password);
            if (data && data.access_token) {
                auth.setToken(data.access_token);
                // Fetch user details immediately to verify session
                auth.user = await api.getMe();
                return auth.user;
            }
            throw new Error("Failed to capture access token");
        } catch (error) {
            auth.clearToken();
            throw error;
        }
    },

    register: async (email, password) => {
        return await api.register(email, password);
    },

    checkSession: async () => {
        const token = auth.getToken();
        if (!token) {
            return null;
        }
        try {
            auth.user = await api.getMe();
            return auth.user;
        } catch (error) {
            console.warn("Session check failed, clearing token...", error);
            auth.clearToken();
            return null;
        }
    },

    initiateGoogleLogin: async () => {
        try {
            const data = await api.getGoogleAuthorizeUrl();
            if (data && data.authorization_url) {
                window.location.href = data.authorization_url;
            } else {
                throw new Error("Could not retrieve authorization URL from backend");
            }
        } catch (error) {
            console.error("Google login initiation failed:", error);
            throw error;
        }
    },

    handleGoogleCallback: async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state) {
            try {
                const data = await api.googleCallback(code, state);

                if (data && data.access_token) {
                    auth.setToken(data.access_token);
                    auth.user = await api.getMe();

                    const cleanUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);

                    return auth.user;
                }
                throw new Error("OAuth token sync failed");
            } catch (error) {
                auth.clearToken();
                throw error;
            }
        }
        return null;
    },

    logout: async () => {
        try {
            await fetchAPI('/auth/jwt/logout', { method: 'POST' }).catch(() => { });
        } catch (e) { }
        auth.clearToken();
    }
};

window.auth = auth;