// LocalMind frontend — vanilla JS client for the FastAPI backend.
// State is kept in a single `state` object; rendering is imperative via small render functions.

const DEFAULT_API = "http://127.0.0.1:8000";

const PERSONALITIES = [
  { id: "general", label: "General", sub: "Balanced default assistant" },
  { id: "coder", label: "Coder", sub: "Programming-focused" },
  { id: "researcher", label: "Researcher", sub: "Cites sources, deep reasoning" },
  // { id: "assistant", label: "Assistant", sub: "Task-oriented helper" },
  { id: "genz", label: "Gen-Z", sub: "Casual and slangy" },
  // { id: "human", label: "Human", sub: "Conversational and warm" },
  // { id: "unhinged", label: "Unhinged", sub: "No filter mode" },
];

const TOOLS = [
  { id: "retrieve", label: "Retrieve Context", icon: "database" },
  { id: "fetch", label: "Fetch Web Page", icon: "link" },
];

const REASONING_MODES = [
  { id: "low", label: "Low", sub: "One-shot inference" },
  { id: "medium", label: "Medium", sub: "Medium reasoning pipeline" },
  { id: "high", label: "High", sub: "High reasoning pipeline" },
  { id: "extra", label: "Extra", sub: "Extra reasoning pipeline" },
];

const state = {
  apiBase: localStorage.getItem("lm.apiBase") || DEFAULT_API,
  threads: [],
  activeThreadId: null,
  messages: [],
  loadingMessages: false,
  sending: false,
  activeChatRequest: null,
  chatLoading: null,
  currentLoadedModel: null,
  personality: localStorage.getItem("lm.personality") || "general",
  model: localStorage.getItem("lm.modelName") || "",
  reasoningMode: localStorage.getItem("lm.reasoningMode") || "low",
  temperature: Number.parseFloat(localStorage.getItem("lm.temperature") || "0.7"),
  installedModels: [],
  modelsLoading: false,
  modelsError: "",
  downloadingModels: new Set(),
  attachmentsOpen: false,
  sidebarOpen: true,
  attachments: [],
  toolsEnabled: localStorage.getItem("lm.toolsEnabled") !== "false",
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
  database: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  temp: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
};

// ---------- API helpers ----------
async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData) && opts.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(state.apiBase + path, { ...opts, headers, credentials: "include" });
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
  listConversations: () => api("/conversation"),
  createConversation: (title) => api("/conversation", { method: "POST", body: JSON.stringify({ user_id: "local", title }) }),
  getConversationMessages: (id) => api(`/conversation/${id}/messages`),
  renameConversation: (id, name) => api(`/conversation/${id}?new_name=${encodeURIComponent(name)}`, { method: "PATCH" }),
  deleteConversation: (id) => api(`/conversation/${id}`, { method: "DELETE" }),

  chat: (payload, signal) => api("/chat", { method: "POST", body: JSON.stringify(payload), signal }),

  listModels: () => api("/models"),
  deleteModel: (id) => api(`/models/${id}`, { method: "DELETE" }),
  browseModels: (query = "", limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (query.trim()) params.set("query", query.trim());
    return api(`/models/browse?${params.toString()}`);
  },
  listQuantizations: (repoId) => {
    const pathRepo = repoId.split("/").map(encodeURIComponent).join("/");
    return api(`/models/${pathRepo}/quants`);
  },
  downloadModel: (repoId, ggufFilename) =>
    api("/models/download", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, gguf_filename: ggufFilename }),
    }),

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
  renderApp();
}

