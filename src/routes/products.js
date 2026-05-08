const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { getDb } = require('../db/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/products
router.get('/', (req, res) => {
  const db = getDb();
  const { search, category_id, active, low_stock, limit = 100, offset = 0 } = req.query;

  let where = [];
  let params = [];

  if (active !== undefined) { where.push('p.active = ?'); params.push(active === 'true' ? 1 : 0); }
  else { where.push('p.active = 1'); }

  if (category_id) { where.push('p.category_id = ?'); params.push(category_id); }
  if (search) { where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (low_stock === 'true') { where.push('p.stock <= p.low_stock_threshold'); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ${whereClause}
    ORDER BY p.name
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  const total = db.prepare(`SELECT COUNT(*) as count FROM products p ${whereClause}`).get(...params);

  res.json({ data: products, total: total.count, limit: Number(limit), offset: Number(offset) });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ data: product });
});

// POST /api/products
router.post('/',
  body('name').trim().notEmpty().withMessage('Name required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be >= 0'),
  body('cost').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  body('category_id').optional().isInt(),
  body('sku').optional().trim(),
  body('barcode').optional().trim(),
  validate,
  (req, res) => {
    const db = getDb();
    const { name, sku, category_id, price, cost = 0, stock = 0, low_stock_threshold = 5, barcode, description } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO products (name, sku, category_id, price, cost, stock, low_stock_threshold, barcode, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, sku || null, category_id || null, price, cost, stock, low_stock_threshold, barcode || null, description || null);

      if (stock > 0) {
        db.prepare(`
          INSERT INTO inventory_logs (product_id, type, quantity_change, quantity_before, quantity_after, notes)
          VALUES (?, 'purchase', ?, 0, ?, 'Initial stock')
        `).run(result.lastInsertRowid, stock, stock);
      }

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ data: product, message: 'Product created' });
    } catch (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'SKU or barcode already exists' });
      throw err;
    }
  }
);

// PUT /api/products/:id
router.put('/:id',
  body('price').optional().isFloat({ min: 0 }),
  body('cost').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  validate,
  (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const fields = ['name', 'sku', 'category_id', 'price', 'cost', 'low_stock_threshold', 'barcode', 'description', 'active'];
    const updates = [];
    const params = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    });

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    try {
      db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      if (req.body.stock !== undefined && req.body.stock !== existing.stock) {
        const diff = req.body.stock - existing.stock;
        db.prepare(`
          INSERT INTO inventory_logs (product_id, type, quantity_change, quantity_before, quantity_after, notes)
          VALUES (?, 'adjustment', ?, ?, ?, 'Manual adjustment')
        `).run(req.params.id, diff, existing.stock, req.body.stock);
      }

      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
      res.json({ data: updated, message: 'Product updated' });
    } catch (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'SKU or barcode already exists' });
      throw err;
    }
  }
);

// DELETE /api/products/:id (soft delete)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  db.prepare('UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deactivated' });
});

// POST /api/products/:id/adjust-stock
router.post('/:id/adjust-stock',
  body('quantity').isInt().withMessage('Quantity must be integer'),
  body('type').isIn(['purchase', 'adjustment', 'return']).withMessage('Invalid type'),
  body('notes').optional().trim(),
  validate,
  (req, res) => {
    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { quantity, type, notes } = req.body;
    const newStock = product.stock + quantity;
    if (newStock < 0) return res.status(400).json({ error: 'Insufficient stock' });

    db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, req.params.id);
    db.prepare(`
      INSERT INTO inventory_logs (product_id, type, quantity_change, quantity_before, quantity_after, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, type, quantity, product.stock, newStock, notes || null);

    res.json({ data: { stock: newStock }, message: 'Stock adjusted' });
  }
);

// GET /api/products/:id/inventory-log
router.get('/:id/inventory-log', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const logs = db.prepare('SELECT * FROM inventory_logs WHERE product_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
  res.json({ data: logs, product });
});

module.exports = router;
