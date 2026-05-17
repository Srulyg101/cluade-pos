'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/lib/db';

interface FormState {
  name: string;
  price_usd: string;
  stock: string;
  image_url: string;
}

const empty: FormState = { name: '', price_usd: '', stock: '', image_url: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => fetch('/api/products').then((r) => r.json()).then(setProducts);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name,
      price_usd: parseFloat(form.price_usd),
      stock: parseInt(form.stock),
      image_url: form.image_url || undefined,
    };

    if (editId !== null) {
      await fetch(`/api/products/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setEditId(null);
    } else {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    setForm(empty);
    setSaving(false);
    load();
  };

  const handleEdit = (p: Product) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      price_usd: String(p.price_usd),
      stock: String(p.stock),
      image_url: p.image_url ?? '',
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Products</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <h2 className="text-white font-semibold mb-4">
          {editId !== null ? 'Edit Product' : 'Add Product'}
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Product name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Price (USD) *</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={form.price_usd}
              onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Stock *</label>
            <input
              required
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Image URL (optional)</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : editId !== null ? 'Update' : 'Add Product'}
          </button>
          {editId !== null && (
            <button
              type="button"
              onClick={() => { setEditId(null); setForm(empty); }}
              className="px-4 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-right px-4 py-3">Stock</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-white">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-emerald-400">${p.price_usd.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-yellow-400' : 'text-gray-300'}`}>
                  {p.stock}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-white mr-3 text-xs">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-400 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-600">No products yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
