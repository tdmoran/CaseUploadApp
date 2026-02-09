const express = require('express');
const router = express.Router();
const { query } = require('../services/db');

// GET /api/cases — return all cases ordered by created_at DESC
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, procedure_name, op_date, status, fields, created_at FROM cases ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[Cases] GET error:', err.message);
    res.status(500).json({ error: 'Failed to load cases' });
  }
});

// POST /api/cases — insert new case
router.post('/', async (req, res) => {
  try {
    const { id, procedure, date, status, fields } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Case id is required' });
    }

    await query(
      `INSERT INTO cases (id, procedure_name, op_date, status, fields)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         procedure_name = EXCLUDED.procedure_name,
         op_date = EXCLUDED.op_date,
         status = EXCLUDED.status,
         fields = EXCLUDED.fields`,
      [id, procedure || null, date || null, status || 'pending', fields ? JSON.stringify(fields) : null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Cases] POST error:', err.message);
    res.status(500).json({ error: 'Failed to save case' });
  }
});

// PUT /api/cases/:id — update case status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await query(
      'UPDATE cases SET status = $1 WHERE id = $2',
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Cases] PUT error:', err.message);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

module.exports = router;
