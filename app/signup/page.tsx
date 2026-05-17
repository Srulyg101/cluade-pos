'use client';

import { useState } from 'react';

type Step = 'form' | 'success' | 'bank';

interface AccountData {
  address: string;
  publicKey: string;
}

export default function SignUpPage() {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [account, setAccount] = useState<AccountData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bank form state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankDone, setBankDone] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setAccount(data);
      setStep('success');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBankDone(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-2xl mx-auto mb-3">
            VX
          </div>
          <h1 className="text-2xl font-bold text-white">VerifiedX Account</h1>
          <p className="text-gray-400 text-sm mt-1">Create your account in seconds</p>
        </div>

        {/* Step: Form */}
        {step === 'form' && (
          <form onSubmit={handleSignUp} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">PIN (4+ digits)</label>
              <input
                type="password"
                inputMode="numeric"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                maxLength={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors tracking-widest text-lg"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                maxLength={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors tracking-widest text-lg"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="bg-gray-800/60 rounded-xl p-3 text-xs text-gray-400 space-y-1">
              <p>✓ Your PIN + email generates your wallet — no password reset needed</p>
              <p>✓ Keep your PIN secret — anyone with it can access your account</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Step: Success / Wallet created */}
        {step === 'success' && account && (
          <div className="bg-gray-900 rounded-2xl border border-emerald-800 p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-2">
                <span className="text-emerald-400 text-2xl">✓</span>
              </div>
              <h2 className="text-lg font-bold text-white">Account Created!</h2>
              <p className="text-gray-400 text-sm">Your VerifiedX wallet is ready</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Your VFX Address</p>
              <p className="text-emerald-400 text-xs font-mono break-all">{account.address}</p>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-3 text-xs text-yellow-300">
              <p className="font-semibold mb-1">⚠ Save your credentials</p>
              <p>Your wallet is derived from your email + PIN. If you forget your PIN, you cannot recover your funds.</p>
            </div>

            <button
              onClick={() => setStep('bank')}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
            >
              Connect Bank Account →
            </button>
          </div>
        )}

        {/* Step: Bank Account */}
        {step === 'bank' && !bankDone && (
          <form onSubmit={handleBankSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Connect Bank Account</h2>
              <p className="text-gray-400 text-sm">
                Link your bank to easily top up your VFX balance with USD
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Bank Name</label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Chase, Wells Fargo"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Account Number</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Routing Number</label>
              <input
                type="text"
                required
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="9 digits"
                maxLength={9}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>

            <div className="bg-gray-800/60 rounded-xl p-3 text-xs text-gray-400">
              Your bank details are used to fund your VFX wallet. Funds are converted at market rate.
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
            >
              Connect Bank
            </button>

            <button
              type="button"
              onClick={() => setBankDone(true)}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              Skip for now
            </button>
          </form>
        )}

        {/* All done */}
        {step === 'bank' && bankDone && (
          <div className="bg-gray-900 rounded-2xl border border-emerald-800 p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto">
              <span className="text-emerald-400 text-4xl">🎉</span>
            </div>
            <h2 className="text-xl font-bold text-white">You're all set!</h2>
            <p className="text-gray-400 text-sm">
              Your VerifiedX account is ready. You can now pay at any VerifiedX POS terminal using your email and PIN.
            </p>
            <div className="bg-gray-800 rounded-xl p-3 text-left">
              <p className="text-xs text-gray-500 mb-1">Your VFX Address</p>
              <p className="text-emerald-400 text-xs font-mono break-all">{account?.address}</p>
            </div>
            <a
              href="/"
              className="block w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors text-center"
            >
              Back to Store
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
