'use client';

import { create } from 'zustand';

export interface CartItem {
  id: number;
  name: string;
  price_usd: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: { id: number; name: string; price_usd: number }) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity: 1 }] };
    }),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
    })),

  clear: () => set({ items: [] }),

  subtotal: () =>
    get().items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0),
}));
