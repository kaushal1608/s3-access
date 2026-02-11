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
    isSharedView: false,
    ldapEnabled: false,
    authMethod: 'local',  // 'local' or 'ldap'
    adDomain: null
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
    profileModal: document.getElementById('profile-modal'),
    userProfileBtn: document.getElementById('user-profile-btn'),
    previewModal: document.getElementById('preview-modal'),
    settingsModal: document.getElementById('settings-modal'),
    settingsBtn: document.getElementById('settings-btn'),

    // Forms
    createFolderForm: document.getElementById('create-folder-form'),
    shareFolderForm: document.getElementById('share-folder-form'),
    accessFolderForm: document.getElementById('access-folder-form'),
    changePasswordForm: document.getElementById('change-password-form'),

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

function isFilePreviewable(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const previewableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'];
    return previewableExtensions.includes(ext);
}

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
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

async function getUploadUrl(folderId, filename, contentType) {
    return await apiRequest(`/upload/${folderId}`, {
        method: 'POST',
        body: JSON.stringify({ filename, content_type: contentType || 'application/octet-stream' })
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

    // Configure settings visibility based on user role and auth_type
    const passwordSection = document.getElementById('password-change-section');
    const ldapNotice = document.getElementById('ldap-password-notice');
    const ldapConfigSection = document.getElementById('ldap-config-section');

    if (state.user.auth_type === 'ldap') {
        // LDAP users: hide password change, show notice
        if (passwordSection) passwordSection.classList.add('hidden');
        if (ldapNotice) ldapNotice.classList.remove('hidden');
    } else {
        // Local users: show password change, hide notice
        if (passwordSection) passwordSection.classList.remove('hidden');
        if (ldapNotice) ldapNotice.classList.add('hidden');
    }

    // Only admin users (with .local domain) can see LDAP config
    if (state.user.role === 'admin') {
        if (ldapConfigSection) ldapConfigSection.classList.remove('hidden');
        loadLdapConfig();
    } else {
        if (ldapConfigSection) ldapConfigSection.classList.add('hidden');
    }

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
        const isPreviewable = isFilePreviewable(file.filename);
        return `
            <div class="file-card" data-file-id="${file.id}">
                <div class="file-icon ${iconClass}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="file-name" title="${escapeHtml(file.filename)}">${escapeHtml(file.filename)}</div>
                <div class="file-size">${formatFileSize(file.size || 0)}</div>
                <div class="file-actions">
                    ${isPreviewable ? `
                        <button class="file-action-btn preview-file" data-file-id="${file.id}" data-filename="${escapeHtml(file.filename)}" title="Preview">
                            <i class="fas fa-eye"></i>
                        </button>
                    ` : ''}
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

    // Add preview handlers
    document.querySelectorAll('.preview-file').forEach(btn => {
        btn.addEventListener('click', async () => {
            const fileId = parseInt(btn.dataset.fileId);
            const filename = btn.dataset.filename;
            await handlePreviewFile(fileId, filename);
        });
    });

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
    const ldapIdentifier = document.getElementById('ldap-username')?.value || null;

    try {
        showLoading();
        hideAuthMessage();

        let loginPayload;
        if (state.authMethod === 'ldap') {
            // LDAP login: use identifier (EIN or username), email is optional
            if (!ldapIdentifier) {
                showAuthMessage('error', 'Please enter your Employee ID or AD username');
                return;
            }
            loginPayload = {
                password,
                auth_method: 'ldap',
                identifier: ldapIdentifier
            };
        } else {
            // Local login: use email
            if (!email) {
                showAuthMessage('error', 'Please enter your email address');
                return;
            }
            loginPayload = {
                email,
                password,
                auth_method: 'local'
            };
        }

        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginPayload)
        });
        console.log('Login response:', data);

        state.token = data.access_token;
        state.user = {
            email: data.email || email,
            id: data.user_id,
            role: data.role || 'user',
            auth_type: data.auth_type || 'local'
        };
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

        // Determine the content type from the file — this MUST be sent to the backend
        // so the presigned URL is signed with the exact same Content-Type we'll use during upload.
        const contentType = file.type || 'application/octet-stream';
        const uploadData = await getUploadUrl(state.currentFolderId, file.name, contentType);

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
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    // Log full S3 error response for debugging
                    console.error('S3 Upload Error:', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText,
                        uploadUrl: uploadData.upload_url.substring(0, 100) + '...',
                        contentType: contentType
                    });
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            };
            xhr.onerror = () => {
                console.error('S3 Upload Network Error - this may be a CORS issue');
                reject(new Error('Upload failed - network error (check CORS)'));
            };
            xhr.open('PUT', uploadData.upload_url);
            xhr.setRequestHeader('Content-Type', contentType);
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

async function handlePreviewFile(fileId, filename) {
    try {
        showLoading();
        const data = await getDownloadUrl(fileId);

        if (!data || !data.download_url) {
            throw new Error('Failed to get file URL');
        }

        const previewContent = document.getElementById('preview-content');
        const previewFilename = document.getElementById('preview-filename');
        const previewDownloadBtn = document.getElementById('preview-download-btn');

        previewFilename.textContent = filename;
        previewDownloadBtn.href = data.download_url;
        previewDownloadBtn.download = filename;

        const ext = getFileExtension(filename);

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
            previewContent.innerHTML = `<img src="${data.download_url}" alt="${escapeHtml(filename)}" style="max-width: 100%; max-height: 65vh; object-fit: contain; border-radius: 8px;">`;
        } else if (ext === 'pdf') {
            previewContent.innerHTML = `<iframe src="${data.download_url}" style="width: 80vw; height: 70vh; border: none; border-radius: 8px;"></iframe>`;
        } else {
            previewContent.innerHTML = `<p>Preview not available for this file type.</p>`;
        }

        openModal(elements.previewModal);
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
        elements.mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (elements.sidebar.classList.contains('active') &&
                !elements.sidebar.contains(e.target) &&
                e.target !== elements.mobileMenuBtn) {
                elements.sidebar.classList.remove('active');
            }
        });
    }

    // Logout
    elements.logoutBtn.addEventListener('click', logout);

    // Profile
    if (elements.userProfileBtn) {
        elements.userProfileBtn.addEventListener('click', () => {
            if (state.user) {
                document.getElementById('profile-email-display').value = state.user.email;
                document.getElementById('profile-id-display').value = state.user.id || 'N/A';
                document.getElementById('profile-role-display').value = state.user.role || 'user';
                document.getElementById('profile-auth-display').value =
                    state.user.auth_type === 'ldap' ? 'Active Directory (LDAP)' : 'Local';
            }
            openModal(elements.profileModal);
        });
    }

    // Settings
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', () => {
            openModal(elements.settingsModal);
        });
    }

    // Change Password Form
    if (elements.changePasswordForm) {
        elements.changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                showToast('error', 'Error', 'Passwords do not match');
                return;
            }

            if (newPassword.length < 6) {
                showToast('error', 'Error', 'Password must be at least 6 characters');
                return;
            }

            try {
                showLoading();
                await apiRequest('/auth/change-password', {
                    method: 'POST',
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                showToast('success', 'Password Updated', 'Your password has been changed successfully');
                closeModal(elements.settingsModal);
                elements.changePasswordForm.reset();
            } catch (error) {
                showToast('error', 'Error', error.message || 'Failed to change password');
            } finally {
                hideLoading();
            }
        });
    }

    // LDAP Auth Method Toggle
    document.querySelectorAll('.auth-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.auth-method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.authMethod = btn.dataset.method;

            const ldapUsernameGroup = document.getElementById('ldap-username-group');
            const loginEmailGroup = document.getElementById('login-email-group');
            if (state.authMethod === 'ldap') {
                // Show EIN field, hide email field
                ldapUsernameGroup.classList.remove('hidden');
                if (loginEmailGroup) loginEmailGroup.classList.add('hidden');
                // Remove required from email since LDAP doesn't need it
                document.getElementById('login-email').removeAttribute('required');
            } else {
                // Show email field, hide EIN field
                ldapUsernameGroup.classList.add('hidden');
                if (loginEmailGroup) loginEmailGroup.classList.remove('hidden');
                document.getElementById('login-email').setAttribute('required', '');
            }
        });
    });

    // LDAP Config Form (admin only)
    const ldapConfigForm = document.getElementById('ldap-config-form');
    if (ldapConfigForm) {
        ldapConfigForm.addEventListener('submit', handleSaveLdapConfig);
    }

    // LDAP Test Connection
    const ldapTestBtn = document.getElementById('ldap-test-btn');
    if (ldapTestBtn) {
        ldapTestBtn.addEventListener('click', handleTestLdapConnection);
    }

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
    if (elements.previewModal) {
        setupModalCloseHandlers(elements.previewModal);
    }
    if (elements.settingsModal) {
        setupModalCloseHandlers(elements.settingsModal);
    }
    if (elements.profileModal) {
        setupModalCloseHandlers(elements.profileModal);
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
// LDAP Functions
// ==========================================

async function checkLdapStatus() {
    try {
        const data = await apiRequest('/auth/ldap/status');
        state.ldapEnabled = data.ldap_enabled;
        state.adDomain = data.ad_domain;

        const ldapToggle = document.getElementById('ldap-login-toggle');
        const ldapDomainHint = document.getElementById('ldap-domain-hint');

        if (state.ldapEnabled && ldapToggle) {
            ldapToggle.classList.remove('hidden');
            if (ldapDomainHint && state.adDomain) {
                ldapDomainHint.textContent = `Domain: ${state.adDomain}`;
            }
        }
    } catch (error) {
        console.log('LDAP status check failed (non-critical):', error.message);
    }
}

async function loadLdapConfig() {
    try {
        const config = await apiRequest('/auth/ldap/config');
        // Populate the form
        document.getElementById('ldap-enabled').checked = config.is_enabled;
        document.getElementById('ldap-server-url').value = config.server_url || '';
        document.getElementById('ldap-base-dn').value = config.base_dn || '';
        document.getElementById('ldap-user-search-base').value = config.user_search_base || '';
        document.getElementById('ldap-bind-dn').value = config.bind_dn || '';
        document.getElementById('ldap-ad-domain').value = config.ad_domain || '';
        document.getElementById('ldap-search-filter').value = config.user_search_filter || '';
        document.getElementById('ldap-ein-search-filter').value = config.ein_search_filter || '(&(objectClass=user)(employeeID={ein}))';
        document.getElementById('ldap-email-attr').value = config.email_attribute || 'mail';
        document.getElementById('ldap-username-attr').value = config.username_attribute || 'sAMAccountName';
        document.getElementById('ldap-ein-attr').value = config.ein_attribute || 'employeeID';
        document.getElementById('ldap-use-ssl').checked = config.use_ssl;
        document.getElementById('ldap-use-tls').checked = config.use_tls;
        // Note: bind_password is never returned from server
    } catch (error) {
        // 404 means not configured yet, which is fine
        if (!error.message.includes('404') && !error.message.includes('not configured')) {
            console.log('LDAP config load failed:', error.message);
        }
    }
}

async function handleSaveLdapConfig(e) {
    e.preventDefault();

    const configData = {
        is_enabled: document.getElementById('ldap-enabled').checked,
        server_url: document.getElementById('ldap-server-url').value,
        base_dn: document.getElementById('ldap-base-dn').value,
        user_search_base: document.getElementById('ldap-user-search-base').value || null,
        bind_dn: document.getElementById('ldap-bind-dn').value,
        bind_password: document.getElementById('ldap-bind-password').value || null,
        ad_domain: document.getElementById('ldap-ad-domain').value || null,
        user_search_filter: document.getElementById('ldap-search-filter').value || '(&(objectClass=user)(sAMAccountName={username}))',
        ein_search_filter: document.getElementById('ldap-ein-search-filter').value || '(&(objectClass=user)(employeeID={ein}))',
        email_attribute: document.getElementById('ldap-email-attr').value || 'mail',
        username_attribute: document.getElementById('ldap-username-attr').value || 'sAMAccountName',
        ein_attribute: document.getElementById('ldap-ein-attr').value || 'employeeID',
        use_ssl: document.getElementById('ldap-use-ssl').checked,
        use_tls: document.getElementById('ldap-use-tls').checked
    };

    if (!configData.server_url || !configData.base_dn || !configData.bind_dn) {
        showToast('error', 'Validation Error', 'Server URL, Base DN, and Bind DN are required');
        return;
    }

    try {
        showLoading();

        // Try PUT first (update), if 404 then POST (create)
        try {
            await apiRequest('/auth/ldap/config', {
                method: 'PUT',
                body: JSON.stringify(configData)
            });
        } catch (error) {
            if (error.message.includes('not configured') || error.message.includes('404')) {
                // Need bind_password for initial creation
                if (!configData.bind_password) {
                    showToast('error', 'Error', 'Bind Password is required for initial LDAP setup');
                    return;
                }
                await apiRequest('/auth/ldap/config', {
                    method: 'POST',
                    body: JSON.stringify(configData)
                });
            } else {
                throw error;
            }
        }

        showToast('success', 'LDAP Saved', 'LDAP configuration has been saved securely');
        // Clear bind password field after save
        document.getElementById('ldap-bind-password').value = '';
    } catch (error) {
        showToast('error', 'Error', error.message || 'Failed to save LDAP config');
    } finally {
        hideLoading();
    }
}

async function handleTestLdapConnection() {
    const resultDiv = document.getElementById('ldap-test-result');
    const testData = {
        server_url: document.getElementById('ldap-server-url').value,
        bind_dn: document.getElementById('ldap-bind-dn').value,
        bind_password: document.getElementById('ldap-bind-password').value,
        base_dn: document.getElementById('ldap-base-dn').value,
        use_ssl: document.getElementById('ldap-use-ssl').checked,
        use_tls: document.getElementById('ldap-use-tls').checked
    };

    if (!testData.server_url || !testData.bind_dn || !testData.bind_password || !testData.base_dn) {
        showToast('error', 'Error', 'Fill in Server URL, Bind DN, Bind Password, and Base DN to test');
        return;
    }

    try {
        showLoading();
        const data = await apiRequest('/auth/ldap/test', {
            method: 'POST',
            body: JSON.stringify(testData)
        });

        resultDiv.classList.remove('hidden');
        if (data.success) {
            resultDiv.style.background = 'rgba(34,197,94,0.15)';
            resultDiv.style.color = '#22c55e';
            resultDiv.innerHTML = '<i class="fas fa-check-circle"></i> ' + data.message;
        } else {
            resultDiv.style.background = 'rgba(239,68,68,0.15)';
            resultDiv.style.color = '#ef4444';
            resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> ' + data.message;
        }
    } catch (error) {
        resultDiv.classList.remove('hidden');
        resultDiv.style.background = 'rgba(239,68,68,0.15)';
        resultDiv.style.color = '#ef4444';
        resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> ' + (error.message || 'Connection test failed');
    } finally {
        hideLoading();
    }
}

// ==========================================
// Initialize
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('CloudVault - Initializing...');
    initEventListeners();
    initAuth();
    checkLdapStatus();  // Check if LDAP is enabled (for login page toggle)
    console.log('CloudVault - Ready!');
});
