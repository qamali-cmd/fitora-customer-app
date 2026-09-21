// src/context/CartContext.js
// Ito ang humahawak sa laman ng shopping cart.
// BAGO: naka-save na ito gamit ang AsyncStorage, kaya hindi na nawawala
// ang laman ng cart kahit isara/buksan ulit ang app.

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'fitora_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // [{ product, quantity }]
  const [loaded, setLoaded] = useState(false);
  const isFirstLoad = useRef(true);

  // Ibalik ang naka-save na cart pagbukas ng app
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (saved) setItems(JSON.parse(saved));
      } catch (err) {
        console.error(err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // I-save tuwing may nagbabago sa cart (maliban sa unang pag-load)
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch(err => console.error(err));
  }, [items]);

  function addToCart(product, quantity = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.product.product_id === product.product_id);
      if (existing) {
        return prev.map(i =>
          i.product.product_id === product.product_id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, quantity }];
    });
  }

  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev => prev.map(i => (i.product.product_id === productId ? { ...i, quantity } : i)));
  }

  function removeFromCart(productId) {
    setItems(prev => prev.filter(i => i.product.product_id !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, updateQuantity, removeFromCart, clearCart, total, itemCount, loaded }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}