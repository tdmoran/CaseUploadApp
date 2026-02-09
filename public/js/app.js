// Main application logic — navigation, state, orchestration

const App = {
  currentScreen: 'capture',

  init() {
    Camera.init();
    this.bindNavigation();
    this.bindActions();
    this.loadSettings();
    this.loadHistory();
    this.checkConnection();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  },

  // ---- Navigation ----

  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const screen = document.getElementById(`screen-${name}`);
    if (screen) {
      screen.classList.add('active');
      screen.scrollTo(0, 0);
    }

    const navBtn = document.querySelector(`.nav-item[data-screen="${name}"]`);
    if (navBtn) navBtn.classList.add('active');

    this.currentScreen = name;
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        if (screen) this.showScreen(screen);
      });
    });
  },

  // ---- Actions ----

  bindActions() {
    // Preview: Retake
    document.getElementById('btn-retake').addEventListener('click', () => {
      Camera.reset();
      this.showScreen('capture');
    });

    // Preview: Extract
    document.getElementById('btn-extract').addEventListener('click', () => {
      this.extractFields();
    });

    // Review: Back
    document.getElementById('btn-back-capture').addEventListener('click', () => {
      Camera.reset();
      Review.clearFields();
      this.showScreen('capture');
    });

    // Review: Submit
    document.getElementById('review-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitToElogbook();
    });

    // Settings: Save
    document.getElementById('settings-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  },

  // ---- Field Extraction ----

  async extractFields() {
    const imageBase64 = Camera.getImageBase64();
    if (!imageBase64) {
      this.showToast('No image captured', 'error');
      return;
    }

    const loader = document.getElementById('preview-loader');
    const extractBtn = document.getElementById('btn-extract');

    loader.classList.remove('hidden');
    extractBtn.classList.add('loading');
    extractBtn.disabled = true;

    try {
      const data = await API.extractFields(imageBase64);
      Review.populateFields(data);
      this.showScreen('review');
      this.showToast('Fields extracted successfully', 'success');
    } catch (err) {
      this.showToast(err.message || 'Extraction failed', 'error');
    } finally {
      loader.classList.add('hidden');
      extractBtn.classList.remove('loading');
      extractBtn.disabled = false;
    }
  },

  // ---- eLogbook Submission ----

  async submitToElogbook() {
    const fields = Review.getFieldValues();

    // Basic validation
    if (!fields.date) {
      this.showToast('Date of operation is required', 'error');
      return;
    }
    if (!fields.procedure) {
      this.showToast('Procedure is required', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Add to history as pending
    const historyId = this.addToHistory(fields, 'pending');

    try {
      const result = await API.submitToElogbook(fields);
      this.updateHistoryStatus(historyId, 'success');
      this.showToast('Submitted to eLogbook', 'success');

      // Reset and go to capture
      Camera.reset();
      Review.clearFields();
      this.showScreen('capture');
      this.updateStats();
    } catch (err) {
      this.updateHistoryStatus(historyId, 'failed');
      this.showToast(err.message || 'Submission failed', 'error');
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  },

  // ---- Settings ----

  loadSettings() {
    const fields = ['username', 'password', 'hospital', 'consultant'];
    fields.forEach(f => {
      const el = document.getElementById(`setting-${f}`);
      const val = localStorage.getItem(`setting-${f}`);
      if (el && val) el.value = val;
    });
  },

  async saveSettings() {
    const fields = ['hospital', 'consultant'];
    fields.forEach(f => {
      const el = document.getElementById(`setting-${f}`);
      if (el) localStorage.setItem(`setting-${f}`, el.value);
    });

    // Save credentials to server (encrypted)
    const username = document.getElementById('setting-username').value;
    const password = document.getElementById('setting-password').value;

    if (username && password) {
      try {
        const response = await fetch('/api/submit/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (!response.ok) throw new Error('Failed to save credentials');
        // Store username locally for display (not password)
        localStorage.setItem('setting-username', username);
        localStorage.setItem('setting-password', '********');
      } catch (err) {
        this.showToast('Failed to save credentials to server', 'error');
        return;
      }
    }

    this.showToast('Settings saved', 'success');
  },

  // ---- History ----

  loadHistory() {
    const history = this.getHistory();
    this.renderHistory(history);
    this.updateStats();
  },

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem('case-history') || '[]');
    } catch {
      return [];
    }
  },

  addToHistory(fields, status) {
    const history = this.getHistory();
    const entry = {
      id: Date.now().toString(36),
      procedure: fields.procedure || 'Unknown procedure',
      date: fields.date || new Date().toLocaleDateString('en-GB'),
      timestamp: new Date().toISOString(),
      status
    };
    history.unshift(entry);
    // Keep max 100 entries
    if (history.length > 100) history.pop();
    localStorage.setItem('case-history', JSON.stringify(history));
    this.renderHistory(history);
    return entry.id;
  },

  updateHistoryStatus(id, status) {
    const history = this.getHistory();
    const entry = history.find(h => h.id === id);
    if (entry) {
      entry.status = status;
      localStorage.setItem('case-history', JSON.stringify(history));
      this.renderHistory(history);
    }
  },

  renderHistory(history) {
    const container = document.getElementById('history-list');

    if (!history.length) {
      container.innerHTML = `
        <div class="history-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p>No submissions yet</p>
          <span>Captured operations will appear here</span>
        </div>`;
      return;
    }

    container.innerHTML = history.map(entry => `
      <div class="history-item">
        <div class="history-status ${entry.status}"></div>
        <div class="history-info">
          <div class="history-procedure">${this.escapeHtml(entry.procedure)}</div>
          <div class="history-meta">${this.escapeHtml(entry.date)}</div>
        </div>
        <div class="history-time">${this.timeAgo(entry.timestamp)}</div>
      </div>
    `).join('');
  },

  updateStats() {
    const history = this.getHistory();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const today = history.filter(h => h.timestamp && h.timestamp.startsWith(todayStr)).length;
    const week = history.filter(h => h.timestamp && new Date(h.timestamp) >= weekAgo).length;

    document.getElementById('stat-today').textContent = today;
    document.getElementById('stat-week').textContent = week;
    document.getElementById('stat-total').textContent = history.length;
  },

  // ---- Connection Status ----

  async checkConnection() {
    const dot = document.getElementById('connection-dot');
    const online = await API.healthCheck();
    dot.className = `status-dot ${online ? 'online' : ''}`;
  },

  // ---- Toast Notifications ----

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 3200);
  },

  // ---- Utilities ----

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  timeAgo(timestamp) {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
