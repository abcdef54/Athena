// LocalMind frontend — vanilla JS client for the FastAPI backend.
// Auth: fastapi-users JWT (bearer token in localStorage).
// State is kept in a single `state` object; rendering is imperative via small render functions.

const DEFAULT_API = "http://127.0.0.1:8000";

const PERSONALITIES = [
  { id: "general", label: "General", sub: "Balanced default assistant" },
  { id: "coder", label: "Coder", sub: "Programming-focused" },
  { id: "researcher", label: "Researcher", sub: "Cites sources, deep reasoning" },
  { id: "assistant", label: "Assistant", sub: "Task-oriented helper" },
  { id: "genz", label: "Gen-Z", sub: "Casual and slangy" },
  { id: "human", label: "Human", sub: "Conversational and warm" },
  { id: "unhinged", label: "Unhinged", sub: "No filter mode" },
];

const TOOLS = [
  { id: "retrieve", label: "Retrieve Context", icon: "database" },
  { id: "google", label: "Google Search", icon: "search" },
  { id: "fetch", label: "Fetch Web Page", icon: "link" },
  { id: "emails", label: "Read Emails", icon: "mail" },
  { id: "deepthink", label: "Deep Think Mode", icon: "brain" },
];

// Default model placeholders — edit in localStorage or via Settings.
const DEFAULT_MODELS = [
  { id: "gemini-3-flash", label: "Gemini 3.5 Flash", sub: "Fast, cheap" },
  { id: "gemini-3-pro", label: "Gemini 3.1 Pro", sub: "High quality" },
  { id: "gpt-5", label: "GPT-5", sub: "Frontier" },
];

const state = {
  apiBase: localStorage.getItem("lm.apiBase") || DEFAULT_API,
  token: localStorage.getItem("lm.token") || null,
  user: null,
  threads: [],
  activeThreadId: null,
  messages: [],
  loadingMessages: false,
  sending: false,
  personality: localStorage.getItem("lm.personality") || "general",
  model: localStorage.getItem("lm.model") || DEFAULT_MODELS[0].id,
  deepThink: localStorage.getItem("lm.deepThink") === "1",
  attachmentsOpen: false,
  sidebarOpen: true,
  attachments: [],
};

// ---------- Icons (inline SVG) ----------
const ICONS = {
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l14-7-5 14-3-6-6-1z"/></svg>',
  clip: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11l-9 9a5 5 0 1 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 1 1-3-3l8-8"/></svg>',
  caret: '<svg class="caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>',
  brain: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 3a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5 3 3 0 0 0 2 5v0a3 3 0 0 0 3 3h0V3zM15 3a3 3 0 0 1 3 3v0a3 3 0 0 1 2 5 3 3 0 0 1-2 5v0a3 3 0 0 1-3 3h0V3z"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5.4 5.4L21 13l-8 8-2-2 8-8-1.3-0.9a4 4 0 0 0-5.4-5.4L11 5l2 2-2 2-2-2 1.3-1.3z"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>',
  check: '<svg class="check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
  upload: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M5 11l7-7 7 7M4 20h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2L5 5.8l-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  database: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/></svg>',
};

// ---------- API helpers ----------
async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData) && opts.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

  const res = await fetch(state.apiBase + path, { ...opts, headers, credentials: "include" });
  if (res.status === 401) {
    logout();
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try { const j = await res.json(); detail = j.detail || JSON.stringify(j); } catch { }
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

const API = {
  login: (email, password) => {
    const body = new URLSearchParams({ username: email, password, grant_type: "password" });
    return fetch(state.apiBase + "/auth/jwt/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }).then(async (r) => {
      if (!r.ok) {
        let msg = "Login failed";
        try { const j = await r.json(); msg = j.detail || msg; } catch { }
        throw new Error(typeof msg === "string" ? msg : "Login failed");
      }
      return r.json();
    });
  },
  register: (email, password) => api("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => api("/users/me"),

  googleAuthorize: () => api("/auth/google/authorize"),
  googleCallback: (code, state) =>
    api(`/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`),

  listConversations: () => api("/conversation"),
  createConversation: (title) => api("/conversation", { method: "POST", body: JSON.stringify({ title }) }),
  getConversationMessages: (id) => api(`/conversation/${id}/messages`),
  renameConversation: (id, name) => api(`/conversation/${id}?new_name=${encodeURIComponent(name)}`, { method: "PATCH" }),
  deleteConversation: (id) => api(`/conversation/${id}`, { method: "DELETE" }),

  chat: (payload) => api("/chat", { method: "POST", body: JSON.stringify(payload) }),

  listAttachments: (conversationId) => api(`/uploads/conversation/${conversationId}`),
  uploadFile: (conversationId, file, provider = "local") => {
    const fd = new FormData();
    fd.append("file", file);
    return api(`/uploads?conversation_id=${conversationId}&provider=${provider}`, { method: "POST", body: fd });
  },
  deleteFile: (conversationId, fileId, provider = "local") =>
    api(`/uploads/conversation/${conversationId}/${fileId}?provider=${provider}`, { method: "DELETE" }),
};

// ---------- DOM root render ----------
function $(html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Tiny markdown: code fences, inline code, bold, italic, newlines. Enough for chat output.
function renderMarkdown(text) {
  if (!text) return "";
  let out = escapeHtml(text);
  out = out.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, _lang, code) => `<pre><code>${code}</code></pre>`);
  out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<em>$2</em>");
  return out;
}

