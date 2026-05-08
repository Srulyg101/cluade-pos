const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/customers
router.get('/', (req, res) => {
  const db = getDb();
  const { search } = req.query;
  let customers;
  if (search) {
    customers = db.prepare(`
      SELECT c.*, COUNT(o.id) as order_count, COALESCE(SUM(o.total), 0) as total_spent
      FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed'
      WHERE c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?
      GROUP BY c.id ORDER BY c.name
    `).all(`%${search}%`, `%${search}%`, `%${search}%`);
  } else {
    customers = db.prepare(`
      SELECT c.*, COUNT(o.id) as order_count, COALESCE(SUM(o.total), 0) as total_spent
      FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed'
      GROUP BY c.id ORDER BY c.name
    `).all();
  }
  res.json({ data: customers });
});

// GET /api/customers/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const orders = db.prepare(`
    SELECT id, order_number, total, status, payment_method, created_at
    FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.params.id);

  res.json({ data: { ...customer, orders } });
});

// POST /api/customers
router.post('/',
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  validate,
  (req, res) => {
    const db = getDb();
    const { name, email, phone, address } = req.body;
    try {
      const result = db.prepare('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)').run(name, email || null, phone || null, address || null);
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ data: customer, message: 'Customer created' });
    } catch (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
      throw err;
    }
  }
);

// PUT /api/customers/:id
router.put('/:id',
  body('email').optional().isEmail(),
  validate,
  (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const fields = ['name', 'email', 'phone', 'address'];
    const updates = [];
    const params = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    });

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.params.id);

    try {
      db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
      res.json({ data: updated, message: 'Customer updated' });
    } catch (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
      throw err;
    }
  }
);

// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Customer deleted' });
});

// POST /api/customers/:id/loyalty
router.post('/:id/loyalty',
  body('points').isInt().withMessage('Points must be integer'),
  validate,
  (req, res) => {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const newPoints = customer.loyalty_points + req.body.points;
    if (newPoints < 0) return res.status(400).json({ error: 'Insufficient loyalty points' });

    db.prepare('UPDATE customers SET loyalty_points = ? WHERE id = ?').run(newPoints, req.params.id);
    res.json({ data: { loyalty_points: newPoints }, message: 'Loyalty points updated' });
  }
);

module.exports = router;
