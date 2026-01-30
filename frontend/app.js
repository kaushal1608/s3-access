/**
 * CloudVault - Secure File Portal
 * Frontend JavaScript Application
 * Blue & White Theme - Simplified UI
 */

// ==========================================
// Configuration
// ==========================================

const CONFIG = {
    // Empty string means use the same origin as the frontend
    API_BASE_URL: '',
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
    navItems: document.querySelectorAll('.nav-item[data-view]'),
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
    accessSharedBtn: document.getElementById('access-shared-btn'),

    // Modals
    createFolderModal: document.getElementById('create-folder-modal'),
    shareFolderModal: document.getElementById('share-folder-modal'),
    accessFolderModal: document.getElementById('access-folder-modal'),
    uploadModal: document.getElementById('upload-modal'),

    // Forms
    createFolderForm: document.getElementById('create-folder-form'),
    shareFolderForm: document.getElementById('share-folder-form'),
    accessFolderForm: document.getElementById('access-folder-form'),

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
        jpg: { icon: 'fa-file-image', class: 'image' },
        jpeg: { icon: 'fa-file-image', class: 'image' },
        png: { icon: 'fa-file-image', class: 'image' },
        gif: { icon: 'fa-file-image', class: 'image' },
        pdf: { icon: 'fa-file-pdf', class: 'document' },
        doc: { icon: 'fa-file-word', class: 'document' },
        docx: { icon: 'fa-file-word', class: 'document' },
        xls: { icon: 'fa-file-excel', class: 'document' },
        xlsx: { icon: 'fa-file-excel', class: 'document' },
        mp4: { icon: 'fa-file-video', class: 'video' },
        mp3: { icon: 'fa-file-audio', class: 'audio' },
        zip: { icon: 'fa-file-zipper', class: 'archive' },
        txt: { icon: 'fa-file-lines', class: 'document' }
    };
    return iconMap[ext] || { icon: 'fa-file', class: '' };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// API Functions
// ==========================================

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
        const response = await fetch(url, { ...options, headers });
        const text = await response.text();
        let data = null;
        if (text) {
            try { data = JSON.parse(text); } catch { data = { message: text }; }
        }
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || 'Request failed');
        }
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API
async function login(email, password) {
    return await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

async function register(email, password) {
    return await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

// Folders API
async function getFolders() {
    return await apiRequest('/folders/');
}

async function getSharedFolders() {
    return await apiRequest('/folders/shared');
}

async function createFolder(name) {
    return await apiRequest('/folders/', {
        method: 'POST',
        body: JSON.stringify({ name })
    });
}

async function deleteFolder(folderId) {
    return await apiRequest(`/folders/${folderId}`, {
        method: 'DELETE'
    });
}

async function shareFolder(folderId, password) {
    return await apiRequest('/folders/share', {
        method: 'POST',
        body: JSON.stringify({ folder_id: folderId, access_password: password })
    });
}

async function accessSharedFolder(folderId, password) {
    return await apiRequest('/folders/access', {
        method: 'POST',
        body: JSON.stringify({ folder_id: folderId, access_password: password })
    });
}

// Files API
async function getFiles(folderId) {
    return await apiRequest(`/folders/${folderId}/files`);
}

async function getUploadUrl(folderId, filename) {
    return await apiRequest(`/upload/${folderId}`, {
        method: 'POST',
        body: JSON.stringify({ filename })
    });
}

async function getDownloadUrl(fileId) {
    return await apiRequest(`/download/${fileId}`);
}

async function deleteFile(fileId) {
    return await apiRequest(`/files/${fileId}`, {
        method: 'DELETE'
    });
}

// ==========================================
// Auth Functions
// ==========================================

function initAuth() {
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

    // Show/hide upload and share buttons based on ownership
    const isOwner = folder.owner_id === state.user.id;
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
        const isOwner = folder.owner_id === state.user.id;
        const isShared = folder.is_shared || (!isOwner && folder.owner_id);

        return `
            <div class="folder-card" data-folder-id="${folder.id}">
                ${isShared ? '<div class="shared-badge"><i class="fas fa-share"></i> Shared</div>' : ''}
                ${isOwner ? `
                    <div class="folder-actions">
                        <button class="folder-action-btn delete" data-folder-id="${folder.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
                <div class="folder-icon">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="folder-name">${escapeHtml(folder.name)}</div>
                <div class="folder-meta">
                    <span>ID: ${folder.id}</span>
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

    // Add delete handlers
    document.querySelectorAll('.folder-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const folderId = parseInt(btn.dataset.folderId);
            if (confirm('Are you sure you want to delete this folder? All files will be deleted.')) {
                await handleDeleteFolder(folderId);
            }
        });
    });
}