function appRoot() { return document.getElementById("root"); }

function render() {
  if (!state.token) { renderAuth(); return; }
  renderApp();
}

// ---------- Auth screen ----------
function renderAuth() {
  const root = appRoot();
  root.innerHTML = "";
  const card = $(`
    <div class="auth-screen">
      <div class="auth-card glass">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom: 16px;">
          <div class="brand-dot"></div>
          <div style="font-weight:600;">LocalMind</div>
        </div>
        <h2 id="authTitle">Welcome back</h2>
        <div class="sub" id="authSub">Sign in to your account</div>
        <form id="authForm">
          <label>Email</label>
          <input name="email" type="email" required autocomplete="email" />
          <label>Password</label>
          <input name="password" type="password" required autocomplete="current-password" minlength="6" />
          <button type="submit" class="auth-btn" id="authSubmit">Sign in</button>
        </form>
        <div class="auth-divider"><span>or</span></div>
        <button type="button" class="google-btn" id="googleBtn">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.1z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13.1-5l-6.1-5c-2 1.4-4.5 2.2-7 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.1 5c-.4.4 6.6-4.8 6.6-14.3 0-1.2-.1-2.3-.4-3.5z"/></svg>
          Continue with Google
        </button>
        <div class="auth-toggle">
          <span id="authToggleText">No account?</span>
          <a id="authToggle">Create one</a>
        </div>
        <div class="auth-toggle">
          <a id="openSettings" style="color: var(--muted);">${ICONS.settings} Backend settings</a>
        </div>
        <div id="authError" class="auth-error hidden"></div>
      </div>
    </div>
  `);

  let isRegister = false;
  const updateMode = () => {
    card.querySelector("#authTitle").textContent = isRegister ? "Create account" : "Welcome back";
    card.querySelector("#authSub").textContent = isRegister ? "Start chatting in seconds" : "Sign in to your account";
    card.querySelector("#authSubmit").textContent = isRegister ? "Create account" : "Sign in";
    card.querySelector("#authToggleText").textContent = isRegister ? "Have an account?" : "No account?";
    card.querySelector("#authToggle").textContent = isRegister ? "Sign in" : "Create one";
  };

  card.querySelector("#authToggle").addEventListener("click", () => { isRegister = !isRegister; updateMode(); });
  card.querySelector("#openSettings").addEventListener("click", openSettingsModal);

  card.querySelector("#googleBtn").addEventListener("click", async () => {
    const err = card.querySelector("#authError");
    err.classList.add("hidden");
    try {
      const res = await API.googleAuthorize();
      const url = res && (res.authorization_url || res.url);
      if (!url) throw new Error("No authorization URL returned");
      window.location.href = url;
    } catch (e) {
      err.textContent = e.message || "Could not start Google sign-in.";
      err.classList.remove("hidden");
    }
  });

  card.querySelector("#authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;
    const btn = card.querySelector("#authSubmit");
    const err = card.querySelector("#authError");
    err.classList.add("hidden");
    btn.disabled = true; btn.textContent = "Please wait…";
    try {
      if (isRegister) await API.register(email, password);
      const tokenRes = await API.login(email, password);
      state.token = tokenRes.access_token;
      localStorage.setItem("lm.token", state.token);
      await afterLogin();
    } catch (e) {
      err.textContent = e.message || "Something went wrong.";
      err.classList.remove("hidden");
    } finally {
      btn.disabled = false; updateMode();
    }
  });

  root.appendChild(card);
}

