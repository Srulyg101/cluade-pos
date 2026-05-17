'use client';

import React, { useEffect, useState } from 'react';
import type { Order } from '@/lib/db';

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  confirmed: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
  cancelled: 'bg-red-900/30 text-red-400 border-red-800',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/orders').then((r) => r.json()).then(setOrders);
  }, []);

  const total_revenue = orders
    .filter((o) => o.status === 'confirmed')
    .reduce((s, o) => s + o.total_usd, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm">
          <span className="text-gray-400">Revenue: </span>
          <span className="text-emerald-400 font-bold">${total_revenue.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-center px-4 py-3">Method</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const items = JSON.parse(o.items_json) as Array<{ name: string; quantity: number; price_usd: number }>;
              return (
                <React.Fragment key={o.id}>
                  <tr
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  >
                    <td className="px-4 py-3 text-gray-400">#{o.id}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-semibold">
                      ${o.total_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${o.payment_method === 'vfx' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-orange-900/30 text-orange-400'}`}>
                        {o.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded border text-xs ${statusColor[o.status] ?? 'text-gray-400'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {expanded === o.id ? '▲' : '▼'}
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr className="border-b border-gray-800/50 bg-gray-800/20">
                      <td colSpan={6} className="px-6 py-3">
                        <div className="text-xs space-y-1 text-gray-300">
                          <p className="font-semibold text-white mb-1">Items:</p>
                          {items.map((item, i) => (
                            <p key={i}>
                              {item.name} × {item.quantity} = ${(item.price_usd * item.quantity).toFixed(2)}
                            </p>
                          ))}
                          {o.payment_address && (
                            <p className="mt-2 font-mono text-gray-500">Address: {o.payment_address}</p>
                          )}
                          {o.payment_tx_id && (
                            <p className="font-mono text-gray-500">TX: {o.payment_tx_id}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-600">No orders yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
