import { auth } from './auth.js';
import { chat } from './chat.js';
import { attachments } from './attachments.js';
import { ui } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize core layouts & toggles
    ui.setupMobileMenu();
    chat.init();
    attachments.init();

    // Bind Document Drawer Toggles
    const drawerToggleBtn = document.getElementById('drawerToggleBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');

    if (drawerToggleBtn) {
        drawerToggleBtn.addEventListener('click', () => {
            ui.toggleDrawer();
        });
    }

    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', () => {
            ui.closeDrawer();
        });
    }

    // 2. Setup auth panel tab switches
    const authToggleLink = document.getElementById('authToggleLink');
    const authToggleText = document.getElementById('authToggleText');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (authToggleLink) {
        authToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            const isLoginVisible = !loginForm.classList.contains('hidden');
            if (isLoginVisible) {
                // Switch to Register
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                authToggleText.textContent = "Already have an account? ";
                authToggleLink.textContent = "Sign In";
            } else {
                // Switch to Login
                registerForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                authToggleText.textContent = "Don't have an account? ";
                authToggleLink.textContent = "Sign Up";
            }
        });
    }

    // 3. Form Submit Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const pass = document.getElementById('loginPassword').value;
            
            // Show submit loading
            const btn = loginForm.querySelector('.auth-submit-btn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<div class="loader" style="width:16px; height:16px; margin:0 auto;"></div>`;

            try {
                const user = await auth.login(email, pass);
                ui.showToast(`Logged in as ${user.email}`, 'success');
                bootstrapApp(user);
            } catch (error) {
                ui.showToast(error.message || 'Login failed. Please check your credentials.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value.trim();
            const pass = document.getElementById('registerPassword').value;

            const btn = registerForm.querySelector('.auth-submit-btn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<div class="loader" style="width:16px; height:16px; margin:0 auto;"></div>`;

            try {
                await auth.register(email, pass);
                ui.showToast('Account created successfully! Logging you in...', 'success');
                
                // Automate login step
                const user = await auth.login(email, pass);
                bootstrapApp(user);
            } catch (error) {
                ui.showToast(error.message || 'Registration failed. Try a different email address.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // Google Login button click trigger
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            googleLoginBtn.disabled = true;
            const original = googleLoginBtn.innerHTML;
            googleLoginBtn.innerHTML = `<div class="loader" style="width:16px; height:16px; margin:0 auto;"></div>`;
            
            try {
                await auth.initiateGoogleLogin();
            } catch (err) {
                googleLoginBtn.disabled = false;
                googleLoginBtn.innerHTML = original;
                ui.showToast('Could not initiate Google Auth redirect');
            }
        });
    }

    // Logout button click trigger
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.logout();
            chat.resetToWelcome();
            showAuthOverlay();
            ui.showToast('Logged out of session', 'success');
        });
    }

    // 4. Check for Google OAuth callback parameters on load
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
        showAuthOverlay();
        const card = document.querySelector('.auth-card');
        const originalContent = card.innerHTML;
        card.innerHTML = `
            <div class="auth-logo">✧ Athena 2.0</div>
            <div class="loader" style="width:40px; height:40px; margin:30px auto;"></div>
            <div class="auth-subtitle" style="color:var(--accent-cyan);">Completing Google Authentication Handshake...</div>
        `;
        
        try {
            const user = await auth.handleGoogleCallback();
            if (user) {
                ui.showToast(`Google authenticated successfully!`, 'success');
                // Re-render auth-card HTML elements structure
                card.innerHTML = originalContent;
                bootstrapApp(user);
                return;
            }
        } catch (error) {
            console.error('Google callback error:', error);
            ui.showToast('Google login token sync failed. Returning to standard credentials.');
            // Clean URL query parameters
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
        // Restores HTML card layouts
        card.innerHTML = originalContent;
        // Rebind OAuth callback tab
        window.location.reload();
        return;
    }

    // 5. Normal session validation check on load
    const activeUser = await auth.checkSession();
    if (activeUser) {
        bootstrapApp(activeUser);
    } else {
        showAuthOverlay();
    }
});

// Reveal Login Splash Overlay
function showAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.remove('hidden');
}

// Fade out Login Overlay and Boot conversational elements
function bootstrapApp(user) {
    const overlay = document.getElementById('authOverlay');
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.style.opacity = '1';
    }, 400);

    // Sync profile badges
    document.getElementById('userEmail').textContent = user.email || 'user@local';
    document.getElementById('userAvatar').textContent = (user.email || 'U').substring(0,1).toUpperCase();

    // Fetch conversation thread histories
    chat.loadConversations().then(() => {
        // Attempt restoring last active conversation selection if available in localStorage
        const savedId = localStorage.getItem('activeConversationId');
        if (savedId && chat.conversations.find(c => c.id === savedId)) {
            chat.selectConversation(savedId);
        } else {
            chat.resetToWelcome();
        }
    });
}