async function afterLogin() {
  try { state.user = await API.me(); } catch { }
  await loadThreads();
  if (state.threads.length === 0) {
    await createNewThread();
  } else {
    await selectThread(state.threads[0].id);
  }
  render();
}

function logout() {
  state.token = null; state.user = null;
  state.threads = []; state.activeThreadId = null; state.messages = [];
  localStorage.removeItem("lm.token");
  render();
}

// ---------- App shell ----------
function renderApp() {
  const root = appRoot();
  root.innerHTML = "";

  const shell = $(`
    <div class="app ${state.attachmentsOpen ? "with-attachments" : ""} ${state.sidebarOpen ? "" : "no-sidebar"}">
      <aside class="sidebar glass ${state.sidebarOpen ? "open" : ""}">
        <div class="sidebar-head">
          <div class="brand"><div class="brand-dot"></div>LocalMind</div>
          <button class="icon-btn" id="toggleSidebar" title="Collapse">${ICONS.menu}</button>
        </div>
        <button class="new-chat-btn" id="newChat">${ICONS.plus} New chat</button>
        <div class="thread-list" id="threadList"></div>
        <div class="sidebar-foot">
          <div class="user-chip">
            <div class="avatar">${escapeHtml((state.user?.email || "?").slice(0, 1).toUpperCase())}</div>
            <div class="user-email">${escapeHtml(state.user?.email || "")}</div>
          </div>
          <button class="icon-btn" id="openSettings" title="Settings">${ICONS.settings}</button>
          <button class="icon-btn" id="logoutBtn" title="Sign out">${ICONS.logout}</button>
        </div>
      </aside>

      <main class="main glass">
        <div class="topbar">
          <button class="icon-btn" id="showSidebar" title="Menu" style="${state.sidebarOpen ? "display:none" : ""}">${ICONS.menu}</button>
          <h1 id="convTitle"></h1>
          <div class="topbar-right">
            <button class="icon-btn" id="openAttachments" title="Attachments">${ICONS.clip}</button>
          </div>
        </div>
        <div class="conversation" id="conversation"></div>
        <div class="composer-wrap">
          <div class="composer glass">
            <textarea id="composerInput" rows="1" placeholder="Ask LocalMind anything…"></textarea>
            <div class="composer-toolbar">
              <button class="tool-chip" id="toolsBtn">${ICONS.wrench}<span>Tools</span>${ICONS.caret}</button>
              <button class="tool-chip" id="personalityBtn">${ICONS.sparkles}<span id="personalityLabel"></span>${ICONS.caret}</button>
              <button class="tool-chip" id="modelBtn">${ICONS.cpu}<span id="modelLabel"></span>${ICONS.caret}</button>
              <button class="tool-chip ${state.deepThink ? "active" : ""}" id="deepThinkBtn">${ICONS.brain}<span>Deep Think</span></button>
              <button class="tool-chip" id="clipBtn" title="Attachments">${ICONS.clip}</button>
              <div class="toolbar-spacer"></div>
              <button class="send-btn" id="sendBtn" title="Send">${ICONS.send}</button>
            </div>
          </div>
        </div>
      </main>

      <aside class="attachments glass" id="attachmentsPanel" style="${state.attachmentsOpen ? "" : "display:none"}"></aside>
    </div>
  `);

  root.appendChild(shell);

  // Wire up handlers
  shell.querySelector("#newChat").addEventListener("click", createNewThread);
  shell.querySelector("#logoutBtn").addEventListener("click", logout);
  shell.querySelector("#openSettings").addEventListener("click", openSettingsModal);
  shell.querySelector("#toggleSidebar").addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen; render();
  });
  shell.querySelector("#showSidebar").addEventListener("click", () => {
    state.sidebarOpen = true; render();
  });
  shell.querySelector("#openAttachments").addEventListener("click", toggleAttachments);
  shell.querySelector("#clipBtn").addEventListener("click", toggleAttachments);

  const ta = shell.querySelector("#composerInput");
  ta.addEventListener("input", autoGrow);
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  shell.querySelector("#sendBtn").addEventListener("click", sendMessage);

  shell.querySelector("#toolsBtn").addEventListener("click", (e) => openPopover(e.currentTarget, renderToolsPopover()));
  shell.querySelector("#personalityBtn").addEventListener("click", (e) => openPopover(e.currentTarget, renderPersonalityPopover()));
  shell.querySelector("#modelBtn").addEventListener("click", (e) => openPopover(e.currentTarget, renderModelPopover()));
  shell.querySelector("#deepThinkBtn").addEventListener("click", () => {
    state.deepThink = !state.deepThink;
    localStorage.setItem("lm.deepThink", state.deepThink ? "1" : "0");
    render();
  });

  renderThreadList();
  renderConversation();
  renderAttachmentsPanel();
  updateChipLabels();
  ta.focus();
}

