'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface SignUpLinkModalProps {
  onClose: () => void;
}

export default function SignUpLinkModal({ onClose }: SignUpLinkModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signupUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/signup`
      : '/signup';

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, signupUrl, {
        width: 220,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [signupUrl]);

  const copyLink = () => navigator.clipboard.writeText(signupUrl);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-white">Customer Sign-Up</h2>
          <p className="text-gray-400 text-sm mt-1">
            Show this QR code or share the link so customers can create their VerifiedX account
          </p>
        </div>

        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} className="rounded-lg" />
        </div>

        <button
          onClick={copyLink}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono break-all text-center hover:bg-gray-700 transition-colors mb-3"
        >
          {signupUrl}
        </button>

        <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-3 mb-4 text-xs text-emerald-300 space-y-1">
          <p>✓ Email + PIN — no password to remember</p>
          <p>✓ Instant VFX wallet address generated</p>
          <p>✓ Connect a bank account for easy top-up</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 py-2 rounded-xl border border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 transition-colors text-sm"
          >
            Copy Link
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
