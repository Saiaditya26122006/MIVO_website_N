"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Cart, CartItem, CartSummary } from "@/lib/data/cart-types";

interface CartContextValue {
  cart: Cart;
  summary: CartSummary;
  addItem: (item: Omit<CartItem, "id">) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const CART_STORAGE_KEY = "mivo_cart";
const MAX_QUANTITY = 99;

function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateSummary(items: CartItem[]): CartSummary {
  const subtotalPaise = items.reduce(
    (sum, item) => sum + item.unitPricePaise * item.quantity,
    0
  );

  // Simple flat-rate shipping for now (₹100)
  // In M6, this will be replaced with admin-configured shipping rates
  const shippingPaise = items.length > 0 ? 10000 : 0;

  return {
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function loadCartFromStorage(): Cart {
  if (typeof window === "undefined") {
    return { items: [], updatedAt: new Date().toISOString() };
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return { items: [], updatedAt: new Date().toISOString() };
    }

    const parsed = JSON.parse(stored) as Cart;
    return parsed;
  } catch (error) {
    console.warn("[Cart] Failed to load cart from storage:", error);
    return { items: [], updatedAt: new Date().toISOString() };
  }
}

function saveCartToStorage(cart: Cart): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("[Cart] Failed to save cart to storage:", error);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], updatedAt: "" });
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loaded = loadCartFromStorage();
    setCart(loaded);
    setIsLoading(false);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveCartToStorage(cart);
    }
  }, [cart, isLoading]);

  const addItem = useCallback((newItem: Omit<CartItem, "id">) => {
    setCart((prev) => {
      // Check if item with same product, variant, and color already exists
      const existingItemIndex = prev.items.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          item.variantId === newItem.variantId &&
          item.selectedColor === newItem.selectedColor
      );

      if (existingItemIndex !== -1) {
        // Update quantity of existing item
        const newQuantity = Math.min(
          prev.items[existingItemIndex].quantity + newItem.quantity,
          MAX_QUANTITY
        );

        const updatedItems = [...prev.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: newQuantity,
        };

        return {
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Add new item
        const cartItem: CartItem = {
          ...newItem,
          id: generateCartItemId(),
          quantity: Math.min(newItem.quantity, MAX_QUANTITY),
        };

        return {
          items: [...prev.items, cartItem],
          updatedAt: new Date().toISOString(),
        };
      }
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1 || quantity > MAX_QUANTITY) {
      console.warn(`[Cart] Invalid quantity: ${quantity}. Must be 1-${MAX_QUANTITY}`);
      return;
    }

    setCart((prev) => {
      const updatedItems = prev.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      );

      return {
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart((prev) => ({
      items: prev.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart({
      items: [],
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const summary = calculateSummary(cart.items);

  const value: CartContextValue = {
    cart,
    summary,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    isLoading,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
