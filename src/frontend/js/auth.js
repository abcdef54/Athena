import { api } from './api.js';

export const auth = {
    user: null,

    // Save token to localStorage
    setToken: (token) => {
        localStorage.setItem('athena_token', token);
    },

    // Get token from localStorage
    getToken: () => {
        return localStorage.getItem('athena_token');
    },

    // Clear session details
    clearToken: () => {
        localStorage.removeItem('athena_token');
        localStorage.removeItem('activeConversationId');
        auth.user = null;
    },

    // Handle login using API and save token
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

    // Handle register using API
    register: async (email, password) => {
        return await api.register(email, password);
    },

    // Check active session by fetching profile details
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

    // Trigger Google OAuth authorize redirect handshake
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

    // Capture OAuth callback parameters and authenticate session
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

                    // Clean URL parameters by replacing state without query params
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

    // Log out of session
    logout: async () => {
        try {
            // Optional call to backend logout (best-effort)
            await fetchAPI('/auth/jwt/logout', { method: 'POST' }).catch(() => { });
        } catch (e) { }
        auth.clearToken();
    }
};

window.auth = auth; // Expose globally for convenience