function updateChipLabels() {
  const p = PERSONALITIES.find((x) => x.id === state.personality) || PERSONALITIES[0];
  const m = (getModels().find((x) => x.id === state.model)) || getModels()[0];
  const pl = document.getElementById("personalityLabel");
  const ml = document.getElementById("modelLabel");
  if (pl) pl.textContent = p.label;
  if (ml) ml.textContent = m.label;
}

function autoGrow(e) {
  const ta = e.target;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
}

// ---------- Threads ----------
async function loadThreads() {
  try { state.threads = await API.listConversations(); }
  catch (e) { console.error(e); state.threads = []; }
}

async function createNewThread() {
  try {
    const conv = await API.createConversation("New chat");
    state.threads.unshift(conv);
    await selectThread(conv.id);
    render();
  } catch (e) { alert(e.message); }
}

async function selectThread(id) {
  state.activeThreadId = id;
  state.messages = [];
  state.loadingMessages = true;
  render();
  try {
    state.messages = await API.getConversationMessages(id);
    if (state.attachmentsOpen) await loadAttachments();
  } catch (e) { console.error(e); }
  state.loadingMessages = false;
  render();
}

async function renameThread(id) {
  const t = state.threads.find((x) => x.id === id);
  if (!t) return;
  openPromptModal({
    title: "Rename conversation",
    label: "Conversation name",
    initial: t.title || "",
    placeholder: "New name…",
    confirmText: "Rename",
    onSave: async (name) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed === t.title) return;
      try {
        const updated = await API.renameConversation(id, trimmed);
        Object.assign(t, updated);
        render();
      } catch (e) { alert(e.message); }
    },
  });
}

async function deleteThread(id) {
  openConfirmModal({
    title: "Delete conversation?",
    body: "This will permanently remove the conversation and its messages.",
    confirmText: "Delete",
    danger: true,
    onConfirm: async () => {
      try {
        await API.deleteConversation(id);
        state.threads = state.threads.filter((t) => t.id !== id);
        if (state.activeThreadId === id) {
          if (state.threads.length) await selectThread(state.threads[0].id);
          else await createNewThread();
        }
        render();
      } catch (e) { alert(e.message); }
    },
  });
}

function renderThreadList() {
  const list = document.getElementById("threadList");
  if (!list) return;
  list.innerHTML = "";
  for (const t of state.threads) {
    const el = $(`
      <div class="thread ${t.id === state.activeThreadId ? "active" : ""}" data-id="${t.id}">
        <div class="thread-title">${escapeHtml(t.title || "Untitled")}</div>
        <div class="thread-actions">
          <button class="icon-btn" data-act="rename" title="Rename">${ICONS.edit}</button>
          <button class="icon-btn" data-act="delete" title="Delete">${ICONS.trash}</button>
        </div>
      </div>
    `);
    el.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "rename") { e.stopPropagation(); renameThread(t.id); return; }
      if (act === "delete") { e.stopPropagation(); deleteThread(t.id); return; }
      selectThread(t.id);
    });
    list.appendChild(el);
  }

  const title = document.getElementById("convTitle");
  const active = state.threads.find((t) => t.id === state.activeThreadId);
  if (title) title.textContent = active?.title || "";
}

// ---------- Conversation ----------
function renderConversation() {
  const conv = document.getElementById("conversation");
  if (!conv) return;
  conv.innerHTML = "";

  if (!state.messages.length && !state.sending) {
    conv.appendChild($(`
      <div class="empty-state">
        <h2>How can I help today?</h2>
        <p>Pick a personality, switch models, or just start typing. Attach documents from the paper-clip to ground the conversation.</p>
      </div>
    `));
    return;
  }

  for (const m of state.messages) appendMessage(conv, m);

  if (state.sending) {
    const wrap = $(`<div class="msg-wrap msg-assistant"><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div></div>`);
    conv.appendChild(wrap);
  }

  conv.scrollTop = conv.scrollHeight;
}

