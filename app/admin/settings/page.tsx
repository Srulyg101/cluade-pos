'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Settings {
  store_name: string;
  store_vfx_address: string;
  store_btc_address: string;
  store_usdc_address: string;
  vfx_usd_rate: string;
  btc_usd_rate: string;
  tax_rate: string;
}

interface StripeStatus {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  email?: string | null;
}

function SettingsInner() {
  const searchParams = useSearchParams();
  const stripeParam = searchParams.get('stripe');

  const [form, setForm] = useState<Settings>({
    store_name: '',
    store_vfx_address: '',
    store_btc_address: '',
    store_usdc_address: '',
    vfx_usd_rate: '0.10',
    btc_usd_rate: '65000',
    tax_rate: '0',
  });
  const [saved, setSaved] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const loadStatus = () =>
    fetch('/api/stripe/status').then((r) => r.json()).then(setStripeStatus);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setForm);
    loadStatus();
  }, []);

  // Re-trigger connect flow if Stripe redirected back with ?stripe=refresh
  useEffect(() => {
    if (stripeParam === 'refresh') handleConnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleConnect = async () => {
    setConnectLoading(true);
    const res = await fetch('/api/stripe/connect', { method: 'POST' });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Stripe account? Card payments will stop working.')) return;
    await fetch('/api/stripe/status', { method: 'DELETE' });
    setStripeStatus({ connected: false });
  };

  const f = (key: keyof Settings) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Stripe success banner */}
      {stripeParam === 'success' && (
        <div className="mb-5 bg-emerald-900/30 border border-emerald-700 rounded-xl px-4 py-3 text-emerald-300 text-sm">
          ✓ Stripe account connected! Card payments are ready.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Store */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Store</h2>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Store Name</label>
            <input
              {...f('store_name')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-400 mb-1 block">Tax Rate (e.g. 0.08 for 8%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              {...f('tax_rate')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </section>

        {/* Stripe Connect */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-xs flex items-center justify-center font-bold">
              S
            </span>
            Stripe — Card, Apple Pay, Google Pay
          </h2>
          <p className="text-gray-500 text-xs mb-4">
            Connect your Stripe account to accept card and digital wallet payments
          </p>

          {stripeStatus === null ? (
            <div className="text-gray-600 text-xs">Checking status…</div>
          ) : stripeStatus.connected ? (
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-xl p-3 text-sm space-y-2">
                {stripeStatus.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account</span>
                    <span className="text-white">{stripeStatus.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Charges</span>
                  <span
                    className={
                      stripeStatus.chargesEnabled ? 'text-emerald-400' : 'text-yellow-400'
                    }
                  >
                    {stripeStatus.chargesEnabled ? '✓ Enabled' : '⏳ Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payouts</span>
                  <span
                    className={
                      stripeStatus.payoutsEnabled ? 'text-emerald-400' : 'text-yellow-400'
                    }
                  >
                    {stripeStatus.payoutsEnabled ? '✓ Enabled' : '⏳ Pending'}
                  </span>
                </div>
              </div>
              {!stripeStatus.chargesEnabled && (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connectLoading}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {connectLoading ? 'Redirecting…' : 'Complete Stripe Setup →'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Disconnect Stripe account
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connectLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {connectLoading ? 'Redirecting to Stripe…' : 'Connect Stripe Account'}
            </button>
          )}
        </section>

        {/* VFX */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-xs flex items-center justify-center font-bold">
              V
            </span>
            VFX Payments
          </h2>
          <p className="text-gray-500 text-xs mb-4">Your store&apos;s VFX address to receive payments</p>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">VFX Receiving Address</label>
            <input
              {...f('store_vfx_address')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              placeholder="RBx..."
            />
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-400 mb-1 block">VFX / USD Rate (1 VFX = ? USD)</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              {...f('vfx_usd_rate')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </section>

        {/* USDC */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-xs flex items-center justify-center font-bold">
              $
            </span>
            USDC Stablecoin
          </h2>
          <p className="text-gray-500 text-xs mb-4">Ethereum address to receive USDC payments</p>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">USDC Receiving Address (EVM)</label>
            <input
              {...f('store_usdc_address')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
              placeholder="0x..."
            />
          </div>
        </section>

        {/* BTC */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 text-xs flex items-center justify-center font-bold">
              ₿
            </span>
            Bitcoin Payments
          </h2>
          <p className="text-gray-500 text-xs mb-4">Your store&apos;s BTC address to receive payments</p>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">BTC Receiving Address</label>
            <input
              {...f('store_btc_address')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
              placeholder="bc1..."
            />
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-400 mb-1 block">BTC / USD Rate (1 BTC = ? USD)</label>
            <input
              type="number"
              step="1"
              min="0"
              {...f('btc_usd_rate')}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </section>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