async function initializeApp() {
  await loadInstalledModels();
  await loadThreads();
  if (state.threads.length === 0) {
    await createNewThread();
  } else {
    await selectThread(state.threads[0].id);
  }
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
            <div class="avatar">L</div>
            <div class="user-email">Local user</div>
          </div>
          <button class="icon-btn" id="openSettings" title="Settings">${ICONS.settings}</button>
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
              <button class="tool-chip" id="reasoningBtn">${ICONS.brain}<span id="reasoningLabel"></span>${ICONS.caret}</button>
              <button class="tool-chip" id="tempBtn">${ICONS.temp}<span id="tempLabel"></span>${ICONS.caret}</button>
              <button class="tool-chip" id="clipBtn" title="Attachments">${ICONS.clip}</button>
              <div class="toolbar-spacer"></div>
              <button class="send-btn" id="sendBtn" title="Send" ${state.sending ? "disabled" : ""}>${ICONS.send}</button>
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!state.sending) sendMessage();
    }
  });
  shell.querySelector("#sendBtn").addEventListener("click", sendMessage);

  shell.querySelector("#toolsBtn").addEventListener("click", (e) => togglePopover(e.currentTarget, renderToolsPopover()));
  shell.querySelector("#personalityBtn").addEventListener("click", (e) => togglePopover(e.currentTarget, renderPersonalityPopover()));
  shell.querySelector("#modelBtn").addEventListener("click", (e) => togglePopover(e.currentTarget, renderModelPopover()));
  shell.querySelector("#reasoningBtn").addEventListener("click", (e) => togglePopover(e.currentTarget, renderReasoningPopover()));
  shell.querySelector("#tempBtn").addEventListener("click", (e) => togglePopover(e.currentTarget, renderTempPopover()));

  const composer = shell.querySelector(".composer");
  composer.addEventListener("dragover", (e) => {
    e.preventDefault();
    composer.classList.add("dragover");
  });
  composer.addEventListener("dragleave", () => {
    composer.classList.remove("dragover");
  });
  composer.addEventListener("drop", (e) => {
    e.preventDefault();
    composer.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files && files.length) {
      uploadFiles(files);
    }
  });

  renderThreadList();
  renderConversation();
  renderAttachmentsPanel();
  updateChipLabels();
  ta.focus();
}

function updateChipLabels() {
  const p = PERSONALITIES.find((x) => x.id === state.personality) || PERSONALITIES[0];
  const m = getSelectedModel();
  const r = REASONING_MODES.find((x) => x.id === state.reasoningMode) || REASONING_MODES[0];
  const pl = document.getElementById("personalityLabel");
  const ml = document.getElementById("modelLabel");
  const rl = document.getElementById("reasoningLabel");
  const tl = document.getElementById("tempLabel");
  if (pl) pl.textContent = p.label;
  if (ml) ml.textContent = m ? modelDisplayName(m) : (state.modelsLoading ? "Loading models" : "No model");
  if (rl) rl.textContent = r.label;
  if (tl) tl.textContent = `Temp: ${state.temperature.toFixed(2)}`;
}

function autoGrow(e) {
  const ta = e.target;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
}

// ---------- Models ----------
function modelDisplayName(model) {
  return model?.display_name || model?.model_name || "Installed model";
}

function getModels() {
  return state.installedModels;
}

function getSelectedModel() {
  return getModels().find((x) => x.model_name === state.model) || null;
}

function installedModelKey(repoId, filename) {
  return `${repoId}::${filename}`;
}

function isQuantInstalled(repoId, filename) {
  return state.installedModels.some((m) => m.hf_repo === repoId && m.gguf_file === filename);
}

function formatModelSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

async function loadInstalledModels({ preserveSelection = true } = {}) {
  state.modelsLoading = true;
  state.modelsError = "";
  updateChipLabels();
  try {
    const models = await API.listModels();
    state.installedModels = Array.isArray(models) ? models : [];
    const saved = preserveSelection ? state.model : "";
    const savedModel = saved && state.installedModels.find((m) => m.model_name === saved);
    const defaultModel = state.installedModels.find((m) => m.is_default) || state.installedModels[0];

    if (savedModel) {
      state.model = savedModel.model_name;
    } else if (defaultModel) {
      state.model = defaultModel.model_name;
      localStorage.setItem("lm.modelName", state.model);
    } else {
      state.model = "";
      localStorage.removeItem("lm.modelName");
    }
  } catch (e) {
    console.error(e);
    state.modelsError = e.message || "Could not load installed models.";
    state.installedModels = [];
  } finally {
    state.modelsLoading = false;
    updateChipLabels();
  }
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

  if (!state.messages.length && !state.chatLoading) {
    conv.appendChild($(`
      <div class="empty-state">
        <h2>How can I help today?</h2>
        <p>Pick a personality, switch models, or just start typing. Attach documents from the paper-clip to ground the conversation.</p>
      </div>
    `));
    return;
  }

  for (const m of state.messages) appendMessage(conv, m);
  if (state.chatLoading) conv.appendChild(renderChatLoadingBox());

  conv.scrollTop = conv.scrollHeight;
}

