'use client';

import { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

function PaymentForm({
  onSuccess,
  onCancel,
  totalUsd,
}: {
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
  totalUsd: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message ?? 'Payment failed');
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError('Payment was not completed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: { applePay: 'auto', googlePay: 'auto' },
          }}
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-center text-gray-400 text-sm">
        Charging <span className="text-white font-bold">${totalUsd.toFixed(2)}</span>
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors disabled:opacity-50 text-sm"
        >
          {processing ? 'Processing…' : 'Pay Now'}
        </button>
      </div>
    </form>
  );
}

interface StripeCheckoutProps {
  clientSecret: string;
  totalUsd: number;
  stripeAccount?: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

export default function StripeCheckout({
  clientSecret,
  totalUsd,
  stripeAccount,
  onSuccess,
  onCancel,
}: StripeCheckoutProps) {
  // Re-initialize Stripe.js when the connected account changes
  const stripePromise = useMemo(
    () =>
      loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
        stripeAccount ? { stripeAccount } : {}
      ),
    [stripeAccount]
  );

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#10b981',
            colorBackground: '#1f2937',
            colorText: '#f9fafb',
            borderRadius: '12px',
          },
        },
      }}
    >
      <PaymentForm onSuccess={onSuccess} onCancel={onCancel} totalUsd={totalUsd} />
    </Elements>
  );
}
