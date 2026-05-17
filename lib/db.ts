import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'pos.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price_usd REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      items_json TEXT NOT NULL,
      total_usd REAL NOT NULL,
      total_vfx REAL,
      total_btc REAL,
      payment_method TEXT NOT NULL,
      payment_address TEXT,
      payment_tx_id TEXT,
      balance_snapshot REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const insertDefault = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const defaults: [string, string][] = [
    ['store_name', 'VerifiedX Store'],
    ['store_vfx_address', ''],
    ['store_btc_address', ''],
    ['store_usdc_address', ''],
    ['stripe_account_id', ''],
    ['vfx_usd_rate', '0.10'],
    ['btc_usd_rate', '65000'],
    ['tax_rate', '0'],
  ];
  for (const [key, value] of defaults) {
    insertDefault.run(key, value);
  }

  // Seed demo products if empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO products (name, price_usd, stock) VALUES (?, ?, ?)');
    insert.run('Coffee', 3.50, 100);
    insert.run('Tea', 2.50, 100);
    insert.run('Croissant', 4.00, 50);
    insert.run('Sandwich', 8.50, 30);
    insert.run('Juice', 5.00, 60);
    insert.run('Cookie', 2.00, 80);
  }

  return db;
}

export interface Product {
  id: number;
  name: string;
  price_usd: number;
  stock: number;
  image_url: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  items_json: string;
  total_usd: number;
  total_vfx: number | null;
  total_btc: number | null;
  payment_method: string;
  payment_address: string | null;
  payment_tx_id: string | null;
  balance_snapshot: number;
  status: string;
  created_at: string;
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function getProducts(): Product[] {
  return getDb().prepare('SELECT * FROM products ORDER BY name').all() as Product[];
}

export function getProduct(id: number): Product | undefined {
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(id) as Product | undefined;
}

export function createProduct(name: string, price_usd: number, stock: number, image_url?: string) {
  return getDb()
    .prepare('INSERT INTO products (name, price_usd, stock, image_url) VALUES (?, ?, ?, ?)')
    .run(name, price_usd, stock, image_url ?? null);
}

export function updateProduct(id: number, name: string, price_usd: number, stock: number, image_url?: string) {
  return getDb()
    .prepare('UPDATE products SET name = ?, price_usd = ?, stock = ?, image_url = ? WHERE id = ?')
    .run(name, price_usd, stock, image_url ?? null, id);
}

export function deleteProduct(id: number) {
  return getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
}

export function getOrders(): Order[] {
  return getDb().prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as Order[];
}

export function getOrder(id: number): Order | undefined {
  return getDb().prepare('SELECT * FROM orders WHERE id = ?').get(id) as Order | undefined;
}

export function createOrder(data: {
  items_json: string;
  total_usd: number;
  total_vfx: number;
  total_btc: number;
  payment_method: string;
  payment_address: string;
  balance_snapshot: number;
}) {
  return getDb()
    .prepare(
      `INSERT INTO orders (items_json, total_usd, total_vfx, total_btc, payment_method, payment_address, balance_snapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.items_json,
      data.total_usd,
      data.total_vfx,
      data.total_btc,
      data.payment_method,
      data.payment_address,
      data.balance_snapshot
    );
}

export function updateOrderStatus(id: number, status: string, tx_id?: string) {
  return getDb()
    .prepare('UPDATE orders SET status = ?, payment_tx_id = ? WHERE id = ?')
    .run(status, tx_id ?? null, id);
}

export function decrementStock(id: number, qty: number) {
  return getDb()
    .prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?')
    .run(qty, id);
}
