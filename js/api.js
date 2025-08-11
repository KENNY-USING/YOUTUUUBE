class API {
    constructor() {
        this.baseURL = 'http://127.0.0.1:8000';
        this.token = localStorage.getItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.logout();
                throw new Error('Unauthorized');
            }
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Network error' }));
                throw new Error(error.detail || `HTTP ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication
    async login(username, password) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await this.request('/api/auth/login', {
            method: 'POST',
            headers: {},
            body: formData
        });

        this.token = response.access_token;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        return response;
    }

    async register(username, email, password) {
        const response = await this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });

        this.token = response.access_token;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        return response;
    }

    logout() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    }

    // YouTube Accounts
    async getAccounts() {
        return await this.request('/api/accounts/');
    }

    async addAccount(channelName, email, password) {
        return await this.request('/api/accounts/', {
            method: 'POST',
            body: JSON.stringify({
                channel_name: channelName,
                email: email,
                password: password
            })
        });
    }

    async deleteAccount(accountId) {
        return await this.request(`/api/accounts/${accountId}`, {
            method: 'DELETE'
        });
    }

    // Upload Tasks
    async getUploadTasks() {
        return await this.request('/api/uploads/');
    }

    async createUploadTask(formData) {
        return await this.request('/api/uploads/', {
            method: 'POST',
            headers: {},
            body: formData
        });
    }

    async deleteUploadTask(taskId) {
        return await this.request(`/api/uploads/${taskId}`, {
            method: 'DELETE'
        });
    }

    async retryUploadTask(taskId) {
        return await this.request(`/api/uploads/${taskId}/retry`, {
            method: 'POST'
        });
    }

    // Logs
    async getLogs(level = null, module = null, limit = 100) {
        const params = new URLSearchParams();
        if (level) params.append('level', level);
        if (module) params.append('module', module);
        params.append('limit', limit);

        return await this.request(`/api/logs/?${params}`);
    }

    async clearLogs() {
        return await this.request('/api/logs/', {
            method: 'DELETE'
        });
    }
}

const api = new API();