function appendMessage(conv, m) {
  const isUser = m.role === "user";
  const wrap = $(`
    <div class="msg-wrap ${isUser ? "msg-user" : "msg-assistant"}">
      <div class="bubble"></div>
    </div>
  `);
  const bubble = wrap.querySelector(".bubble");
  bubble.innerHTML = isUser ? escapeHtml(m.content) : renderMarkdown(m.content);
  conv.appendChild(wrap);

  if (window.renderMathInElement) {
    window.renderMathInElement(bubble, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true }
      ],
      throwOnError: false
    });
  }
}

function createChatLoadingState(modelName) {
  const selectedModel = getSelectedModel();
  const reasoning = REASONING_MODES.find((x) => x.id === state.reasoningMode) || REASONING_MODES[0];
  const displayName = selectedModel ? modelDisplayName(selectedModel) : modelName;
  const needsLlamaSwapLoad = modelName !== state.currentLoadedModel;
  return {
    title: "Preparing response",
    stage: needsLlamaSwapLoad ? "loading-swap" : "generating",
    modelName,
    displayName,
    settings: {
      reasoningMode: state.reasoningMode,
      reasoningLabel: reasoning.label,
      temperature: Number.isFinite(state.temperature) ? state.temperature.toFixed(2) : String(state.temperature),
    },
  };
}

function loadingStepState(step) {
  const stage = state.chatLoading?.stage;
  if (step === "loading-swap") {
    if (stage === "loading-swap") return "active";
    return "done";
  }
  if (stage === "generating") return "active";
  return "pending";
}

function renderLoadingStep(step, label) {
  const stateName = loadingStepState(step);
  const symbol = stateName === "done" ? "&#10003;" : stateName === "active" ? "&#9679;" : "&#9675;";
  return `
    <div class="chat-loading-step ${stateName}">
      <span>${symbol}</span>${escapeHtml(label)}
    </div>
  `;
}

function renderChatLoadingBox() {
  const loading = state.chatLoading;
  const wrap = $(`
    <div class="msg-wrap msg-assistant chat-loading-wrap">
      <div class="chat-loading-card glass">
        <div class="chat-loading-head">
          <div class="chat-loading-icon">${ICONS.cpu}</div>
          <div>
            <div class="chat-loading-title">${escapeHtml(loading.title || "Preparing response")}</div>
            <div class="chat-loading-sub">This may take up to a minute the first time a model is used.</div>
          </div>
        </div>
        <div class="chat-loading-shimmer"></div>
        <div class="chat-loading-steps">
          ${renderLoadingStep("loading-swap", "Loading Llama-Swap")}
          ${renderLoadingStep("generating", "Generating Response")}
        </div>
        <div class="chat-loading-meta">
          <div><span>Model</span><strong>${escapeHtml(loading.displayName || loading.modelName || "Selected model")}</strong></div>
          <div><span>Reasoning</span><strong>${escapeHtml(loading.settings?.reasoningLabel || loading.settings?.reasoningMode || "")}</strong></div>
          <div><span>Temperature</span><strong>${escapeHtml(loading.settings?.temperature ?? "")}</strong></div>
        </div>
        <button class="btn-secondary cancel-response-btn" id="cancelChatLoading">Cancel</button>
      </div>
    </div>
  `);
  wrap.querySelector("#cancelChatLoading").addEventListener("click", cancelActiveChat);
  return wrap;
}

