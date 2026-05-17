'use client';

import { Product } from '@/lib/db';
import { useCartStore } from '@/lib/cart';

export default function ProductGrid({ products }: { products: Product[] }) {
  const addItem = useCartStore((s) => s.addItem);

  if (!products.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No products yet. Add some in{' '}
        <a href="/admin/products" className="ml-1 text-emerald-400 underline">
          Admin → Products
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 overflow-y-auto">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => p.stock > 0 && addItem({ id: p.id, name: p.name, price_usd: p.price_usd })}
          disabled={p.stock === 0}
          className={`flex flex-col items-center justify-center rounded-xl p-4 text-center transition-all
            ${
              p.stock === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                : 'bg-gray-800 hover:bg-emerald-900 hover:border-emerald-500 border border-gray-700 text-white cursor-pointer active:scale-95'
            }`}
        >
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.name}
              className="w-14 h-14 object-cover rounded-lg mb-2"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gray-700 flex items-center justify-center mb-2 text-2xl font-bold text-emerald-400">
              {p.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm leading-tight">{p.name}</span>
          <span className="text-emerald-400 text-sm font-bold mt-1">
            ${p.price_usd.toFixed(2)}
          </span>
          <span className={`text-xs mt-1 ${p.stock <= 5 ? 'text-yellow-400' : 'text-gray-500'}`}>
            {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
          </span>
        </button>
      ))}
    </div>
  );
}
