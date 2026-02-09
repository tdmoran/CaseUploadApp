const express = require('express');
const router = express.Router();
const { extractFieldsFromImage } = require('../services/claude');

router.post('/', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Validate it looks like a base64 image
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format. Expected base64 data URL.' });
    }

    console.log('[Extract] Processing image...');
    const result = await extractFieldsFromImage(image);
    console.log('[Extract] Fields extracted successfully');

    res.json(result);
  } catch (err) {
    console.error('[Extract] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to extract fields' });
  }
});

module.exports = router;