function cancelActiveChat() {
  if (!state.activeChatRequest) return;
  state.activeChatRequest.controller.abort();
  state.activeChatRequest = null;
  state.chatLoading = null;
  state.sending = false;
  render();
  document.getElementById("composerInput")?.focus();
}

async function sendMessage() {
  const ta = document.getElementById("composerInput");
  const text = ta.value.trim();
  if (!text || state.sending || !state.activeThreadId) return;
  if (!state.model) {
    state.messages.push({ id: "err-" + Date.now(), role: "assistant", content: "No installed model is available. Add or install a GGUF model before sending a message." });
    renderConversation();
    return;
  }

  ta.value = ""; ta.style.height = "auto";

  const conversationId = state.activeThreadId;
  const selectedModel = state.model;
  const controller = new AbortController();
  state.messages.push({ id: "tmp-" + Date.now(), role: "user", content: text });
  state.sending = true;
  state.chatLoading = createChatLoadingState(selectedModel);
  state.activeChatRequest = { conversationId, controller };
  render();

  try {
    const res = await API.chat({
      conversation_id: conversationId,
      content: text,
      personality: state.personality,
      model_name: selectedModel,
      reasoning_mode: state.reasoningMode,
      temperature: state.temperature,
      tools_enabled: state.toolsEnabled,
    }, controller.signal);
    state.currentLoadedModel = selectedModel;
    state.chatLoading = null;
    state.messages.push(res);

    // Rename empty thread to first user message
    const active = state.threads.find((t) => t.id === conversationId);
    if (active && (active.title === "New chat" || !active.title)) {
      const newTitle = text.length > 40 ? text.slice(0, 40) + "..." : text;
      active.title = newTitle;
      API.renameConversation(active.id, newTitle).catch(() => { });
    }
  } catch (e) {
    if (e.name === "AbortError") {
      state.chatLoading = null;
      return;
    }
    state.chatLoading = null;
    state.messages.push({
      id: "err-" + Date.now(),
      role: "assistant",
      content: `Failed to generate a response.\n\nThe selected model may still be loading or an unexpected error occurred.\n\n${e.message || ""}`.trim(),
    });
  } finally {
    if (state.activeChatRequest?.controller === controller) {
      state.activeChatRequest = null;
      state.sending = false;
      state.chatLoading = null;
    }
    render();
    document.getElementById("composerInput")?.focus();
  }
}
// ---------- Popovers ----------
let openPopoverEl = null;
let openPopoverAnchor = null;

function closePopover() {
  if (openPopoverEl) { openPopoverEl.remove(); openPopoverEl = null; }
  openPopoverAnchor = null;
  document.removeEventListener("click", onDocClickClosePopover, true);
}

function onDocClickClosePopover(e) {
  if (openPopoverEl) {
    if (openPopoverEl.contains(e.target)) return;
    if (openPopoverAnchor && (openPopoverAnchor === e.target || openPopoverAnchor.contains(e.target))) return;
    closePopover();
  }
}

function openPopover(anchor, content) {
  closePopover();
  if (state.attachmentsOpen) {
    state.attachmentsOpen = false;
    render();
  }
  const pop = $(`<div class="popover glass"></div>`);
  pop.appendChild(content);
  document.body.appendChild(pop);

  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(window.innerWidth - 250, r.left)) + "px";
  pop.style.bottom = (window.innerHeight - r.top + 8) + "px";
  requestAnimationFrame(() => pop.classList.add("open"));
  openPopoverEl = pop;
  openPopoverAnchor = anchor;
  setTimeout(() => document.addEventListener("click", onDocClickClosePopover, true), 0);
}

function togglePopover(anchor, content) {
  if (openPopoverAnchor === anchor) {
    closePopover();
  } else {
    openPopover(anchor, content);
  }
}

