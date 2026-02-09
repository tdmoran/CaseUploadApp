const express = require('express');
const router = express.Router();
const { submitOperation } = require('../services/elogbook');
const { saveCredentials } = require('../services/crypto');

// Submit operation to eLogbook
router.post('/', async (req, res) => {
  try {
    const { fields } = req.body;

    if (!fields) {
      return res.status(400).json({ error: 'No fields provided' });
    }

    if (!fields.date || !fields.procedure) {
      return res.status(400).json({ error: 'Date and procedure are required' });
    }

    console.log('[Submit] Submitting to eLogbook:', fields.procedure);
    const result = await submitOperation(fields);
    console.log('[Submit] Submission complete');

    res.json({ success: true, message: 'Operation submitted to eLogbook' });
  } catch (err) {
    console.error('[Submit] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to submit to eLogbook' });
  }
});

// Save eLogbook credentials
router.post('/credentials', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    saveCredentials(username, password);
    res.json({ success: true, message: 'Credentials saved securely' });
  } catch (err) {
    console.error('[Credentials] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to save credentials' });
  }
});

module.exports = router;
