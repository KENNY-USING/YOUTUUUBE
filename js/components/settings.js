class SettingsManager {
    constructor() {
        this.settings = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Settings form submission
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        }
    }

    async loadSettings() {
        try {
            // Load settings from localStorage for now
            // In a real app, this would come from the backend
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
                this.settings = JSON.parse(savedSettings);
                this.populateForm();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    populateForm() {
        document.getElementById('youtubeApiKey').value = this.settings.youtubeApiKey || '';
        document.getElementById('captchaApiKey').value = this.settings.captchaApiKey || '';
        document.getElementById('proxyList').value = this.settings.proxyList || '';
        document.getElementById('enableProxy').checked = this.settings.enableProxy || false;
    }

    async handleSettingsSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const settings = {
            youtubeApiKey: document.getElementById('youtubeApiKey').value,
            captchaApiKey: document.getElementById('captchaApiKey').value,
            proxyList: document.getElementById('proxyList').value,
            enableProxy: document.getElementById('enableProxy').checked
        };

        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
            submitBtn.disabled = true;
            
            // Save to localStorage for now
            // In a real app, this would be saved to the backend
            localStorage.setItem('appSettings', JSON.stringify(settings));
            this.settings = settings;
            
            dashboard.showSuccess('Settings saved successfully!');
            
        } catch (error) {
            dashboard.showError('Failed to save settings: ' + error.message);
        } finally {
            submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Save Settings';
            submitBtn.disabled = false;
        }
    }

    getSetting(key, defaultValue = null) {
        return this.settings[key] || defaultValue;
    }

    setSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
    }
}

// Initialize settings manager
window.settingsManager = new SettingsManager();