function appendMessage(conv, m) {
  const isUser = m.role === "user";
  const wrap = $(`
    <div class="msg-wrap ${isUser ? "msg-user" : "msg-assistant"}">
      <div class="bubble"></div>
    </div>
  `);
  wrap.querySelector(".bubble").innerHTML = isUser ? escapeHtml(m.content) : renderMarkdown(m.content);
  conv.appendChild(wrap);
}

async function sendMessage() {
  const ta = document.getElementById("composerInput");
  const text = ta.value.trim();
  if (!text || state.sending || !state.activeThreadId) return;

  ta.value = ""; ta.style.height = "auto";

  state.messages.push({ id: "tmp-" + Date.now(), role: "user", content: text });
  state.sending = true;
  renderConversation();

  try {
    const res = await API.chat({
      conversation_id: state.activeThreadId,
      content: text,
      personality: state.personality,
      deep_think: state.deepThink,
    });
    state.messages.push(res);

    // Rename empty thread to first user message
    const active = state.threads.find((t) => t.id === state.activeThreadId);
    if (active && (active.title === "New chat" || !active.title)) {
      const newTitle = text.length > 40 ? text.slice(0, 40) + "…" : text;
      active.title = newTitle;
      API.renameConversation(active.id, newTitle).catch(() => { });
    }
  } catch (e) {
    state.messages.push({ id: "err-" + Date.now(), role: "assistant", content: `⚠️ ${e.message}` });
  } finally {
    state.sending = false;
    renderConversation();
    renderThreadList();
    document.getElementById("composerInput")?.focus();
  }
}

// ---------- Popovers ----------
let openPopoverEl = null;
function closePopover() {
  if (openPopoverEl) { openPopoverEl.remove(); openPopoverEl = null; }
  document.removeEventListener("click", onDocClickClosePopover, true);
}
function onDocClickClosePopover(e) {
  if (openPopoverEl && !openPopoverEl.contains(e.target)) closePopover();
}
function openPopover(anchor, content) {
  closePopover();
  const pop = $(`<div class="popover glass"></div>`);
  pop.appendChild(content);
  document.body.appendChild(pop);

  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(window.innerWidth - 250, r.left)) + "px";
  pop.style.bottom = (window.innerHeight - r.top + 8) + "px";
  requestAnimationFrame(() => pop.classList.add("open"));
  openPopoverEl = pop;
  setTimeout(() => document.addEventListener("click", onDocClickClosePopover, true), 0);
}

function renderToolsPopover() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="popover-title">Agent tools (display only)</div>`;
  for (const t of TOOLS) {
    const item = $(`
      <div class="popover-item disabled">
        <span class="pi-icon">${ICONS[t.icon] || ICONS.wrench}</span>
        <span class="pi-text"><span>${t.label}</span></span>
      </div>
    `);
    wrap.appendChild(item);
  }
  return wrap;
}

function renderPersonalityPopover() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="popover-title">Personality</div>`;
  for (const p of PERSONALITIES) {
    const item = $(`
      <div class="popover-item ${state.personality === p.id ? "selected" : ""}">
        <span class="pi-icon">${ICONS.sparkles}</span>
        <span class="pi-text"><span>${p.label}</span><span class="pi-sub">${p.sub}</span></span>
        ${ICONS.check}
      </div>
    `);
    item.addEventListener("click", () => {
      state.personality = p.id;
      localStorage.setItem("lm.personality", p.id);
      closePopover(); updateChipLabels();
    });
    wrap.appendChild(item);
  }
  return wrap;
}

function getModels() {
  try {
    const raw = localStorage.getItem("lm.models");
    if (raw) return JSON.parse(raw);
  } catch { }
  return DEFAULT_MODELS;
}

