const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/categories
router.get('/', (req, res) => {
  const db = getDb();
  const categories = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.active = 1
    GROUP BY c.id
    ORDER BY c.name
  `).all();
  res.json({ data: categories });
});

// GET /api/categories/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json({ data: category });
});

// POST /api/categories
router.post('/',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim(),
  validate,
  (req, res) => {
    const db = getDb();
    const { name, description } = req.body;
    try {
      const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null);
      const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ data: category, message: 'Category created' });
    } catch (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Category name already exists' });
      throw err;
    }
  }
);

// PUT /api/categories/:id
router.put('/:id',
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  validate,
  (req, res) => {
    const db = getDb();
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const name = req.body.name ?? category.name;
    const description = req.body.description ?? category.description;

    try {
      db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description, req.params.id);
      const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
      res.json({ data: updated, message: 'Category updated' });
    } catch (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Category name already exists' });
      throw err;
    }
  }
);

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Category deleted' });
});

module.exports = router;
