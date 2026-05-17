'use client';

import { CartItem } from '@/lib/cart';
import { formatUsd } from '@/lib/price';

interface ReceiptModalProps {
  orderId: number;
  items: CartItem[];
  totalUsd: number;
  taxRate: number;
  paymentMethod: string;
  txId?: string;
  onClose: () => void;
}

export default function ReceiptModal({
  orderId,
  items,
  totalUsd,
  taxRate,
  paymentMethod,
  txId,
  onClose,
}: ReceiptModalProps) {
  const sub = items.reduce((s, i) => s + i.price_usd * i.quantity, 0);
  const tax = sub * taxRate;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-emerald-700 rounded-2xl p-6 w-full max-w-sm mx-4">
        {/* Success Icon */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center mb-2">
            <span className="text-emerald-400 text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-white">Payment Confirmed!</h2>
          <p className="text-gray-400 text-sm">Order #{orderId}</p>
        </div>

        {/* Items */}
        <div className="bg-gray-800 rounded-xl p-3 mb-3 space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-300">
                {item.name} × {item.quantity}
              </span>
              <span className="text-white">{formatUsd(item.price_usd * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-1 mt-1 space-y-0.5">
            {taxRate > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tax</span>
                <span>{formatUsd(tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold">
              <span>Total</span>
              <span>{formatUsd(totalUsd)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-gray-800 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                paymentMethod === 'vfx' ? 'bg-emerald-600/30 text-emerald-400' : 'bg-orange-600/30 text-orange-400'
              }`}
            >
              {paymentMethod.toUpperCase()}
            </span>
            <span className="text-gray-400 text-xs">Payment received</span>
          </div>
          {txId && (
            <p className="text-gray-600 text-xs font-mono mt-1 truncate" title={txId}>
              TX: {txId}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
        >
          New Order
        </button>
      </div>
    </div>
  );
}
