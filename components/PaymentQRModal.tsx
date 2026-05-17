'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { formatVfx, formatBtc, formatUsd } from '@/lib/price';

interface PaymentQRModalProps {
  orderId: number;
  method: 'vfx' | 'btc';
  address: string;
  totalUsd: number;
  totalVfx: number;
  totalBtc: number;
  onConfirmed: (txId?: string) => void;
  onCancel: () => void;
}

export default function PaymentQRModal({
  orderId,
  method,
  address,
  totalUsd,
  totalVfx,
  totalBtc,
  onConfirmed,
  onCancel,
}: PaymentQRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const amountLabel =
    method === 'vfx'
      ? `${formatVfx(totalVfx)} VFX`
      : `${formatBtc(totalBtc)} BTC`;

  const accentColor = method === 'vfx' ? 'emerald' : 'orange';

  useEffect(() => {
    if (canvasRef.current && address) {
      QRCode.toCanvas(canvasRef.current, address, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [address]);

  useEffect(() => {
    if (!polling) return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (data.confirmed) {
          setPolling(false);
          clearInterval(intervalRef.current!);
          onConfirmed(data.txId);
        }
      } catch {
        // ignore network errors during polling
      }
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId, polling, onConfirmed]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white
              ${method === 'vfx' ? 'bg-emerald-600' : 'bg-orange-500'}`}
          >
            {method.toUpperCase()}
          </div>
          <div>
            <h2 className="text-white font-bold">Waiting for Payment</h2>
            <p className="text-gray-400 text-xs">Order #{orderId}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs">Live</span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-center mb-4">
          <p className={`text-2xl font-bold ${method === 'vfx' ? 'text-emerald-400' : 'text-orange-400'}`}>
            {amountLabel}
          </p>
          <p className="text-gray-400 text-sm">{formatUsd(totalUsd)}</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          {address ? (
            <canvas ref={canvasRef} className="rounded-lg" />
          ) : (
            <div className="w-[200px] h-[200px] bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-yellow-400 text-xs text-center px-4">
                No {method.toUpperCase()} address configured.{' '}
                <a href="/admin/settings" className="underline">Set it in Settings.</a>
              </p>
            </div>
          )}
        </div>

        {/* Address */}
        {address && (
          <button
            onClick={copyAddress}
            className="w-full bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono break-all text-center hover:bg-gray-700 transition-colors mb-4"
          >
            {copied ? '✓ Copied!' : address}
          </button>
        )}

        <p className="text-gray-500 text-xs text-center mb-4">
          Send exactly <span className="text-white">{amountLabel}</span> to the address above
        </p>

        <button
          onClick={onCancel}
          className="w-full py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
        >
          Cancel Payment
        </button>
      </div>
    </div>
  );
}
