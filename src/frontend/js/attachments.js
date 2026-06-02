import { api } from './api.js';
import { ui } from './ui.js';
import { chat } from './chat.js';

export const attachments = {
    activeProvider: 'google_drive',
    conversationFiles: [],
    isUploading: false,

    init: () => {
        const dropZone = document.getElementById('dragDropZone');
        const fileInput = document.getElementById('fileInput');
        const browseLink = document.getElementById('browseFilesLink');
        const bulkBtn = document.getElementById('bulkCleanBtn');

        const btnGoogle = document.getElementById('providerBtnGoogle');
        const btnLocal = document.getElementById('providerBtnLocal');

        if (dropZone) {
            dropZone.addEventListener('click', (e) => {
                const browseLink = e.target.closest('#browseFilesLink');
                if (browseLink) {
                    e.stopPropagation();
                    fileInput.click();
                }
            });
        }

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                attachments.handleFilesSelected(e.target.files);
            }
        });

        if (btnGoogle && btnLocal) {
            btnGoogle.addEventListener('click', () => {
                attachments.activeProvider = 'google_drive';
                btnGoogle.classList.add('active');
                btnLocal.classList.remove('active');
                ui.showToast('Storage Provider: Google Drive selected', 'success');
            });

            btnLocal.addEventListener('click', () => {
                attachments.activeProvider = 'local';
                btnLocal.classList.add('active');
                btnGoogle.classList.remove('active');
                ui.showToast('Storage Provider: Local Storage selected', 'success');
            });
        }

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');

            if (e.dataTransfer.files.length > 0) {
                attachments.handleFilesSelected(e.dataTransfer.files);
            }
        });

        window.addEventListener('dragenter', (e) => {
            ui.openDrawer();
        });

        bulkBtn.addEventListener('click', () => attachments.handleBulkClean());
    },

    loadForConversation: async (conversationId) => {
        attachments.conversationFiles = [];
        attachments.resetDrawerFiles();

        try {
            const data = await api.getConversationAttachments(conversationId);
            attachments.conversationFiles = data || [];
            attachments.renderFileList();
        } catch (error) {
            console.error('Failed to load thread attachments:', error);
            ui.showToast('Failed to load uploaded documents');
        }
    },

    resetDrawerFiles: () => {
        const fileList = document.getElementById('drawerFileList');
        const emptyState = document.getElementById('drawerFileEmpty');

        fileList.innerHTML = '';
        fileList.appendChild(emptyState);
        emptyState.classList.remove('hidden');
    },

    renderFileList: () => {
        const fileList = document.getElementById('drawerFileList');
        const emptyState = document.getElementById('drawerFileEmpty');

        Array.from(fileList.children).forEach(child => {
            if (child.id !== 'drawerFileEmpty') {
                child.remove();
            }
        });

        if (attachments.conversationFiles.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        attachments.conversationFiles.forEach(file => {
            const sizeKB = (file.file_size / 1024).toFixed(1);
            const item = document.createElement('div');
            item.className = 'uploaded-file-item';

            let fileIcon = '📄';
            if (file.file_type.includes('pdf')) fileIcon = '📕';
            else if (file.file_type.includes('word') || file.file_name.endsWith('.docx')) fileIcon = '📘';
            else if (file.file_type.includes('markdown') || file.file_name.endsWith('.md')) fileIcon = '📝';
            else if (/\.(py|js|ts|c|cpp|html|css)$/i.test(file.file_name)) fileIcon = '💻';

            item.innerHTML = `
                <div style="font-size: 1.3rem;">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name" title="${file.file_name}">${file.file_name}</div>
                    <div class="file-meta">
                        <span>${sizeKB} KB</span>
                        <span>•</span>
                        <span class="file-provider-badge">${file.storage_provider}</span>
                    </div>
                </div>
                <button class="logout-btn" style="color:var(--text-tertiary);" title="Delete file">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            const delBtn = item.querySelector('button');
            delBtn.addEventListener('click', () => attachments.deleteFile(file.id, file.storage_provider));

            fileList.appendChild(item);
        });
    },

    // Handles the batch of files dropped or browsed
    handleFilesSelected: async (filesList) => {
        if (attachments.isUploading) return;
        attachments.isUploading = true;

        const defaultView = document.getElementById('dropZoneDefaultView');
        const loadingView = document.getElementById('dropZoneLoadingView');

        if (defaultView && loadingView) {
            defaultView.classList.add('hidden');
            loadingView.classList.remove('hidden');
        }

        // Synchronously convert and cache all files into memory immediately to prevent browser invalidation of file handles during awaits
        const filesArray = [];
        try {
            const cached = await Promise.all(
                Array.from(filesList).map(async (file) => {
                    const buffer = await file.arrayBuffer();
                    return new File([buffer], file.name, {
                        type: file.type || 'application/octet-stream',
                        lastModified: file.lastModified
                    });
                })
            );
            filesArray.push(...cached);
        } catch (err) {
            console.error("Warning: drag-drop pre-caching failed, using raw FileList:", err);
            filesArray.push(...Array.from(filesList));
        }

        try {
            for (const file of filesArray) {
                // If in welcome state, create conversation thread dynamically
                if (!chat.activeConversationId) {
                    const threadTitle = file.name.substring(0, 15) + " context";
                    const newThread = await chat.createNewChat(threadTitle, true);
                    if (!newThread) throw new Error("Could not initialize thread for upload");
                }

                const activeId = chat.activeConversationId;

                // Trigger file post
                const data = await api.uploadFile(activeId, file, attachments.activeProvider);
                attachments.conversationFiles.unshift(data);
                attachments.renderFileList(); // Update list progressively after each file is uploaded
                ui.showToast(`Ingested ${file.name} successfully`, 'success');
            }

            // Reload message history in active thread since ingestion changes citation lookups
            if (chat.activeConversationId) {
                await chat.loadMessages(chat.activeConversationId);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            if (attachments.activeProvider === 'google_drive') {
                ui.showToast('Google Drive requires OAuth credentials. Check your Google Login or switch to Local Storage.', 'error');
            } else {
                ui.showToast(error.message || 'File ingestion failed');
            }
        } finally {
            attachments.isUploading = false;
            if (defaultView && loadingView) {
                defaultView.classList.remove('hidden');
                loadingView.classList.add('hidden');
            }
            const input = document.getElementById('fileInput');
            if (input) input.value = ''; // Reset input
            
            // Ensure the list is rendered at the end of the operation as a final fallback
            attachments.renderFileList();
        }
    },

    // Delete single attachment
    deleteFile: async (fileId, provider) => {
        const conversationId = chat.activeConversationId;
        if (!conversationId) return;

        const confirmDel = confirm('Are you sure you want to delete this document? It will clear it out of storage and the vector store completely.');
        if (!confirmDel) return;

        try {
            await api.deleteAttachment(conversationId, fileId, provider);

            // Remove from local list
            attachments.conversationFiles = attachments.conversationFiles.filter(f => f.id !== fileId);
            attachments.renderFileList();
            ui.showToast('Document deleted and vector store updated', 'success');

            // Reload messages to update any citations
            await chat.loadMessages(conversationId);
        } catch (error) {
            console.error('Delete failed:', error);
            ui.showToast('Failed to delete document');
        }
    },

    // Clear all files listed in the thread
    handleBulkClean: async () => {
        if (attachments.conversationFiles.length === 0) {
            ui.showToast('No files to clean');
            return;
        }

        const confirmClear = confirm(`Delete all ${attachments.conversationFiles.length} files currently attached to this conversation?`);
        if (!confirmClear) return;

        const filesToWipe = [...attachments.conversationFiles];
        let successes = 0;

        for (const file of filesToWipe) {
            try {
                await api.deleteAttachment(chat.activeConversationId, file.id, file.storage_provider);
                successes++;
            } catch (err) {
                console.error(`Bulk delete failed for file ${file.id}:`, err);
            }
        }

        // Fetch list anew
        if (chat.activeConversationId) {
            await attachments.loadForConversation(chat.activeConversationId);
            await chat.loadMessages(chat.activeConversationId);
        }

        ui.showToast(`Removed ${successes} files from conversation`, 'success');
    }
};

window.attachments = attachments;
