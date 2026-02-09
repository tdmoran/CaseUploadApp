const express = require('express');
const router = express.Router();
const { query } = require('../services/db');

// GET /api/settings — return all settings as key-value object
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    console.error('[Settings] GET error:', err.message);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/settings — upsert settings (accepts key-value object)
router.put('/', async (req, res) => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, String(value)]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Settings] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
