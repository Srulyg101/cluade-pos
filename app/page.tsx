'use client';

import { useState, useEffect } from 'react';
import ProductGrid from '@/components/ProductGrid';
import Cart from '@/components/Cart';
import FullCheckout from '@/components/FullCheckout';
import ReceiptModal from '@/components/ReceiptModal';
import SignUpLinkModal from '@/components/SignUpLinkModal';
import { useCartStore } from '@/lib/cart';
import type { Product } from '@/lib/db';

interface CompletedOrder {
  id: number;
  method: string;
  txId?: string;
  totalUsd: number;
  totalVfx: number;
  totalBtc: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showCheckout, setShowCheckout] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const { items, clear } = useCartStore();

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts);
    fetch('/api/settings').then((r) => r.json()).then(setSettings);
  }, []);

  const taxRate = parseFloat(settings.tax_rate ?? '0');
  const vfxRate = parseFloat(settings.vfx_usd_rate ?? '0.10');
  const btcRate = parseFloat(settings.btc_usd_rate ?? '65000');
  const storeName = settings.store_name ?? 'VerifiedX POS';

  const subtotal = items.reduce((s, i) => s + i.price_usd * i.quantity, 0);

  const handleConfirmed = (result: {
    method: string;
    txId?: string;
    orderId: number;
    totalUsd: number;
    totalVfx: number;
    totalBtc: number;
  }) => {
    setShowCheckout(false);
    setCompletedOrder({
      id: result.orderId,
      method: result.method,
      txId: result.txId,
      totalUsd: result.totalUsd,
      totalVfx: result.totalVfx,
      totalBtc: result.totalBtc,
    });
  };

  const handleNewOrder = () => {
    clear();
    setCompletedOrder(null);
    fetch('/api/products').then((r) => r.json()).then(setProducts);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-sm">
            VX
          </div>
          <span className="font-bold text-white">{storeName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSignUp(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700 text-emerald-400 text-xs hover:bg-emerald-800/50 transition-colors"
          >
            <span>👤</span> Customer Sign-Up
          </button>
          <a
            href="/admin/products"
            className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs hover:text-white hover:border-gray-500 transition-colors"
          >
            Admin
          </a>
        </div>
      </header>

      {/* Main POS layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <ProductGrid products={products} />
        </div>
        <div className="w-72 flex-shrink-0">
          <Cart taxRate={taxRate} onCharge={() => setShowCheckout(true)} />
        </div>
      </div>

      {/* Full checkout modal */}
      {showCheckout && (
        <FullCheckout
          items={items}
          subtotal={subtotal}
          taxRate={taxRate}
          vfxRate={vfxRate}
          btcRate={btcRate}
          settings={settings}
          onConfirmed={handleConfirmed}
          onCancel={() => setShowCheckout(false)}
        />
      )}

      {/* Receipt */}
      {completedOrder && (
        <ReceiptModal
          orderId={completedOrder.id}
          items={items}
          totalUsd={completedOrder.totalUsd}
          taxRate={taxRate}
          paymentMethod={completedOrder.method}
          txId={completedOrder.txId}
          onClose={handleNewOrder}
        />
      )}

      {showSignUp && <SignUpLinkModal onClose={() => setShowSignUp(false)} />}
    </div>
  );
}
