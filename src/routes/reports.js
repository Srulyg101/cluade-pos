const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/reports/sales - Sales summary
router.get('/sales', (req, res) => {
  const db = getDb();
  const { from, to, group_by = 'day' } = req.query;

  const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const toDate = to || new Date().toISOString().slice(0, 10);

  const groupFormats = { day: '%Y-%m-%d', week: '%Y-W%W', month: '%Y-%m', year: '%Y' };
  const groupFormat = groupFormats[group_by] || groupFormats.day;

  const summary = db.prepare(`
    SELECT
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(SUM(subtotal), 0) as subtotal,
      COALESCE(SUM(tax_amount), 0) as tax_collected,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COUNT(*) as order_count,
      AVG(total) as avg_order_value
    FROM orders
    WHERE status = 'completed'
      AND DATE(created_at) BETWEEN ? AND ?
  `).get(fromDate, toDate);

  const byPeriod = db.prepare(`
    SELECT
      strftime('${groupFormat}', created_at) as period,
      COALESCE(SUM(total), 0) as revenue,
      COUNT(*) as orders,
      AVG(total) as avg_order
    FROM orders
    WHERE status = 'completed'
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY period
    ORDER BY period
  `).all(fromDate, toDate);

  const byPaymentMethod = db.prepare(`
    SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total), 0) as total
    FROM orders
    WHERE status = 'completed'
      AND DATE(created_at) BETWEEN ? AND ?
    GROUP BY payment_method
  `).all(fromDate, toDate);

  const topProducts = db.prepare(`
    SELECT
      oi.product_name,
      SUM(oi.quantity) as units_sold,
      SUM(oi.line_total) as revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status = 'completed'
      AND DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY oi.product_name
    ORDER BY revenue DESC
    LIMIT 10
  `).all(fromDate, toDate);

  res.json({
    data: {
      period: { from: fromDate, to: toDate },
      summary,
      by_period: byPeriod,
      by_payment_method: byPaymentMethod,
      top_products: topProducts,
    },
  });
});

// GET /api/reports/inventory - Inventory report
router.get('/inventory', (req, res) => {
  const db = getDb();

  const overview = db.prepare(`
    SELECT
      COUNT(*) as total_products,
      SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_products,
      SUM(CASE WHEN stock <= low_stock_threshold AND active = 1 THEN 1 ELSE 0 END) as low_stock_count,
      SUM(CASE WHEN stock = 0 AND active = 1 THEN 1 ELSE 0 END) as out_of_stock_count,
      COALESCE(SUM(stock * cost), 0) as inventory_value
    FROM products
  `).get();

  const lowStock = db.prepare(`
    SELECT p.id, p.name, p.sku, p.stock, p.low_stock_threshold, p.price, c.name as category
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.stock <= p.low_stock_threshold AND p.active = 1
    ORDER BY p.stock ASC
  `).all();

  const byCategory = db.prepare(`
    SELECT
      COALESCE(c.name, 'Uncategorized') as category,
      COUNT(p.id) as product_count,
      SUM(p.stock) as total_stock,
      COALESCE(SUM(p.stock * p.cost), 0) as value
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.active = 1
    GROUP BY c.id
    ORDER BY value DESC
  `).all();

  res.json({ data: { overview, low_stock: lowStock, by_category: byCategory } });
});

// GET /api/reports/dashboard - Dashboard KPIs
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const todaySales = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
    FROM orders WHERE status = 'completed' AND DATE(created_at) = ?
  `).get(today);

  const monthStart = today.slice(0, 7) + '-01';
  const monthSales = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
    FROM orders WHERE status = 'completed' AND DATE(created_at) >= ?
  `).get(monthStart);

  const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get();
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1').get();
  const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= low_stock_threshold AND active = 1').get();

  const recentOrders = db.prepare(`
    SELECT o.id, o.order_number, o.total, o.status, o.payment_method, o.created_at, c.name as customer_name
    FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.created_at DESC LIMIT 5
  `).all();

  res.json({
    data: {
      today: todaySales,
      this_month: monthSales,
      customers: totalCustomers.count,
      products: totalProducts.count,
      low_stock_alerts: lowStockCount.count,
      recent_orders: recentOrders,
    },
  });
});

module.exports = router;
