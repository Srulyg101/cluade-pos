const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/settings
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  res.json({ data: settings });
});

// PUT /api/settings - Bulk update
router.put('/',
  body().isObject().withMessage('Body must be an object'),
  validate,
  (req, res) => {
    const db = getDb();
    const allowed = ['store_name', 'store_address', 'store_phone', 'tax_rate', 'currency_symbol', 'receipt_footer'];
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

    const updates = db.transaction(() => {
      for (const [key, value] of Object.entries(req.body)) {
        if (allowed.includes(key)) upsert.run(key, String(value));
      }
    });

    updates();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json({ data: settings, message: 'Settings updated' });
  }
);

module.exports = router;
