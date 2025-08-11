class AccountsManager {
    constructor() {
        this.accounts = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Account form submission
        const accountForm = document.getElementById('accountForm');
        if (accountForm) {
            accountForm.addEventListener('submit', (e) => this.handleAccountSubmit(e));
        }
    }

    async loadAccounts() {
        try {
            this.accounts = await api.getAccounts();
            this.renderAccounts();
        } catch (error) {
            console.error('Error loading accounts:', error);
            dashboard.showError('Failed to load YouTube accounts');
        }
    }

    renderAccounts() {
        const container = document.getElementById('accountsGrid');
        if (!container) return;

        if (this.accounts.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="bi bi-person-plus display-1 text-muted mb-3"></i>
                        <h5 class="text-muted">No YouTube accounts added yet</h5>
                        <p class="text-muted">Add your first YouTube account to start uploading videos</p>
                        <button class="btn btn-gradient" data-bs-toggle="modal" data-bs-target="#accountModal">
                            <i class="bi bi-plus-circle me-2"></i>Add Account
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.accounts.map(account => `
            <div class="col-md-4 mb-4 fade-in">
                <div class="account-card h-100">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="text-gradient mb-1">${account.channel_name}</h5>
                            <p class="text-muted mb-0">${account.email}</p>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-light" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-dark">
                                <li>
                                    <a class="dropdown-item text-danger" href="#" onclick="accountsManager.deleteAccount(${account.id})">
                                        <i class="bi bi-trash me-2"></i>Delete
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="me-3">
                            <span class="badge ${account.is_active ? 'badge-completed' : 'badge-failed'}">
                                ${account.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <small class="text-muted">
                            Added: ${new Date(account.created_at).toLocaleDateString()}
                        </small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async handleAccountSubmit(e) {
        e.preventDefault();
        
        const channelName = document.getElementById('channelName').value;
        const email = document.getElementById('channelEmail').value;
        const password = document.getElementById('channelPassword').value;
        const submitBtn = e.target.querySelector('button[onclick="submitAccount()"]');
        
        try {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding account...';
            submitBtn.disabled = true;
            
            await api.addAccount(channelName, email, password);
            
            // Close modal and refresh accounts
            const modal = bootstrap.Modal.getInstance(document.getElementById('accountModal'));
            modal.hide();
            
            // Clear form
            document.getElementById('accountForm').reset();
            
            // Reload accounts
            await this.loadAccounts();
            
            dashboard.showSuccess('YouTube account added successfully!');
            
        } catch (error) {
            dashboard.showError('Failed to add account: ' + error.message);
        } finally {
            submitBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i>Add Account';
            submitBtn.disabled = false;
        }
    }

    async deleteAccount(accountId) {
        if (!confirm('Are you sure you want to delete this YouTube account?')) {
            return;
        }

        try {
            await api.deleteAccount(accountId);
            await this.loadAccounts();
            dashboard.showSuccess('Account deleted successfully');
        } catch (error) {
            dashboard.showError('Failed to delete account: ' + error.message);
        }
    }
}

// Global function for HTML onclick events
function submitAccount() {
    const event = new Event('submit');
    document.getElementById('accountForm').dispatchEvent(event);
}

// Initialize accounts manager
window.accountsManager = new AccountsManager();