function renderTempPopover() {
  const wrap = $(`
    <div class="temp-popover-content">
      <div class="popover-title">Inference Temperature</div>
      <div class="temp-slider-wrap">
        <span class="temp-val" id="popoverTempVal">${state.temperature.toFixed(2)}</span>
        <input type="range" id="popoverTempSlider" min="0.0" max="1.0" step="0.05" value="${state.temperature}" />
      </div>
    </div>
  `);

  const slider = wrap.querySelector("#popoverTempSlider");
  const valDisp = wrap.querySelector("#popoverTempVal");

  slider.addEventListener("input", (e) => {
    const val = Number.parseFloat(e.target.value);
    state.temperature = val;
    localStorage.setItem("lm.temperature", String(val));
    valDisp.textContent = val.toFixed(2);
    const tl = document.getElementById("tempLabel");
    if (tl) tl.textContent = `Temp: ${val.toFixed(2)}`;
  });

  return wrap;
}

function renderToolsPopover() {
  const wrap = document.createElement("div");
  
  const switchRow = $(`
    <div class="switch-container">
      <span class="switch-label">Enable Tools</span>
      <label class="switch">
        <input type="checkbox" id="toolsToggle" ${state.toolsEnabled ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    </div>
  `);
  
  switchRow.querySelector("#toolsToggle").addEventListener("change", (e) => {
    state.toolsEnabled = e.target.checked;
    localStorage.setItem("lm.toolsEnabled", state.toolsEnabled);
    
    const items = wrap.querySelectorAll(".popover-item");
    for (const item of items) {
      if (state.toolsEnabled) {
        item.classList.remove("disabled-tools-mode");
      } else {
        item.classList.add("disabled-tools-mode");
      }
    }
  });
  
  wrap.appendChild(switchRow);
  
  const title = document.createElement("div");
  title.className = "popover-title";
  title.textContent = "Agent tools (display only)";
  wrap.appendChild(title);
  
  for (const t of TOOLS) {
    const item = $(`
      <div class="popover-item disabled ${state.toolsEnabled ? "" : "disabled-tools-mode"}">
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

function renderModelPopover() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="popover-title">Model</div>`;
  if (state.modelsLoading) {
    wrap.appendChild($(`<div class="popover-item disabled"><span class="pi-icon">${ICONS.cpu}</span><span class="pi-text"><span>Loading installed models...</span></span></div>`));
  }
  if (state.modelsError) {
    wrap.appendChild($(`<div class="popover-item disabled"><span class="pi-icon">${ICONS.cpu}</span><span class="pi-text"><span>Could not load models</span><span class="pi-sub">${escapeHtml(state.modelsError)}</span></span></div>`));
  }
  for (const m of getModels()) {
    const sub = [
      m.quantization,
      formatModelSize(m.size_bytes),
    ].filter(Boolean).join(" - ");
    const item = $(`
      <div class="popover-item ${state.model === m.model_name ? "selected" : ""}" style="justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <span class="pi-icon">${ICONS.cpu}</span>
          <span class="pi-text" style="flex: 1; min-width: 0;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span class="model-name-span" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(modelDisplayName(m))}</span>
              ${m.is_default ? `<span class="default-badge">Default</span>` : ""}
            </span>
            ${sub ? `<span class="pi-sub">${escapeHtml(sub)}</span>` : ""}
          </span>
        </div>
        <div class="popover-item-actions" style="display: flex; align-items: center; gap: 8px;">
          ${state.model === m.model_name ? `<span class="selected-check" style="color: var(--accent);">${ICONS.check}</span>` : ""}
          ${!m.is_default ? `<button class="icon-btn delete-model-btn" title="Delete model">${ICONS.trash}</button>` : ""}
        </div>
      </div>
    `);
    item.addEventListener("click", (e) => {
      if (e.target.closest(".delete-model-btn")) return;
      state.model = m.model_name;
      localStorage.setItem("lm.modelName", m.model_name);
      closePopover(); updateChipLabels();
    });
    const delBtn = item.querySelector(".delete-model-btn");
    if (delBtn) {
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openConfirmModal({
          title: "Delete model?",
          body: `Are you sure you want to delete ${modelDisplayName(m)}? This will permanently delete the model file from your disk.`,
          confirmText: "Delete",
          danger: true,
          onConfirm: async () => {
            try {
              await API.deleteModel(m.id);
              if (state.model === m.model_name) {
                await loadInstalledModels({ preserveSelection: false });
              } else {
                await loadInstalledModels({ preserveSelection: true });
              }
              closePopover();
              render();
            } catch (err) {
              alert(`Failed to delete model: ${err.message}`);
            }
          }
        });
      });
    }
    wrap.appendChild(item);
  }
  const addItem = $(`
    <div class="popover-item add-model-item">
      <span class="pi-icon">${ICONS.plus}</span>
      <span class="pi-text"><span>Add Model</span></span>
    </div>
  `);
  addItem.addEventListener("click", () => {
    closePopover();
    openModelBrowserDialog();
  });
  wrap.appendChild(addItem);
  return wrap;
}

