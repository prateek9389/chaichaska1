"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("chai_cart");
    if (stored) {
      try {
        setCartItems(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("chai_cart", JSON.stringify(cartItems));
    }
  }, [cartItems, isLoaded]);

  const addToCart = (item) => {
    setCartItems((prev) => {
      // Create a unique id based on item properties if needed, or just append
      // If we want to group identical items:
      const existing = prev.find(
        (i) => i.id === item.id && i.sugar === item.sugar && i.addons === item.addons
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (indexToRemove) => {
    setCartItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const updateQuantity = (index, quantity) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((i, idx) => (idx === index ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setCartItems([]);

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const priceVal = parseInt(String(item.price).replace(/[^0-9]/g, "")) || 0;
      return total + priceVal * item.quantity;
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