function renderModelPopover() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="popover-title">Model</div>`;
  for (const m of getModels()) {
    const item = $(`
      <div class="popover-item ${state.model === m.id ? "selected" : ""}">
        <span class="pi-icon">${ICONS.cpu}</span>
        <span class="pi-text"><span>${escapeHtml(m.label)}</span>${m.sub ? `<span class="pi-sub">${escapeHtml(m.sub)}</span>` : ""}</span>
        ${ICONS.check}
      </div>
    `);
    item.addEventListener("click", () => {
      state.model = m.id;
      localStorage.setItem("lm.model", m.id);
      closePopover(); updateChipLabels();
    });
    wrap.appendChild(item);
  }
  return wrap;
}

// ---------- Attachments ----------
async function toggleAttachments() {
  state.attachmentsOpen = !state.attachmentsOpen;
  render();
  if (state.attachmentsOpen) await loadAttachments();
}

async function loadAttachments() {
  if (!state.activeThreadId) return;
  try { state.attachments = await API.listAttachments(state.activeThreadId); }
  catch (e) { console.error(e); state.attachments = []; }
  renderAttachmentsPanel();
}

function formatSize(n) {
  if (!n) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function renderAttachmentsPanel() {
  const panel = document.getElementById("attachmentsPanel");
  if (!panel || !state.attachmentsOpen) return;

  panel.innerHTML = "";
  const head = $(`
    <div class="attachments-head">
      <h3>Attachments</h3>
      <button class="icon-btn" id="closeAttach" title="Close">${ICONS.close}</button>
    </div>
  `);
  panel.appendChild(head);
  head.querySelector("#closeAttach").addEventListener("click", toggleAttachments);

  const drop = $(`
    <label class="drop-zone" id="dropZone">
      ${ICONS.upload}
      <div>Drop a file or click to upload</div>
      <input type="file" id="fileInput" style="display:none" />
    </label>
  `);
  panel.appendChild(drop);

  const fileInput = drop.querySelector("#fileInput");
  fileInput.addEventListener("change", (e) => {
    const f = e.target.files?.[0]; if (f) uploadFile(f);
    e.target.value = "";
  });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("dragover"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault(); drop.classList.remove("dragover");
    const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f);
  });

  const list = $(`<div class="file-list" id="fileList"></div>`);
  panel.appendChild(list);

  if (!state.attachments.length) {
    list.appendChild($(`<div style="text-align:center; color:var(--muted); font-size:13px; padding:18px;">No attachments yet</div>`));
  } else {
    for (const f of state.attachments) {
      const row = $(`
        <div class="file-item">
          <span class="pi-icon" style="color:var(--accent);">${ICONS.link}</span>
          <div class="file-info">
            <div class="file-name">${escapeHtml(f.file_name)}</div>
            <div class="file-size">${escapeHtml(f.file_type || "")} · ${formatSize(f.file_size)}</div>
          </div>
          <button class="icon-btn" data-id="${f.id}" title="Remove">${ICONS.trash}</button>
        </div>
      `);
      row.querySelector("[data-id]").addEventListener("click", () => removeFile(f.id, f.storage_provider || "local"));
      list.appendChild(row);
    }
  }
}

async function uploadFile(file) {
  if (!state.activeThreadId) return;
  try {
    await API.uploadFile(state.activeThreadId, file, "local");
    await loadAttachments();
  } catch (e) { alert(e.message); }
}

async function removeFile(id, provider) {
  openConfirmModal({
    title: "Remove file?",
    body: "This attachment will be removed from the conversation.",
    confirmText: "Remove",
    danger: true,
    onConfirm: async () => {
      try {
        await API.deleteFile(state.activeThreadId, id, provider);
        await loadAttachments();
      } catch (e) { alert(e.message); }
    },
  });
}

// ---------- Settings modal ----------
function openSettingsModal() {
  const backdrop = $(`
    <div class="modal-backdrop">
      <div class="modal glass">
        <h3>Settings</h3>
        <label>Backend API URL</label>
        <input id="apiUrl" type="url" value="${escapeHtml(state.apiBase)}" placeholder="http://127.0.0.1:8000" />
        <label>Models (JSON list of {id, label, sub})</label>
        <input id="modelsJson" type="text" value='${escapeHtml(localStorage.getItem("lm.models") || "")}' placeholder='[{"id":"gpt-5","label":"GPT-5"}]' />
        <div class="modal-actions">
          <button class="btn-secondary" id="cancelBtn">Cancel</button>
          <button class="btn-primary" id="saveBtn">Save</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(backdrop); });
  backdrop.querySelector("#cancelBtn").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#saveBtn").addEventListener("click", () => {
    const url = backdrop.querySelector("#apiUrl").value.trim().replace(/\/$/, "");
    if (url) { state.apiBase = url; localStorage.setItem("lm.apiBase", url); }
    const modelsRaw = backdrop.querySelector("#modelsJson").value.trim();
    if (modelsRaw) {
      try { JSON.parse(modelsRaw); localStorage.setItem("lm.models", modelsRaw); }
      catch { alert("Invalid JSON for models"); return; }
    } else {
      localStorage.removeItem("lm.models");
    }
    closeModal(backdrop);
    render();
  });
}

