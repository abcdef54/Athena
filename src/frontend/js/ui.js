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

    // In-depth Markdown parser
    renderMarkdown: (text) => {
        if (!text) return '';
        
        let html = text;
        
        // Escape HTML to prevent XSS
        html = html.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#039;');
        
        // Code Blocks with syntax highlight structures
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `
            <pre><div class="code-header"><span>Code</span></div><code>${code.trim()}</code></pre>`;
        });
        
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

        // Lists
        html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
        // Wrap <li> blocks in <ul>
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // Paragraph formatting (break on double newline, represent single line breaks)
        const parts = html.split(/\n\n+/);
        html = parts.map(p => {
            if (p.trim().startsWith('<pre>') || p.trim().startsWith('<ul>') || p.trim().startsWith('<h')) return p;
            const lineBreaks = p.replace(/\n/g, '<br>');
            return `<p>${lineBreaks}</p>`;
        }).join('');
        
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
