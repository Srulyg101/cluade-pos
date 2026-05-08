const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.getTime().toString().slice(-6);
  return `ORD-${datePart}-${timePart}`;
}

function buildOrderResponse(db, orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  return { ...order, items };
}

// GET /api/orders
router.get('/', (req, res) => {
  const db = getDb();
  const { status, customer_id, from, to, payment_method, limit = 50, offset = 0 } = req.query;

  let where = [];
  let params = [];

  if (status) { where.push('o.status = ?'); params.push(status); }
  if (customer_id) { where.push('o.customer_id = ?'); params.push(customer_id); }
  if (payment_method) { where.push('o.payment_method = ?'); params.push(payment_method); }
  if (from) { where.push('DATE(o.created_at) >= ?'); params.push(from); }
  if (to) { where.push('DATE(o.created_at) <= ?'); params.push(to); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const orders = db.prepare(`
    SELECT o.*, c.name as customer_name
    FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  const total = db.prepare(`SELECT COUNT(*) as count FROM orders o ${whereClause}`).get(...params);

  res.json({ data: orders, total: total.count, limit: Number(limit), offset: Number(offset) });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, c.email as customer_email
    FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  res.json({ data: { ...order, items } });
});

// POST /api/orders - Create a new order (checkout)
router.post('/',
  body('items').isArray({ min: 1 }).withMessage('Items required'),
  body('items.*.product_id').isInt().withMessage('product_id required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be >= 1'),
  body('payment_method').optional().isIn(['cash', 'card', 'mobile', 'other']),
  body('customer_id').optional().isInt(),
  body('discount_amount').optional().isFloat({ min: 0 }),
  body('amount_tendered').optional().isFloat({ min: 0 }),
  validate,
  (req, res) => {
    const db = getDb();
    const { items, customer_id, payment_method = 'cash', discount_amount = 0, amount_tendered = 0, notes, cashier = 'Admin' } = req.body;

    const taxRateSetting = db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get();
    const tax_rate = parseFloat(taxRateSetting?.value ?? 0.08);

    const createOrder = db.transaction(() => {
      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(item.product_id);
        if (!product) throw { status: 404, message: `Product ${item.product_id} not found` };
        if (product.stock < item.quantity) throw { status: 400, message: `Insufficient stock for "${product.name}" (available: ${product.stock})` };

        const itemDiscount = item.discount || 0;
        const lineTotal = (product.price - itemDiscount) * item.quantity;
        subtotal += lineTotal;

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: item.quantity,
          unit_price: product.price,
          discount: itemDiscount,
          line_total: lineTotal,
          stock_before: product.stock,
        });
      }

      const tax_amount = (subtotal - discount_amount) * tax_rate;
      const total = subtotal - discount_amount + tax_amount;
      const change_given = payment_method === 'cash' ? Math.max(0, amount_tendered - total) : 0;
      const order_number = generateOrderNumber();

      const orderResult = db.prepare(`
        INSERT INTO orders (order_number, customer_id, subtotal, discount_amount, tax_rate, tax_amount, total, payment_method, amount_tendered, change_given, notes, cashier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(order_number, customer_id || null, subtotal, discount_amount, tax_rate, tax_amount, total, payment_method, amount_tendered, change_given, notes || null, cashier);

      const orderId = orderResult.lastInsertRowid;

      for (const item of orderItems) {
        db.prepare(`
          INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, discount, line_total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(orderId, item.product_id, item.product_name, item.product_sku, item.quantity, item.unit_price, item.discount, item.line_total);

        const newStock = item.stock_before - item.quantity;
        db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, item.product_id);
        db.prepare(`
          INSERT INTO inventory_logs (product_id, type, quantity_change, quantity_before, quantity_after, reference)
          VALUES (?, 'sale', ?, ?, ?, ?)
        `).run(item.product_id, -item.quantity, item.stock_before, newStock, order_number);
      }

      if (customer_id) {
        const loyaltyPoints = Math.floor(total);
        db.prepare('UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?').run(loyaltyPoints, customer_id);
      }

      return orderId;
    });

    try {
      const orderId = createOrder();
      const order = buildOrderResponse(db, orderId);
      res.status(201).json({ data: order, message: 'Order created successfully' });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      throw err;
    }
  }
);

// PUT /api/orders/:id/status
router.put('/:id/status',
  body('status').isIn(['pending', 'completed', 'voided']).withMessage('Invalid status'),
  validate,
  (req, res) => {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'refunded') return res.status(400).json({ error: 'Cannot change status of a refunded order' });

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    res.json({ data: buildOrderResponse(db, req.params.id), message: 'Status updated' });
  }
);

// POST /api/orders/:id/refund - Full refund
router.post('/:id/refund', (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'refunded') return res.status(400).json({ error: 'Order already refunded' });
  if (order.status === 'voided') return res.status(400).json({ error: 'Cannot refund a voided order' });

  const refund = db.transaction(() => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('refunded', order.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    for (const item of items) {
      if (!item.product_id) continue;
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
      if (!product) continue;
      const newStock = product.stock + item.quantity;
      db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, item.product_id);
      db.prepare(`
        INSERT INTO inventory_logs (product_id, type, quantity_change, quantity_before, quantity_after, reference, notes)
        VALUES (?, 'return', ?, ?, ?, ?, 'Refund')
      `).run(item.product_id, item.quantity, product.stock, newStock, order.order_number);
    }

    if (order.customer_id) {
      const pointsToDeduct = Math.floor(order.total);
      db.prepare('UPDATE customers SET loyalty_points = MAX(0, loyalty_points - ?) WHERE id = ?').run(pointsToDeduct, order.customer_id);
    }
  });

  refund();
  res.json({ data: buildOrderResponse(db, order.id), message: 'Order refunded and stock restored' });
});

// GET /api/orders/:id/receipt - Receipt data
router.get('/:id/receipt', (req, res) => {
  const db = getDb();
  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
    FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);

  const settings = db.prepare('SELECT key, value FROM settings').all();
  const storeSettings = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  res.json({ data: { order: { ...order, items }, store: storeSettings } });
});

module.exports = router;
