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
  }
};
