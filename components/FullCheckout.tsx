'use client';

import { useState, useEffect } from 'react';
import { formatUsd, formatVfx, formatBtc, usdToVfx, usdToBtcSatoshis } from '@/lib/price';
import type { CartItem } from '@/lib/cart';
import StripeCheckout from './StripeCheckout';

type PayMethod = 'card' | 'cash' | 'vfx' | 'btc' | 'usdc';
type SettlementMode = 'usd' | 'usdc' | 'split';

const TIP_PRESETS = [0, 0.15, 0.18, 0.20];

interface FullCheckoutProps {
  items: CartItem[];
  subtotal: number;
  taxRate: number;
  vfxRate: number;
  btcRate: number;
  settings: Record<string, string>;
  onConfirmed: (result: {
    method: PayMethod;
    txId?: string;
    orderId: number;
    totalUsd: number;
    totalVfx: number;
    totalBtc: number;
  }) => void;
  onCancel: () => void;
}

export default function FullCheckout({
  items,
  subtotal,
  taxRate,
  vfxRate,
  btcRate,
  settings,
  onConfirmed,
  onCancel,
}: FullCheckoutProps) {
  const [step, setStep] = useState<'method' | 'stripe' | 'cash_confirm' | 'crypto_qr'>('method');
  const [method, setMethod] = useState<PayMethod>('card');
  const [tipPct, setTipPct] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [discount, setDiscount] = useState('');
  const [settlement, setSettlement] = useState<SettlementMode>('usd');
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState(0);
  const [totalVfx, setTotalVfx] = useState(0);
  const [totalBtc, setTotalBtc] = useState(0);
  const [cryptoAddress, setCryptoAddress] = useState('');

  const tax = subtotal * taxRate;
  const tipAmount = customTip ? parseFloat(customTip) || 0 : subtotal * tipPct;
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal + tax + tipAmount - discountAmount);

  const vfxAddress = settings.store_vfx_address ?? '';
  const btcAddress = settings.store_btc_address ?? '';

  const handleMethodSelect = async (m: PayMethod) => {
    setMethod(m);

    if (m === 'card') {
      // Create Stripe PaymentIntent
      const res = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          total_usd: total,
          tip_usd: tipAmount,
          discount_usd: discountAmount,
        }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
        setTotalVfx(data.total_vfx);
        setTotalBtc(data.total_btc);
        setStep('stripe');
      }
    } else if (m === 'cash') {
      // Create order record for cash
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total_usd: total, payment_method: 'cash' }),
      });
      const data = await res.json();
      setOrderId(data.id);
      setTotalVfx(data.total_vfx);
      setTotalBtc(data.total_btc);
      setStep('cash_confirm');
    } else {
      // VFX, BTC, or USDC crypto
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total_usd: total, payment_method: m }),
      });
      const data = await res.json();
      setOrderId(data.id);
      setTotalVfx(data.total_vfx);
      setTotalBtc(data.total_btc);

      const addrRes = await fetch(`/api/payment/address?method=${m === 'usdc' ? 'usdc' : m}`);
      const addrData = await addrRes.json();
      setCryptoAddress(addrData.address ?? '');
      setStep('crypto_qr');
    }
  };

  const handleStripeSuccess = async (paymentIntentId: string) => {
    await fetch('/api/stripe/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId }),
    });
    onConfirmed({ method, txId: paymentIntentId, orderId, totalUsd: total, totalVfx, totalBtc });
  };

  const handleCashConfirm = () => {
    // Mark cash order as confirmed
    fetch(`/api/orders/${orderId}/confirm`, { method: 'POST' }).catch(() => null);
    onConfirmed({ method: 'cash', orderId, totalUsd: total, totalVfx, totalBtc });
  };

  const methodLabel: Record<PayMethod, string> = {
    card: 'Card / Apple Pay / Google Pay',
    cash: 'Cash',
    vfx: 'VFX Coin',
    btc: 'Bitcoin',
    usdc: 'USDC Stablecoin',
  };

  const methodColor: Record<PayMethod, string> = {
    card: 'border-blue-700 hover:border-blue-500 hover:bg-blue-900/20',
    cash: 'border-yellow-700 hover:border-yellow-500 hover:bg-yellow-900/20',
    vfx: 'border-emerald-700 hover:border-emerald-500 hover:bg-emerald-900/20',
    btc: 'border-orange-700 hover:border-orange-500 hover:bg-orange-900/20',
    usdc: 'border-indigo-700 hover:border-indigo-500 hover:bg-indigo-900/20',
  };

  const methodIcon: Record<PayMethod, string> = {
    card: '💳',
    cash: '💵',
    vfx: '⬡',
    btc: '₿',
    usdc: '🔵',
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800">
          <h2 className="text-white font-bold text-lg">Checkout</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Method selection screen */}
        {step === 'method' && (
          <div className="p-5 space-y-4">
            {/* Order summary */}
            <div className="bg-gray-800 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span><span>{formatUsd(subtotal)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span><span>{formatUsd(tax)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tip</span><span>{formatUsd(tipAmount)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span><span>−{formatUsd(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold border-t border-gray-700 pt-1 mt-1 text-base">
                <span>Total</span><span>{formatUsd(total)}</span>
              </div>
            </div>

            {/* Tip selector */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Tip</p>
              <div className="flex gap-2 flex-wrap">
                {TIP_PRESETS.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setTipPct(pct); setCustomTip(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      tipPct === pct && !customTip
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {pct === 0 ? 'No tip' : `${(pct * 100).toFixed(0)}%`}
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Custom $"
                  value={customTip}
                  onChange={(e) => { setCustomTip(e.target.value); setTipPct(0); }}
                  className="w-20 px-2 py-1.5 rounded-lg bg-gray-800 text-white text-xs border border-gray-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Discount */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Discount ($)</p>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-32 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-sm border border-gray-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Settlement choice (shown for crypto methods) */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Settlement</p>
              <div className="flex gap-2">
                {(['usd', 'usdc', 'split'] as SettlementMode[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSettlement(s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      settlement === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {s === 'usd' ? '→ USD' : s === 'usdc' ? '→ USDC' : '80/20 Split'}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment methods */}
            <div>
              <p className="text-gray-400 text-xs mb-2">Pay with</p>
              <div className="space-y-2">
                {(['card', 'cash', 'usdc', 'vfx', 'btc'] as PayMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleMethodSelect(m)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${methodColor[m]}`}
                  >
                    <span className="text-xl w-8 text-center">{methodIcon[m]}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{methodLabel[m]}</p>
                      {m === 'vfx' && (
                        <p className="text-emerald-400 text-xs">{formatVfx(usdToVfx(total, vfxRate))} VFX</p>
                      )}
                      {m === 'btc' && (
                        <p className="text-orange-400 text-xs">{formatBtc(usdToBtcSatoshis(total, btcRate))} BTC</p>
                      )}
                      {m === 'usdc' && (
                        <p className="text-indigo-400 text-xs">{formatUsd(total)} USDC</p>
                      )}
                    </div>
                    <span className="text-gray-600">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stripe card/wallet payment */}
        {step === 'stripe' && clientSecret && (
          <div className="p-5">
            <h3 className="text-white font-semibold mb-4">Card / Digital Wallet</h3>
            <StripeCheckout
              clientSecret={clientSecret}
              totalUsd={total}
              onSuccess={handleStripeSuccess}
              onCancel={() => setStep('method')}
            />
          </div>
        )}

        {/* Cash confirmation */}
        {step === 'cash_confirm' && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <p className="text-5xl mb-3">💵</p>
              <p className="text-white font-bold text-2xl">{formatUsd(total)}</p>
              <p className="text-gray-400 text-sm mt-1">Collect cash from customer</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-sm">Amount tendered</p>
              <p className="text-white text-3xl font-bold mt-1">{formatUsd(total)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('method')}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={handleCashConfirm}
                className="flex-1 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold transition-colors"
              >
                ✓ Cash Received
              </button>
            </div>
          </div>
        )}

        {/* Crypto / QR payment */}
        {step === 'crypto_qr' && (
          <div className="p-5">
            <CryptoQRStep
              method={method}
              address={cryptoAddress}
              orderId={orderId}
              total={total}
              totalVfx={totalVfx}
              totalBtc={totalBtc}
              onConfirmed={(txId) => onConfirmed({ method, txId, orderId, totalUsd: total, totalVfx, totalBtc })}
              onBack={() => setStep('method')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Inline crypto QR step
function CryptoQRStep({
  method, address, orderId, total, totalVfx, totalBtc, onConfirmed, onBack,
}: {
  method: PayMethod;
  address: string;
  orderId: number;
  total: number;
  totalVfx: number;
  totalBtc: number;
  onConfirmed: (txId?: string) => void;
  onBack: () => void;
}) {
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const amountLabel =
    method === 'btc' ? `${formatBtc(totalBtc)} BTC`
    : method === 'usdc' ? `${formatUsd(total)} USDC`
    : `${formatVfx(totalVfx)} VFX`;

  useEffect(() => {
    if (!address) return;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(address, { width: 200, margin: 2 }).then(setQrUrl);
    });
  }, [address]);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).catch(() => null);
      if (!res) return;
      const data = await res.json();
      if (data.confirmed) {
        clearInterval(id);
        onConfirmed(data.txId);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [orderId, onConfirmed]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methodColor = method === 'btc' ? 'text-orange-400' : method === 'usdc' ? 'text-indigo-400' : 'text-emerald-400';

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className={`text-2xl font-bold ${methodColor}`}>{amountLabel}</p>
        <p className="text-gray-400 text-sm">{formatUsd(total)}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs">Waiting for payment…</span>
        </div>
      </div>

      <div className="flex justify-center">
        {qrUrl ? (
          <img src={qrUrl} alt="Payment QR" className="rounded-lg w-48 h-48" />
        ) : (
          <div className="w-48 h-48 bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 text-sm">
            {address ? 'Generating QR…' : 'No address configured'}
          </div>
        )}
      </div>

      {address && (
        <button
          onClick={copyAddress}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono break-all text-center hover:bg-gray-700 transition-colors"
        >
          {copied ? '✓ Copied!' : address}
        </button>
      )}

      <button
        onClick={onBack}
        className="w-full py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
      >
        ← Change payment method
      </button>
    </div>
  );
}