function renderFiles() {
    const files = state.files;
    const isOwner = state.currentFolder && state.currentFolder.owner_id === state.user.id;

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
                    ${isOwner ? `
                        <button class="file-action-btn delete delete-file" data-file-id="${file.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
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

    // Add delete handlers
    document.querySelectorAll('.delete-file').forEach(btn => {
        btn.addEventListener('click', async () => {
            const fileId = parseInt(btn.dataset.fileId);
            if (confirm('Are you sure you want to delete this file?')) {
                await handleDeleteFile(fileId);
            }
        });
    });
}

// ==========================================
// Data Loading Functions
// ==========================================

async function loadFolders() {
    try {
        showLoading();
        const folders = state.isSharedView ? await getSharedFolders() : await getFolders();
        state.folders = folders || [];
        renderFolders();
    } catch (error) {
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
        console.log('Login response:', data);

        state.token = data.access_token;
        state.user = { email: data.email || email, id: data.user_id };
        console.log('User state set:', state.user);

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

    try {
        showLoading();
        hideAuthMessage();

        await register(email, password);

        showAuthMessage('success', 'Account created! You can now sign in.');
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
        showToast('success', 'Folder Created', `"${name}" has been created`);
    } catch (error) {
        showToast('error', 'Error', error.message);
    } finally {
        hideLoading();
    }
}

async function handleDeleteFolder(folderId) {
    try {
        showLoading();
        await deleteFolder(folderId);
        await loadFolders();
        showToast('success', 'Folder Deleted', 'The folder has been deleted');
    } catch (error) {
        showToast('error', 'Error', error.message);
    } finally {
        hideLoading();
    }
}

async function handleShareFolder(e) {
    e.preventDefault();

    const passwordInput = document.getElementById('share-password');
    const password = passwordInput.value;

    if (!password || !state.currentFolderId) return;

    try {
        showLoading();
        await shareFolder(state.currentFolderId, password);

        closeModal(elements.shareFolderModal);
        passwordInput.value = '';

        showToast('success', 'Folder Shared', `Share this password with others: ${password}\nFolder ID: ${state.currentFolderId}`);
    } catch (error) {
        showToast('error', 'Error', error.message);
    } finally {
        hideLoading();
    }
}

async function handleAccessFolder(e) {
    e.preventDefault();

    const folderIdInput = document.getElementById('access-folder-id');
    const passwordInput = document.getElementById('access-password');

    const folderId = parseInt(folderIdInput.value);
    const password = passwordInput.value;

    if (!folderId || !password) return;

    try {
        showLoading();
        await accessSharedFolder(folderId, password);

        closeModal(elements.accessFolderModal);
        folderIdInput.value = '';
        passwordInput.value = '';

        showToast('success', 'Access Granted', 'You now have access to this folder');
        await loadFolders();
    } catch (error) {
        showToast('error', 'Access Denied', error.message);
    } finally {
        hideLoading();
    }
}

async function handleDeleteFile(fileId) {
    try {
        showLoading();
        await deleteFile(fileId);
        await loadFiles(state.currentFolderId);
        showToast('success', 'File Deleted', 'The file has been deleted');
    } catch (error) {
        showToast('error', 'Error', error.message);
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

        const uploadData = await getUploadUrl(state.currentFolderId, file.name);

        if (!uploadData || !uploadData.upload_url) {
            throw new Error('Failed to get upload URL');
        }

        elements.uploadStatus.textContent = 'Uploading...';

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
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error(`Upload failed: ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error('Upload failed'));
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

        showToast('success', 'Upload Complete', `"${file.name}" uploaded`);
    } catch (error) {
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

        window.open(data.download_url, '_blank');
        showToast('success', 'Download Started', 'Your download has started');
    } catch (error) {
        showToast('error', 'Error', error.message);
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
        });
    });

    // Mobile Menu
    if (elements.mobileMenuBtn) {
        elements.mobileMenuBtn.addEventListener('click', () => {
            elements.sidebar.classList.add('open');
        });
    }

    // Logout
    elements.logoutBtn.addEventListener('click', logout);

    // Breadcrumb Back
    document.querySelector('[data-action="back-to-folders"]')?.addEventListener('click', (e) => {
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

    // Access Shared Folder
    if (elements.accessSharedBtn) {
        elements.accessSharedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(elements.accessFolderModal);
        });
    }
    if (elements.accessFolderForm) {
        elements.accessFolderForm.addEventListener('submit', handleAccessFolder);
    }

    // Upload
    elements.uploadBtn.addEventListener('click', () => openModal(elements.uploadModal));
    elements.emptyUploadBtn.addEventListener('click', () => openModal(elements.uploadModal));

    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file);
        e.target.value = '';
    });

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

    elements.dropZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
            elements.fileInput.click();
        }
    });

    // Modal Close Handlers
    setupModalCloseHandlers(elements.createFolderModal);
    setupModalCloseHandlers(elements.shareFolderModal);
    setupModalCloseHandlers(elements.uploadModal);
    if (elements.accessFolderModal) {
        setupModalCloseHandlers(elements.accessFolderModal);
    }

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
// Initialize
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('CloudVault - Initializing...');
    initEventListeners();
    initAuth();
    console.log('CloudVault - Ready!');
});
