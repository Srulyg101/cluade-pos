'use client';

import { useCartStore } from '@/lib/cart';
import { formatUsd } from '@/lib/price';

interface CartProps {
  taxRate: number;
  onCharge: (total: number) => void;
}

export default function Cart({ taxRate, onCharge }: CartProps) {
  const { items, removeItem, updateQuantity, clear, subtotal } = useCartStore();

  const sub = subtotal();
  const tax = sub * taxRate;
  const total = sub + tax;

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <span className="text-lg font-bold text-white">Cart</span>
        {items.length > 0 && (
          <button onClick={clear} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {items.length === 0 ? (
          <p className="text-gray-600 text-sm text-center mt-8">Tap a product to add it</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.name}</p>
                <p className="text-gray-400 text-xs">{formatUsd(item.price_usd)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-6 h-6 rounded bg-gray-700 text-white text-sm hover:bg-red-800 flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-white text-sm w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-6 h-6 rounded bg-gray-700 text-white text-sm hover:bg-emerald-800 flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <span className="text-emerald-400 text-sm font-bold w-16 text-right">
                {formatUsd(item.price_usd * item.quantity)}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-gray-600 hover:text-red-400 text-xs ml-1"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-gray-800 px-4 py-3 space-y-1">
        <div className="flex justify-between text-gray-400 text-sm">
          <span>Subtotal</span>
          <span>{formatUsd(sub)}</span>
        </div>
        {taxRate > 0 && (
          <div className="flex justify-between text-gray-400 text-sm">
            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
            <span>{formatUsd(tax)}</span>
          </div>
        )}
        <div className="flex justify-between text-white font-bold text-lg pt-1">
          <span>Total</span>
          <span>{formatUsd(total)}</span>
        </div>
      </div>

      {/* Charge button */}
      <div className="px-4 pb-4">
        <button
          disabled={items.length === 0}
          onClick={() => onCharge(total)}
          className="w-full py-4 rounded-xl font-bold text-lg transition-all
            disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed
            bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95"
        >
          {items.length === 0 ? 'Cart is empty' : `Charge ${formatUsd(total)}`}
        </button>
      </div>
    </div>
  );
}
