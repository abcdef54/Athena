export const ui = {
    // Toast Notification Alerts
    showToast: (message, type = 'error') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // In-depth Markdown parser (v3.0: KaTeX + Highlight.js)
    renderMarkdown: (text) => {
        if (!text) return '';
        
        let html = text;

        // ── Step 1: Protect LaTeX and code blocks from HTML escaping ──
        // Extract and stash blocks that contain raw syntax before escaping.
        const stash = [];
        const stashPlaceholder = (content) => {
            const idx = stash.length;
            stash.push(content);
            return `%%STASH_${idx}%%`;
        };

        // Stash fenced code blocks: ```lang\ncode```
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const langLabel = lang ? lang.toUpperCase() : 'CODE';
            let highlighted;
            try {
                if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                    highlighted = window.hljs.highlight(code.trimEnd(), { language: lang }).value;
                } else if (window.hljs) {
                    highlighted = window.hljs.highlightAuto(code.trimEnd()).value;
                } else {
                    // Fallback: escape HTML manually
                    highlighted = code.trimEnd()
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                }
            } catch {
                highlighted = code.trimEnd()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            }
            const block = `<pre class="code-panel"><div class="code-header"><span class="code-lang">${langLabel}</span><button class="copy-code-btn" onclick="copyToClipboard(this)">Copy</button></div><code class="hljs">${highlighted}</code></pre>`;
            return stashPlaceholder(block);
        });

        // Stash block math: $$...$$
        html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
            let rendered;
            try {
                rendered = window.katex
                    ? window.katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })
                    : `<code>${math.trim()}</code>`;
            } catch {
                rendered = `<code>${math.trim()}</code>`;
            }
            return stashPlaceholder(`<div class="math-block">${rendered}</div>`);
        });

        // Stash inline math: $...$  (with numerical currency guard)
        html = html.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (match, math) => {
            // Guard: skip pure currency like $100, $45.50, $1,200
            if (/^\s*[\d,]+(\.\d+)?\s*$/.test(math)) return match;
            let rendered;
            try {
                rendered = window.katex
                    ? window.katex.renderToString(math.trim(), { displayMode: false, throwOnError: false })
                    : `<code>${math.trim()}</code>`;
            } catch {
                rendered = `<code>${math.trim()}</code>`;
            }
            return stashPlaceholder(`<span class="math-inline">${rendered}</span>`);
        });

        // ── Step 2: Escape HTML (XSS prevention) ──
        html = html.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#039;');

        // ── Step 3: Standard Markdown transformations ──
        // Inline Code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Headers
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

        // Tables (pipe-delimited markdown syntax)
        html = html.replace(/(^\|.+\|\s*\n)(^\|[\s:|-]+\|\s*\n)((?:^\|.+\|\s*\n?)+)/gm, (match, headerRow, separatorRow, bodyRows) => {
            // Parse header cells
            const headers = headerRow.trim().split('|').filter(c => c.trim() !== '');
            const thCells = headers.map(h => `<th>${h.trim()}</th>`).join('');

            // Parse body rows
            const rows = bodyRows.trim().split('\n').filter(r => r.trim());
            const tbodyRows = rows.map(row => {
                const cells = row.trim().split('|').filter(c => c.trim() !== '');
                const tdCells = cells.map(c => `<td>${c.trim()}</td>`).join('');
                return `<tr>${tdCells}</tr>`;
            }).join('');

            return `<div class="table-wrapper"><table class="md-table"><thead><tr>${thCells}</tr></thead><tbody>${tbodyRows}</tbody></table></div>`;
        });

        // Lists
        html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
        // Wrap <li> blocks in <ul>
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Paragraph formatting (break on double newline, represent single line breaks)
        const parts = html.split(/\n\n+/);
        html = parts.map(p => {
            if (p.trim().startsWith('<pre') || p.trim().startsWith('<ul>') || p.trim().startsWith('<h') || p.trim().startsWith('<div class="math') || p.trim().startsWith('<div class="table')) return p;
            const lineBreaks = p.replace(/\n/g, '<br>');
            return `<p>${lineBreaks}</p>`;
        }).join('');

        // ── Step 4: Restore stashed blocks ──
        html = html.replace(/%%STASH_(\d+)%%/g, (match, idx) => stash[parseInt(idx)]);
        
        return html;
    },

    // Drag-and-drop drawer animation triggers
    openDrawer: () => {
        const drawer = document.getElementById('fileDrawer');
        if (drawer) drawer.classList.add('open');
    },

    closeDrawer: () => {
        const drawer = document.getElementById('fileDrawer');
        if (drawer) drawer.classList.remove('open');
    },

    toggleDrawer: () => {
        const drawer = document.getElementById('fileDrawer');
        if (drawer) drawer.classList.toggle('open');
    },

    // Mobile Sidebar controls
    setupMobileMenu: () => {
        const btn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        
        let backdrop = document.querySelector('.sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            document.body.appendChild(backdrop);
        }
        
        const toggleMenu = () => {
            const isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                sidebar.classList.remove('open');
                backdrop.classList.remove('show');
            } else {
                sidebar.classList.add('open');
                backdrop.classList.add('show');
            }
        };
        
        if (btn) btn.addEventListener('click', toggleMenu);
        backdrop.addEventListener('click', toggleMenu);
    },

    closeMobileSidebar: () => {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            if (backdrop) backdrop.classList.remove('show');
        }
    },
    
    // Auto-scroll inside chat
    scrollToBottom: (elementId) => {
        const el = document.getElementById(elementId);
        if (el) {
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 400;
            el.scrollTo({
                top: el.scrollHeight,
                behavior: isNearBottom ? 'smooth' : 'auto'
            });
        }
    },

    // Click trigger showing animated floating citation detail boxes
    showCitationPopover: (pillElement, attachmentData) => {
        const popover = document.getElementById('citationPopover');
        if (!popover) return;

        const sizeKB = (attachmentData.file_size / 1024).toFixed(1);
        const dateStr = new Date(attachmentData.created_at).toLocaleString();

        popover.innerHTML = `
            <div class="citation-popover-header">
                <h4 title="${attachmentData.file_name}">${attachmentData.file_name}</h4>
                <button class="citation-popover-close" id="closePopoverBtn">✕</button>
            </div>
            <div class="citation-popover-row">
                <span>Storage Origin</span>
                <span class="file-provider-badge">${attachmentData.storage_provider}</span>
            </div>
            <div class="citation-popover-row">
                <span>File Size</span>
                <span>${sizeKB} KB</span>
            </div>
            <div class="citation-popover-row">
                <span>File Type</span>
                <span style="font-size: 0.7rem; font-family: monospace;">${attachmentData.file_type}</span>
            </div>
            <div class="citation-popover-row">
                <span>Ingested At</span>
                <span>${dateStr}</span>
            </div>
        `;

        popover.classList.remove('hidden');

        // Position the popover intelligently above the clicked pill
        const pillRect = pillElement.getBoundingClientRect();
        const popoverHeight = popover.offsetHeight || 160;
        const popoverWidth = popover.offsetWidth || 280;

        let leftPos = pillRect.left + (pillRect.width / 2) - (popoverWidth / 2);
        let topPos = pillRect.top - popoverHeight - 10 + window.scrollY;

        // Fallbacks for window boundaries
        if (leftPos < 10) leftPos = 10;
        if (leftPos + popoverWidth > window.innerWidth) {
            leftPos = window.innerWidth - popoverWidth - 10;
        }
        if (topPos < 10) {
            // Place below the pill if space is tight at the top
            topPos = pillRect.bottom + 10 + window.scrollY;
        }

        popover.style.left = `${leftPos}px`;
        popover.style.top = `${topPos}px`;

        // Bind close button
        const closeBtn = popover.querySelector('#closePopoverBtn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            popover.classList.add('hidden');
        });

        // Click outside popover to close it
        const clickOutsideHandler = (e) => {
            if (!popover.contains(e.target) && e.target !== pillElement && !pillElement.contains(e.target)) {
                popover.classList.add('hidden');
                document.removeEventListener('click', clickOutsideHandler);
            }
        };

        // Delay registration to prevent immediate firing
        setTimeout(() => {
            document.addEventListener('click', clickOutsideHandler);
        }, 50);
    }
};

window.ui = ui; // Expose globally for convenience

// ── Global Copy-to-Clipboard helper for code blocks ──
window.copyToClipboard = (buttonElement) => {
    const codeEl = buttonElement.closest('pre').querySelector('code');
    if (!codeEl) return;

    const rawText = codeEl.textContent || codeEl.innerText;
    navigator.clipboard.writeText(rawText).then(() => {
        buttonElement.textContent = 'Copied!';
        buttonElement.classList.add('copied');
        setTimeout(() => {
            buttonElement.textContent = 'Copy';
            buttonElement.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        buttonElement.textContent = 'Error';
        setTimeout(() => { buttonElement.textContent = 'Copy'; }, 2000);
    });
};