function renderReasoningPopover() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="popover-title">Reasoning mode</div>`;
  for (const mode of REASONING_MODES) {
    const item = $(`
      <div class="popover-item ${state.reasoningMode === mode.id ? "selected" : ""}">
        <span class="pi-icon">${ICONS.brain}</span>
        <span class="pi-text"><span>${mode.label}</span><span class="pi-sub">${mode.sub}</span></span>
        ${ICONS.check}
      </div>
    `);
    item.addEventListener("click", () => {
      state.reasoningMode = mode.id;
      localStorage.setItem("lm.reasoningMode", mode.id);
      closePopover(); updateChipLabels();
    });
    wrap.appendChild(item);
  }
  return wrap;
}

function openModelBrowserDialog() {
  const backdrop = $(`
    <div class="modal-backdrop">
      <div class="modal glass model-browser-modal">
        <div class="modal-head">
          <h3>Add Model</h3>
          <button class="icon-btn" id="closeModelBrowser" title="Close">${ICONS.close}</button>
        </div>
        <div class="model-search-row">
          <input id="modelSearchInput" type="search" placeholder="Search Hugging Face GGUF models" />
          <button class="btn-secondary" id="modelSearchBtn">${ICONS.search}<span>Search</span></button>
        </div>
        <div class="model-browser-grid">
          <div class="model-browser-pane">
            <div class="pane-title">Popular GGUF models</div>
            <div id="hfModelList" class="model-browser-list">
              <div class="model-browser-empty">Loading models...</div>
            </div>
          </div>
          <div class="model-browser-pane">
            <div class="pane-title">Quantizations</div>
            <div id="quantList" class="model-browser-list">
              <div class="model-browser-empty">Select a model to view GGUF quantizations.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(backdrop);

  const searchInput = backdrop.querySelector("#modelSearchInput");
  const modelList = backdrop.querySelector("#hfModelList");
  const quantList = backdrop.querySelector("#quantList");
  let selectedRepoId = "";
  let browseSeq = 0;
  let quantSeq = 0;

  const renderModelRows = (models) => {
    modelList.innerHTML = "";
    if (!models.length) {
      modelList.appendChild($(`<div class="model-browser-empty">No GGUF models found.</div>`));
      return;
    }
    for (const model of models) {
      const selected = selectedRepoId === model.id;
      const row = $(`
        <button type="button" class="model-row ${selected ? "selected" : ""}">
          <span class="model-row-main">
            <span class="model-row-title">${escapeHtml(model.name || model.id)}</span>
            <span class="model-row-sub">${escapeHtml(model.author || "")}${model.size ? ` - ${escapeHtml(model.size)}` : ""}</span>
          </span>
          <span class="model-row-meta">${escapeHtml(model.downloads_text || `${model.downloads || 0}`)}</span>
        </button>
      `);
      row.addEventListener("click", () => {
        selectedRepoId = model.id;
        renderModelRows(models);
        loadQuantizations(model.id);
      });
      modelList.appendChild(row);
    }
  };

  const loadBrowse = async (query = "") => {
    const seq = ++browseSeq;
    modelList.innerHTML = `<div class="model-browser-empty">Loading models...</div>`;
    try {
      const models = await API.browseModels(query, 20);
      if (seq !== browseSeq) return;
      renderModelRows(Array.isArray(models) ? models : []);
    } catch (e) {
      if (seq !== browseSeq) return;
      modelList.innerHTML = `<div class="model-browser-empty">Could not load models: ${escapeHtml(e.message)}</div>`;
    }
  };

  const renderQuantRows = (repoId, quants) => {
    quantList.innerHTML = "";
    if (!quants.length) {
      quantList.appendChild($(`<div class="model-browser-empty">No GGUF quantizations found.</div>`));
      return;
    }
    for (const quant of quants) {
      const key = installedModelKey(repoId, quant.filename);
      const installed = isQuantInstalled(repoId, quant.filename);
      const downloading = state.downloadingModels.has(key);
      const row = $(`
        <div class="quant-row">
          <div class="quant-info">
            <div class="quant-title">${escapeHtml(quant.quant || quant.filename)}</div>
            <div class="quant-sub">${escapeHtml(quant.filename)}${quant.size_gb ? ` - ${quant.size_gb.toFixed(2)} GB` : ""}</div>
          </div>
          <button class="btn-secondary download-model-btn" ${installed || downloading ? "disabled" : ""}>
            ${installed ? "Installed" : downloading ? "Downloading..." : "Download"}
          </button>
        </div>
      `);
      row.querySelector(".download-model-btn").addEventListener("click", async () => {
        if (state.downloadingModels.has(key) || isQuantInstalled(repoId, quant.filename)) return;
        state.downloadingModels.add(key);
        renderQuantRows(repoId, quants);
        try {
          await API.downloadModel(repoId, quant.filename);
          await loadInstalledModels({ preserveSelection: true });
        } catch (e) {
          alert(e.message || "Model download failed.");
        } finally {
          state.downloadingModels.delete(key);
          renderQuantRows(repoId, quants);
        }
      });
      quantList.appendChild(row);
    }
  };

  const loadQuantizations = async (repoId) => {
    const seq = ++quantSeq;
    quantList.innerHTML = `<div class="model-browser-empty">Loading quantizations...</div>`;
    try {
      const quants = await API.listQuantizations(repoId);
      if (seq !== quantSeq) return;
      renderQuantRows(repoId, Array.isArray(quants) ? quants : []);
    } catch (e) {
      if (seq !== quantSeq) return;
      quantList.innerHTML = `<div class="model-browser-empty">Could not load quantizations: ${escapeHtml(e.message)}</div>`;
    }
  };

  const runSearch = () => loadBrowse(searchInput.value.trim());
  backdrop.querySelector("#modelSearchBtn").addEventListener("click", runSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runSearch(); }
    if (e.key === "Escape") { e.preventDefault(); closeModal(backdrop); }
  });
  backdrop.querySelector("#closeModelBrowser").addEventListener("click", () => closeModal(backdrop));
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(backdrop); });
  loadBrowse();
  setTimeout(() => searchInput.focus(), 50);
}

