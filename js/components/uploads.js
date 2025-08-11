class UploadsManager {
    constructor() {
        this.uploadTasks = [];
        this.accounts = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWebSocketListeners();
    }

    setupEventListeners() {
        // Upload form submission
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleUploadSubmit(e));
        }

        // File drag and drop
        const fileInput = document.getElementById('uploadFile');
        if (fileInput) {
            this.setupFileDragDrop(fileInput);
        }
    }

    setupWebSocketListeners() {
        // Listen for upload progress updates
        wsManager.on('upload_progress', (data) => {
            this.updateUploadProgress(data.task_id, data.progress, data.status);
        });

        wsManager.on('upload_completed', (data) => {
            this.handleUploadCompleted(data.task_id);
        });

        wsManager.on('upload_failed', (data) => {
            this.handleUploadFailed(data.task_id, data.error);
        });
    }

    setupFileDragDrop(fileInput) {
        const dropArea = fileInput.parentElement;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('dragover');
            });
        });

        dropArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                this.updateFileInputLabel(files[0].name);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.updateFileInputLabel(e.target.files[0].name);
            }
        });
    }

    updateFileInputLabel(filename) {
        const fileInput = document.getElementById('uploadFile');
        const label = fileInput.nextElementSibling;
        if (label) {
            label.textContent = filename;
        }
    }

    async loadUploadTasks() {
        try {
            this.uploadTasks = await api.getUploadTasks();
            this.accounts = await api.getAccounts();
            this.renderUploadTasks();
            this.updateAccountDropdown();
        } catch (error) {
            console.error('Error loading upload tasks:', error);
            dashboard.showError('Failed to load upload tasks');
        }
    }

    renderUploadTasks() {
        const tbody = document.getElementById('uploadsTableBody');
        if (!tbody) return;

        if (this.uploadTasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="bi bi-upload display-4 text-muted mb-3 d-block"></i>
                        <h5 class="text-muted">No upload tasks yet</h5>
                        <p class="text-muted mb-3">Create your first upload task to get started</p>
                        <button class="btn btn-gradient" data-bs-toggle="modal" data-bs-target="#uploadModal">
                            <i class="bi bi-plus-circle me-2"></i>New Upload
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.uploadTasks.map(task => `
            <tr class="fade-in">
                <td><strong>#${task.id}</strong></td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${task.title}">
                        ${task.title}
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-person-circle me-2"></i>
                        ${task.youtube_account.channel_name}
                    </div>
                </td>
                <td>
                    <span class="badge badge-${task.status}">
                        ${this.formatStatus(task.status)}
                    </span>
                </td>
                <td>
                    <div class="progress mb-1" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${task.progress}%" 
                             aria-valuenow="${task.progress}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted">${task.progress}%</small>
                </td>
                <td>
                    <small class="text-muted">
                        ${new Date(task.created_at).toLocaleString()}
                    </small>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        ${task.status === 'failed' ? 
                            `<button class="btn btn-outline-warning btn-sm" onclick="uploadsManager.retryUpload(${task.id})" title="Retry">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>` : ''
                        }
                        <button class="btn btn-outline-danger btn-sm" onclick="uploadsManager.deleteUpload(${task.id})" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                        ${task.error_message ? 
                            `<button class="btn btn-outline-info btn-sm" onclick="uploadsManager.showError('${task.error_message}')" title="Show Error">
                                <i class="bi bi-exclamation-circle"></i>
                            </button>` : ''
                        }
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateAccountDropdown() {
        const select = document.getElementById('uploadAccount');
        if (!select) return;

        select.innerHTML = '<option value="">Select Account</option>' + 
            this.accounts.map(account => 
                `<option value="${account.id}">${account.channel_name} (${account.email})</option>`
            ).join('');
    }

    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'uploading': 'Uploading...',
            'completed': 'Completed',
            'failed': 'Failed'
        };
        return statusMap[status] || status;
    }

    async handleUploadSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('youtube_account_id', document.getElementById('uploadAccount').value);
        formData.append('title', document.getElementById('uploadTitle').value);
        formData.append('description', document.getElementById('uploadDescription').value);
        formData.append('tags', document.getElementById('uploadTags').value);
        formData.append('privacy', document.getElementById('uploadPrivacy').value);
        formData.append('video_file', document.getElementById('uploadFile').files[0]);

        const submitBtn = document.querySelector('button[onclick="submitUpload()"]');
        
        try {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating upload...';
            submitBtn.disabled = true;
            
            await api.createUploadTask(formData);
            
            // Close modal and refresh tasks
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            modal.hide();
            
            // Clear form
            document.getElementById('uploadForm').reset();
            
            // Reload upload tasks
            await this.loadUploadTasks();
            
            dashboard.showSuccess('Upload task created successfully!');
            
        } catch (error) {
            dashboard.showError('Failed to create upload task: ' + error.message);
        } finally {
            submitBtn.innerHTML = '<i class="bi bi-upload me-2"></i>Start Upload';
            submitBtn.disabled = false;
        }
    }

    async deleteUpload(taskId) {
        if (!confirm('Are you sure you want to delete this upload task?')) {
            return;
        }

        try {
            await api.deleteUploadTask(taskId);
            await this.loadUploadTasks();
            dashboard.showSuccess('Upload task deleted successfully');
        } catch (error) {
            dashboard.showError('Failed to delete upload task: ' + error.message);
        }
    }

    async retryUpload(taskId) {
        try {
            await api.retryUploadTask(taskId);
            await this.loadUploadTasks();
            dashboard.showSuccess('Upload task restarted');
        } catch (error) {
            dashboard.showError('Failed to retry upload: ' + error.message);
        }
    }

    updateUploadProgress(taskId, progress, status) {
        const task = this.uploadTasks.find(t => t.id === taskId);
        if (task) {
            task.progress = progress;
            task.status = status;
            this.renderUploadTasks();
        }
    }

    handleUploadCompleted(taskId) {
        const task = this.uploadTasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'completed';
            task.progress = 100;
            this.renderUploadTasks();
            dashboard.showSuccess(`Upload "${task.title}" completed successfully!`);
        }
    }

    handleUploadFailed(taskId, error) {
        const task = this.uploadTasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'failed';
            task.error_message = error;
            this.renderUploadTasks();
            dashboard.showError(`Upload "${task.title}" failed: ${error}`);
        }
    }

    showError(message) {
        dashboard.showError(message);
    }
}

// Global function for HTML onclick events
function submitUpload() {
    const event = new Event('submit');
    document.getElementById('uploadForm').dispatchEvent(event);
}

// Initialize uploads manager
window.uploadsManager = new UploadsManager();