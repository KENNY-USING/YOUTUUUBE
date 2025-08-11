class LogsManager {
    constructor() {
        this.logs = [];
        this.autoScroll = true;
        this.currentFilter = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWebSocketListeners();
    }

    setupEventListeners() {
        // Log level filter
        const levelFilter = document.getElementById('logLevelFilter');
        if (levelFilter) {
            levelFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.loadLogs();
            });
        }

        // Auto-scroll toggle when user scrolls
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.addEventListener('scroll', () => {
                const isScrolledToBottom = logContainer.scrollHeight - logContainer.clientHeight <= logContainer.scrollTop + 1;
                this.autoScroll = isScrolledToBottom;
            });
        }
    }

    setupWebSocketListeners() {
        // Listen for real-time log updates
        wsManager.on('log_entry', (data) => {
            this.addLogEntry(data);
        });
    }

    async loadLogs() {
        try {
            this.logs = await api.getLogs(this.currentFilter, null, 200);
            this.renderLogs();
        } catch (error) {
            console.error('Error loading logs:', error);
            dashboard.showError('Failed to load logs');
        }
    }

    renderLogs() {
        const container = document.getElementById('logContainer');
        if (!container) return;

        if (this.logs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-file-text display-4 text-muted mb-3 d-block"></i>
                    <h5 class="text-muted">No logs available</h5>
                    <p class="text-muted">Logs will appear here as the application runs</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.logs.map(log => this.formatLogEntry(log)).join('');
        
        // Auto-scroll to bottom if enabled
        if (this.autoScroll) {
            container.scrollTop = container.scrollHeight;
        }
    }

    formatLogEntry(log) {
        const time = new Date(log.created_at).toLocaleTimeString();
        const level = log.level.toUpperCase();
        
        return `
            <div class="log-entry fade-in">
                <div class="log-time">${time}</div>
                <div class="log-level log-level-${level}">${level}</div>
                <div class="log-message">${this.escapeHtml(log.message)}</div>
            </div>
        `;
    }

    addLogEntry(logData) {
        // Add new log entry to the beginning of the array
        this.logs.unshift(logData);
        
        // Limit logs to prevent memory issues
        if (this.logs.length > 500) {
            this.logs = this.logs.slice(0, 500);
        }
        
        // Only re-render if no filter or matches filter
        if (!this.currentFilter || logData.level === this.currentFilter) {
            const container = document.getElementById('logContainer');
            if (container) {
                const newEntry = this.formatLogEntry(logData);
                container.insertAdjacentHTML('afterbegin', newEntry);
                
                // Remove excess entries
                const entries = container.querySelectorAll('.log-entry');
                if (entries.length > 200) {
                    entries[entries.length - 1].remove();
                }
                
                // Auto-scroll to bottom if enabled
                if (this.autoScroll) {
                    container.scrollTop = container.scrollHeight;
                }
            }
        }
    }

    async clearLogs() {
        if (!confirm('Are you sure you want to clear all logs?')) {
            return;
        }

        try {
            await api.clearLogs();
            this.logs = [];
            this.renderLogs();
            dashboard.showSuccess('Logs cleared successfully');
        } catch (error) {
            dashboard.showError('Failed to clear logs: ' + error.message);
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// Global function for HTML onclick events
function clearLogs() {
    if (window.logsManager) {
        window.logsManager.clearLogs();
    }
}

// Initialize logs manager
window.logsManager = new LogsManager();