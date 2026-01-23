/**
 * CloudVault - Secure File Portal
 * Frontend JavaScript Application
 * Integrated with FastAPI Backend
 */

// ==========================================
// Configuration
// ==========================================

const CONFIG = {
    // API Base URL - Change this to your deployed API endpoint
    // For local development: 'http://localhost:8000'
    // For AWS Lambda: 'https://your-api-gateway-url.amazonaws.com/prod'
    API_BASE_URL: 'http://localhost:8000',
    TOKEN_KEY: 'cloudvault_token',
    USER_KEY: 'cloudvault_user'
};

// ==========================================
// State Management
// ==========================================

const state = {
    token: null,
    user: null,
    currentFolderId: null,
    currentFolder: null,
    currentView: 'folders',
    folders: [],
    files: [],
    isSharedView: false
};

// ==========================================
// DOM Elements
// ==========================================

const elements = {
    // Auth
    authContainer: document.getElementById('auth-container'),
    dashboardContainer: document.getElementById('dashboard-container'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    authMessage: document.getElementById('auth-message'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    togglePasswordBtns: document.querySelectorAll('.toggle-password'),

    // Dashboard
    sidebar: document.querySelector('.sidebar'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    navItems: document.querySelectorAll('.nav-item'),
    userEmail: document.getElementById('user-email'),
    logoutBtn: document.getElementById('logout-btn'),
    pageTitle: document.getElementById('page-title'),

    // Breadcrumb
    breadcrumb: document.getElementById('breadcrumb'),
    currentFolderName: document.getElementById('current-folder-name'),

    // Views
    foldersView: document.getElementById('folders-view'),
    filesView: document.getElementById('files-view'),
    foldersGrid: document.getElementById('folders-grid'),
    filesGrid: document.getElementById('files-grid'),
    emptyFolders: document.getElementById('empty-folders'),
    emptyFiles: document.getElementById('empty-files'),

    // Buttons
    createFolderBtn: document.getElementById('create-folder-btn'),
    emptyCreateFolderBtn: document.getElementById('empty-create-folder'),
    uploadBtn: document.getElementById('upload-btn'),
    emptyUploadBtn: document.getElementById('empty-upload-btn'),
    shareFolderBtn: document.getElementById('share-folder-btn'),

    // Modals
    createFolderModal: document.getElementById('create-folder-modal'),
    shareFolderModal: document.getElementById('share-folder-modal'),
    uploadModal: document.getElementById('upload-modal'),

    // Forms
    createFolderForm: document.getElementById('create-folder-form'),
    shareFolderForm: document.getElementById('share-folder-form'),

    // Upload
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    uploadProgress: document.getElementById('upload-progress'),
    uploadFilename: document.getElementById('upload-filename'),
    progressFill: document.getElementById('progress-fill'),
    uploadStatus: document.getElementById('upload-status'),

    // Toast & Loading
    toastContainer: document.getElementById('toast-container'),
    loadingOverlay: document.getElementById('loading-overlay')
};

// ==========================================
// Utility Functions
// ==========================================

function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check',
        error: 'fa-xmark',
        warning: 'fa-exclamation',
        info: 'fa-info'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    elements.toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
}

function showAuthMessage(type, message) {
    elements.authMessage.className = `auth-message show ${type}`;
    elements.authMessage.textContent = message;
}

function hideAuthMessage() {
    elements.authMessage.className = 'auth-message';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
        // Images
        jpg: { icon: 'fa-file-image', class: 'image' },
        jpeg: { icon: 'fa-file-image', class: 'image' },
        png: { icon: 'fa-file-image', class: 'image' },
        gif: { icon: 'fa-file-image', class: 'image' },
        svg: { icon: 'fa-file-image', class: 'image' },
        webp: { icon: 'fa-file-image', class: 'image' },

        // Videos
        mp4: { icon: 'fa-file-video', class: 'video' },
        webm: { icon: 'fa-file-video', class: 'video' },
        mov: { icon: 'fa-file-video', class: 'video' },
        avi: { icon: 'fa-file-video', class: 'video' },

        // Documents
        pdf: { icon: 'fa-file-pdf', class: 'document' },
        doc: { icon: 'fa-file-word', class: 'document' },
        docx: { icon: 'fa-file-word', class: 'document' },
        xls: { icon: 'fa-file-excel', class: 'document' },
        xlsx: { icon: 'fa-file-excel', class: 'document' },
        ppt: { icon: 'fa-file-powerpoint', class: 'document' },
        pptx: { icon: 'fa-file-powerpoint', class: 'document' },
        txt: { icon: 'fa-file-lines', class: 'document' },

        // Audio
        mp3: { icon: 'fa-file-audio', class: 'audio' },
        wav: { icon: 'fa-file-audio', class: 'audio' },
        ogg: { icon: 'fa-file-audio', class: 'audio' },

        // Archives
        zip: { icon: 'fa-file-zipper', class: 'archive' },
        rar: { icon: 'fa-file-zipper', class: 'archive' },
        '7z': { icon: 'fa-file-zipper', class: 'archive' },
        tar: { icon: 'fa-file-zipper', class: 'archive' },
        gz: { icon: 'fa-file-zipper', class: 'archive' },

        // Code
        js: { icon: 'fa-file-code', class: 'document' },
        ts: { icon: 'fa-file-code', class: 'document' },
        html: { icon: 'fa-file-code', class: 'document' },
        css: { icon: 'fa-file-code', class: 'document' },
        json: { icon: 'fa-file-code', class: 'document' },
        py: { icon: 'fa-file-code', class: 'document' }
    };

    return iconMap[ext] || { icon: 'fa-file', class: '' };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// API Functions - Matching FastAPI Backend
// ==========================================

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle empty response
        const text = await response.text();
        let data = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = { message: text };
            }
        }

        if (!response.ok) {
            throw new Error(data?.detail || data?.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// ==========================================
// Auth API - Matches /auth endpoints
// ==========================================

/**
 * Login user - POST /auth/login
 * Backend expects JSON body with email and password
 */
async function login(email, password) {
    return await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

/**
 * Register user - POST /auth/register
 */
async function register(email, password) {
    return await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

// ==========================================
// Folders API - Matches /folders endpoints
// ==========================================

/**
 * Get all folders (owned + shared) - GET /folders/
 */
async function getFolders() {
    return await apiRequest('/folders/');
}

/**
 * Create new folder - POST /folders/
 */
async function createFolder(name) {
    return await apiRequest('/folders/', {
        method: 'POST',
        body: JSON.stringify({ name })
    });
}

/**
 * Share folder with user - POST /folders/share
 */
async function shareFolder(folderId, userEmail) {
    return await apiRequest('/folders/share', {
        method: 'POST',
        body: JSON.stringify({
            folder_id: folderId,
            user_email: userEmail
        })
    });
}

// ==========================================
// Files API - Matches /files endpoints
// ==========================================

/**
 * Get files in folder - GET /folders/{folder_id}/files
 */
async function getFiles(folderId) {
    return await apiRequest(`/folders/${folderId}/files`);
}

/**
 * Get upload URL - POST /upload/{folder_id}
 * Returns presigned S3 upload URL
 */
async function getUploadUrl(folderId, filename) {
    return await apiRequest(`/upload/${folderId}`, {
        method: 'POST',
        body: JSON.stringify({ filename })
    });
}

/**
 * Get download URL - GET /download/{file_id}
 * Returns presigned S3 download URL
 */
async function getDownloadUrl(fileId) {
    return await apiRequest(`/download/${fileId}`);
}

// ==========================================
// Auth Functions
// ==========================================

function initAuth() {
    // Check for existing session
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    const user = localStorage.getItem(CONFIG.USER_KEY);

    if (token && user) {
        state.token = token;
        state.user = JSON.parse(user);
        showDashboard();
    } else {
        showAuth();
    }
}

function showAuth() {
    elements.authContainer.classList.remove('hidden');
    elements.dashboardContainer.classList.add('hidden');
}

function showDashboard() {
    elements.authContainer.classList.add('hidden');
    elements.dashboardContainer.classList.remove('hidden');
    elements.userEmail.textContent = state.user.email;
    loadFolders();
}

function logout() {
    state.token = null;
    state.user = null;
    state.folders = [];
    state.files = [];
    state.currentFolderId = null;
    state.currentFolder = null;

    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);

    showAuth();
    showToast('info', 'Logged Out', 'You have been successfully logged out');
}

// ==========================================
// View Functions
// ==========================================

function switchToFoldersView() {
    state.currentView = 'folders';
    state.currentFolderId = null;
    state.currentFolder = null;

    elements.foldersView.classList.remove('hidden');
    elements.filesView.classList.add('hidden');
    elements.breadcrumb.classList.add('hidden');
    elements.createFolderBtn.classList.remove('hidden');

    elements.pageTitle.textContent = state.isSharedView ? 'Shared with Me' : 'My Folders';
}

function switchToFilesView(folder) {
    state.currentView = 'files';
    state.currentFolderId = folder.id;
    state.currentFolder = folder;

    elements.foldersView.classList.add('hidden');
    elements.filesView.classList.remove('hidden');
    elements.breadcrumb.classList.remove('hidden');
    elements.createFolderBtn.classList.add('hidden');

    elements.currentFolderName.textContent = folder.name;
    elements.pageTitle.textContent = folder.name;

    // Hide share/upload buttons for shared folders (not owned)
    const isOwner = folder.owner_id === state.user.id || !folder.owner_id;
    elements.uploadBtn.style.display = isOwner ? '' : 'none';
    elements.shareFolderBtn.style.display = isOwner ? '' : 'none';

    loadFiles(folder.id);
}

// ==========================================
// Render Functions
// ==========================================

function renderFolders() {
    const folders = state.folders;

    if (!folders || folders.length === 0) {
        elements.foldersGrid.innerHTML = '';
        elements.emptyFolders.classList.remove('hidden');
        return;
    }

    elements.emptyFolders.classList.add('hidden');

    elements.foldersGrid.innerHTML = folders.map(folder => {
        // Determine if this is a shared folder (we don't own it)
        const isShared = folder.owner_id && folder.owner_id !== state.user.id;

        return `
            <div class="folder-card" data-folder-id="${folder.id}">
                ${isShared ? '<div class="shared-badge"><i class="fas fa-share"></i> Shared</div>' : ''}
                <div class="folder-icon">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="folder-name">${escapeHtml(folder.name)}</div>
                <div class="folder-meta">
                    <span><i class="fas fa-key"></i> ${folder.s3_prefix ? folder.s3_prefix.split('/')[0].substring(0, 8) + '...' : 'Local'}</span>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.folder-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.folder-action-btn')) return;
            const folderId = parseInt(card.dataset.folderId);
            const folder = folders.find(f => f.id === folderId);
            if (folder) switchToFilesView(folder);
        });
    });
}

function renderFiles() {
    const files = state.files;

    if (!files || files.length === 0) {
        elements.filesGrid.innerHTML = '';
        elements.emptyFiles.classList.remove('hidden');
        return;
    }

    elements.emptyFiles.classList.add('hidden');

    elements.filesGrid.innerHTML = files.map(file => {
        const { icon, class: iconClass } = getFileIcon(file.filename);
        return `
            <div class="file-card" data-file-id="${file.id}">
                <div class="file-icon ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="file-name" title="${escapeHtml(file.filename)}">${escapeHtml(file.filename)}</div>
                <div class="file-size">${formatFileSize(file.size || 0)}</div>
                <div class="file-actions">
                    <button class="file-action-btn download-file" data-file-id="${file.id}" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add download handlers
    document.querySelectorAll('.download-file').forEach(btn => {
        btn.addEventListener('click', async () => {
            const fileId = parseInt(btn.dataset.fileId);
            await handleDownloadFile(fileId);
        });
    });
}

// ==========================================
// Data Loading Functions
// ==========================================

async function loadFolders() {
    try {
        showLoading();
        const folders = await getFolders();
        state.folders = folders || [];
        renderFolders();
    } catch (error) {
        console.error('Load folders error:', error);
        showToast('error', 'Error', 'Failed to load folders: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function loadFiles(folderId) {
    try {
        showLoading();
        const files = await getFiles(folderId);
        state.files = files || [];
        renderFiles();
    } catch (error) {
        console.error('Load files error:', error);
        showToast('error', 'Error', 'Failed to load files: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ==========================================
// Action Handlers
// ==========================================

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        showLoading();
        hideAuthMessage();

        const data = await login(email, password);

        state.token = data.access_token;
        state.user = { email, id: data.user_id };

        localStorage.setItem(CONFIG.TOKEN_KEY, data.access_token);
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(state.user));

        showDashboard();
        showToast('success', 'Welcome!', 'You have been successfully logged in');
    } catch (error) {
        showAuthMessage('error', error.message || 'Login failed');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
        showAuthMessage('error', 'Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('error', 'Password must be at least 6 characters');
        return;
    }

    try {
        showLoading();
        hideAuthMessage();

        await register(email, password);

        showAuthMessage('success', 'Account created! You can now sign in.');

        // Switch to login tab
        document.querySelector('.tab-btn[data-tab="login"]').click();
        document.getElementById('login-email').value = email;
    } catch (error) {
        showAuthMessage('error', error.message || 'Registration failed');
    } finally {
        hideLoading();
    }
}

async function handleCreateFolder(e) {
    e.preventDefault();

    const nameInput = document.getElementById('folder-name');
    const name = nameInput.value.trim();

    if (!name) return;

    try {
        showLoading();
        await createFolder(name);

        closeModal(elements.createFolderModal);
        nameInput.value = '';

        await loadFolders();
        showToast('success', 'Folder Created', `"${name}" has been created successfully`);
    } catch (error) {
        showToast('error', 'Error', error.message || 'Failed to create folder');
    } finally {
        hideLoading();
    }
}

async function handleShareFolder(e) {
    e.preventDefault();

    const emailInput = document.getElementById('share-email');
    const email = emailInput.value.trim();

    if (!email || !state.currentFolderId) return;

    try {
        showLoading();
        await shareFolder(state.currentFolderId, email);

        closeModal(elements.shareFolderModal);
        emailInput.value = '';

        showToast('success', 'Folder Shared', `Folder has been shared with ${email}`);
    } catch (error) {
        showToast('error', 'Error', error.message || 'Failed to share folder');
    } finally {
        hideLoading();
    }
}

async function handleFileUpload(file) {
    if (!state.currentFolderId) {
        showToast('error', 'Error', 'No folder selected');
        return;
    }

    try {
        elements.uploadProgress.classList.remove('hidden');
        elements.dropZone.style.display = 'none';
        elements.uploadFilename.textContent = file.name;
        elements.progressFill.style.width = '0%';
        elements.uploadStatus.textContent = 'Getting upload URL...';

        // Get presigned URL from backend
        const uploadData = await getUploadUrl(state.currentFolderId, file.name);

        if (!uploadData || !uploadData.upload_url) {
            throw new Error('Failed to get upload URL');
        }

        elements.uploadStatus.textContent = 'Uploading to S3...';

        // Upload directly to S3 using presigned URL
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                elements.progressFill.style.width = `${percent}%`;
                elements.uploadStatus.textContent = `Uploading... ${percent}%`;
            }
        });

        await new Promise((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };
            xhr.onerror = () => reject(new Error('Upload failed - network error'));

            // PUT request to S3 presigned URL
            xhr.open('PUT', uploadData.upload_url);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.send(file);
        });

        elements.uploadStatus.textContent = 'Upload complete!';
        elements.progressFill.style.width = '100%';

        setTimeout(() => {
            closeModal(elements.uploadModal);
            elements.uploadProgress.classList.add('hidden');
            elements.dropZone.style.display = '';
            loadFiles(state.currentFolderId);
        }, 1000);

        showToast('success', 'Upload Complete', `"${file.name}" has been uploaded successfully`);
    } catch (error) {
        console.error('Upload error:', error);
        showToast('error', 'Upload Failed', error.message);
        elements.uploadStatus.textContent = 'Upload failed';
        elements.dropZone.style.display = '';
    }
}

async function handleDownloadFile(fileId) {
    try {
        showLoading();
        const data = await getDownloadUrl(fileId);

        if (!data || !data.download_url) {
            throw new Error('Failed to get download URL');
        }

        // Open download URL in new tab
        window.open(data.download_url, '_blank');

        showToast('success', 'Download Started', 'Your file download has started');
    } catch (error) {
        showToast('error', 'Error', error.message || 'Failed to download file');
    } finally {
        hideLoading();
    }
}

// ==========================================
// Modal Functions
// ==========================================

function openModal(modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function setupModalCloseHandlers(modal) {
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.modal-cancel');

    if (overlay) overlay.addEventListener('click', () => closeModal(modal));
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(modal));
}

// ==========================================
// Event Listeners
// ==========================================

function initEventListeners() {
    // Auth Tab Switching
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            elements.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            hideAuthMessage();

            if (tab === 'login') {
                elements.loginForm.classList.add('active');
                elements.registerForm.classList.remove('active');
            } else {
                elements.loginForm.classList.remove('active');
                elements.registerForm.classList.add('active');
            }
        });
    });

    // Password Toggle
    elements.togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const icon = btn.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });

    // Auth Forms
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);

    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            elements.navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const view = item.dataset.view;
            state.isSharedView = view === 'shared';

            switchToFoldersView();
            loadFolders();

            // Close mobile menu if open
            elements.sidebar.classList.remove('open');
            document.querySelector('.sidebar-overlay')?.classList.remove('active');
        });
    });

    // Mobile Menu
    elements.mobileMenuBtn.addEventListener('click', () => {
        elements.sidebar.classList.add('open');

        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => {
                elements.sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
        overlay.classList.add('active');
    });

    // Logout
    elements.logoutBtn.addEventListener('click', logout);

    // Breadcrumb Back
    document.querySelector('[data-action="back-to-folders"]').addEventListener('click', (e) => {
        e.preventDefault();
        switchToFoldersView();
    });

    // Create Folder
    elements.createFolderBtn.addEventListener('click', () => openModal(elements.createFolderModal));
    elements.emptyCreateFolderBtn.addEventListener('click', () => openModal(elements.createFolderModal));
    elements.createFolderForm.addEventListener('submit', handleCreateFolder);

    // Share Folder
    elements.shareFolderBtn.addEventListener('click', () => openModal(elements.shareFolderModal));
    elements.shareFolderForm.addEventListener('submit', handleShareFolder);

    // Upload
    elements.uploadBtn.addEventListener('click', () => openModal(elements.uploadModal));
    elements.emptyUploadBtn.addEventListener('click', () => openModal(elements.uploadModal));

    // File Input
    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file);
        e.target.value = ''; // Reset input
    });

    // Drag and Drop
    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('dragover');
    });

    elements.dropZone.addEventListener('dragleave', () => {
        elements.dropZone.classList.remove('dragover');
    });

    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    });

    // Click on drop zone to open file dialog
    elements.dropZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
            elements.fileInput.click();
        }
    });

    // Modal Close Handlers
    setupModalCloseHandlers(elements.createFolderModal);
    setupModalCloseHandlers(elements.shareFolderModal);
    setupModalCloseHandlers(elements.uploadModal);

    // Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                closeModal(modal);
            });
        }
    });
}

// ==========================================
// Initialize Application
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('CloudVault - Initializing...');
    console.log('API Base URL:', CONFIG.API_BASE_URL);

    initEventListeners();
    initAuth();

    console.log('CloudVault - Ready!');
});