// ---------- Generic modal helpers ----------
function closeModal(backdrop) {
  if (!backdrop || backdrop.dataset.closing === "1") return;
  backdrop.dataset.closing = "1";
  backdrop.style.transition = "opacity 0.18s ease";
  backdrop.style.opacity = "0";
  const card = backdrop.querySelector(".modal");
  if (card) {
    card.style.transition = "transform 0.2s ease, opacity 0.18s ease";
    card.style.transform = "scale(0.96) translateY(6px)";
    card.style.opacity = "0";
  }
  setTimeout(() => backdrop.remove(), 200);
}

function openPromptModal({ title, label, initial = "", placeholder = "", confirmText = "Save", onSave }) {
  const backdrop = $(`
    <div class="modal-backdrop">
      <div class="modal glass prompt-modal">
        <h3>${escapeHtml(title)}</h3>
        <label>${escapeHtml(label)}</label>
        <input id="promptInput" type="text" value="${escapeHtml(initial)}" placeholder="${escapeHtml(placeholder)}" />
        <div class="modal-actions">
          <button class="btn-secondary" id="cancelBtn">Cancel</button>
          <button class="btn-primary" id="saveBtn">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(backdrop);
  const input = backdrop.querySelector("#promptInput");
  setTimeout(() => { input.focus(); input.select(); }, 50);

  const submit = async () => {
    const v = input.value;
    closeModal(backdrop);
    if (onSave) await onSave(v);
  };
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(backdrop); });
  backdrop.querySelector("#cancelBtn").addEventListener("click", () => closeModal(backdrop));
  backdrop.querySelector("#saveBtn").addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    else if (e.key === "Escape") { e.preventDefault(); closeModal(backdrop); }
  });
}

function openConfirmModal({ title, body, confirmText = "Confirm", danger = false, onConfirm }) {
  const dangerStyle = danger
    ? 'style="background: linear-gradient(135deg, var(--danger), #ff8aa0); color:#fff;"'
    : "";
  const backdrop = $(`
    <div class="modal-backdrop">
      <div class="modal glass">
        <h3>${escapeHtml(title)}</h3>
        <div style="color: var(--muted); font-size: 13px; line-height: 1.5;">${escapeHtml(body || "")}</div>
        <div class="modal-actions">
          <button class="btn-secondary" id="cancelBtn">Cancel</button>
          <button class="btn-primary" id="confirmBtn" ${dangerStyle}>${escapeHtml(confirmText)}</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(backdrop);
  const confirmBtn = backdrop.querySelector("#confirmBtn");
  setTimeout(() => confirmBtn.focus(), 50);

  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(backdrop); });
  backdrop.querySelector("#cancelBtn").addEventListener("click", () => closeModal(backdrop));
  confirmBtn.addEventListener("click", async () => {
    closeModal(backdrop);
    if (onConfirm) await onConfirm();
  });
  backdrop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal(backdrop);
  });
}

// ---------- Boot ----------
async function boot() {
  // 1. Handle Google OAuth callback: Google redirects here with ?code=...&state=...
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthState = params.get("state");

    if (code && oauthState) {
      // Show a loading state while we exchange the code
      renderAuth();

      // Clean the URL immediately so a refresh doesn't re-trigger
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      try {
        // Exchange the authorization code for a JWT via the backend
        const data = await API.googleCallback(code, oauthState);
        if (data && data.access_token) {
          state.token = data.access_token;
          localStorage.setItem("lm.token", state.token);
          await afterLogin();
          return;
        }
      } catch (e) {
        console.error("Google OAuth callback failed:", e);
      }
      // If we get here, the exchange failed — show login screen
      render();
      return;
    }
  } catch { }

  // 2. Also support direct token in URL (fallback)
  try {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = search.get("access_token") || search.get("token") || hash.get("access_token") || hash.get("token");
    if (token) {
      state.token = token;
      localStorage.setItem("lm.token", token);
      const url = new URL(window.location.href);
      url.search = ""; url.hash = "";
      window.history.replaceState({}, "", url.toString());
    }
  } catch { }

  // 3. Normal boot — check existing session or show login
  render();
  if (state.token) {
    try { await afterLogin(); }
    catch (e) { console.error(e); logout(); }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}