// ---------- Attachments ----------
async function toggleAttachments() {
  if (!state.attachmentsOpen) {
    closePopover();
  }
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
      <div>Drop files or click to upload</div>
      <input type="file" id="fileInput" multiple style="display:none" />
    </label>
  `);
  panel.appendChild(drop);

  const fileInput = drop.querySelector("#fileInput");
  fileInput.addEventListener("change", (e) => {
    const files = e.target.files; if (files && files.length) uploadFiles(files);
    e.target.value = "";
  });
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("dragover"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault(); drop.classList.remove("dragover");
    const files = e.dataTransfer.files; if (files && files.length) uploadFiles(files);
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

async function uploadFiles(files) {
  if (!state.activeThreadId) {
    alert("Please select or create a conversation first.");
    return;
  }
  if (!state.attachmentsOpen) {
    state.attachmentsOpen = true;
    render();
  }
  try {
    const promises = Array.from(files).map(f => API.uploadFile(state.activeThreadId, f, "local"));
    await Promise.all(promises);
    await loadAttachments();
  } catch (e) {
    alert("Some files failed to upload: " + e.message);
  }
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
    closeModal(backdrop);
    loadInstalledModels({ preserveSelection: true }).finally(render);
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
  render();
  try { await initializeApp(); }
  catch (e) { console.error(e); }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
