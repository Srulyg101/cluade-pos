'use client';

import { formatUsd, formatVfx, formatBtc, usdToVfx, usdToBtcSatoshis } from '@/lib/price';

interface CheckoutModalProps {
  total: number;
  vfxRate: number;
  btcRate: number;
  vfxAddress: string;
  btcAddress: string;
  onSelect: (method: 'vfx' | 'btc') => void;
  onCancel: () => void;
}

export default function CheckoutModal({
  total,
  vfxRate,
  btcRate,
  vfxAddress,
  btcAddress,
  onSelect,
  onCancel,
}: CheckoutModalProps) {
  const vfxAmount = usdToVfx(total, vfxRate);
  const btcSatoshis = usdToBtcSatoshis(total, btcRate);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-1">Select Payment Method</h2>
        <p className="text-gray-400 text-sm mb-6">
          Total: <span className="text-white font-bold">{formatUsd(total)}</span>
        </p>

        <div className="space-y-3">
          {/* VFX Option */}
          <button
            onClick={() => onSelect('vfx')}
            disabled={!vfxAddress}
            className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              border-gray-700 hover:border-emerald-500 hover:bg-emerald-900/30 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
              VFX
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">Pay with VFX</p>
              <p className="text-emerald-400 text-sm">{formatVfx(vfxAmount)} VFX</p>
              {!vfxAddress && (
                <p className="text-yellow-500 text-xs mt-0.5">No VFX address configured</p>
              )}
            </div>
            <span className="text-gray-500">→</span>
          </button>

          {/* BTC Option */}
          <button
            onClick={() => onSelect('btc')}
            disabled={!btcAddress}
            className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              border-gray-700 hover:border-orange-500 hover:bg-orange-900/20 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
              BTC
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">Pay with Bitcoin</p>
              <p className="text-orange-400 text-sm">{formatBtc(btcSatoshis)} BTC</p>
              {!btcAddress && (
                <p className="text-yellow-500 text-xs mt-0.5">No BTC address configured</p>
              )}
            </div>
            <span className="text-gray-500">→</span>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-4 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
