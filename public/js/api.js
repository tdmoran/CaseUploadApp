// API communication layer

const API = {
  baseUrl: '',

  async extractFields(imageBase64) {
    const response = await fetch(`${this.baseUrl}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Extraction failed' }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    return response.json();
  },

  async submitToElogbook(fields) {
    const response = await fetch(`${this.baseUrl}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Submission failed' }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    return response.json();
  },

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  },

  // ---- Cases API ----

  async getCases() {
    try {
      const response = await fetch(`${this.baseUrl}/api/cases`);
      if (!response.ok) throw new Error('Failed to load cases');
      return await response.json();
    } catch {
      return null;
    }
  },

  async saveCase(caseData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData)
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async updateCaseStatus(id, status) {
    try {
      const response = await fetch(`${this.baseUrl}/api/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  // ---- Settings API ----

  async getSettings() {
    try {
      const response = await fetch(`${this.baseUrl}/api/settings`);
      if (!response.ok) throw new Error('Failed to load settings');
      return await response.json();
    } catch {
      return null;
    }
  },

  async saveSettings(settings) {
    try {
      const response = await fetch(`${this.baseUrl}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};
