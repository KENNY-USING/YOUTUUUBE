class Dashboard {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Tab change events
        const tabElements = document.querySelectorAll('#mainTabs button[data-bs-toggle="pill"]');
        tabElements.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => this.handleTabChange(e.target.id));
        });
    }

    checkAuthentication() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            this.showMainApp();
            this.loadInitialData();
        } else {
            this.showLoginModal();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';
            submitBtn.disabled = true;
            
            const response = await api.login(username, password);
            this.currentUser = response.user;
            this.showMainApp();
            this.loadInitialData();
            
        } catch (error) {
            this.showError('Login failed: ' + error.message);
        } finally {
            submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Login';
            submitBtn.disabled = false;
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
            submitBtn.disabled = true;
            
            const response = await api.register(username, email, password);
            this.currentUser = response.user;
            this.showMainApp();
            this.loadInitialData();
            
        } catch (error) {
            this.showError('Registration failed: ' + error.message);
        } finally {
            submitBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Register';
            submitBtn.disabled = false;
        }
    }

    showLoginModal() {
        document.getElementById('mainApp').style.display = 'none';
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }

    showMainApp() {
        document.getElementById('mainApp').style.display = 'block';
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) {
            loginModal.hide();
        }
        
        // Update user info
        document.getElementById('userInfo').textContent = `Welcome, ${this.currentUser.username}`;
        
        // Connect WebSocket
        wsManager.connect();
    }

    async loadInitialData() {
        try {
            // Load data for the active tab
            const activeTab = document.querySelector('#mainTabs .nav-link.active');
            if (activeTab) {
                this.handleTabChange(activeTab.id);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async handleTabChange(tabId) {
        switch (tabId) {
            case 'uploads-tab':
                if (window.uploadsManager) {
                    await window.uploadsManager.loadUploadTasks();
                }
                break;
            case 'accounts-tab':
                if (window.accountsManager) {
                    await window.accountsManager.loadAccounts();
                }
                break;
            case 'logs-tab':
                if (window.logsManager) {
                    await window.logsManager.loadLogs();
                }
                break;
            case 'settings-tab':
                if (window.settingsManager) {
                    await window.settingsManager.loadSettings();
                }
                break;
        }
    }

    showError(message) {
        // Create error alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    showSuccess(message) {
        // Create success alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 3000);
    }

    showLogin() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }

    showRegister() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }

    async logout() {
        try {
            await api.logout();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.currentUser = null;
            this.showLoginModal();
            wsManager.disconnect();
        } catch (error) {
            this.showError('Logout failed: ' + error.message);
        }
    }
}

// Global functions for HTML onclick events
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function logout() {
    api.logout();
}

// Initialize dashboard
const dashboard = new Dashboard();