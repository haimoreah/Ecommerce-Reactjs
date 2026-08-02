import React, { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || []
    } catch (e) {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const addItem = product => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id))

  const setQty = (id, qty) => {
    if (qty <= 0) return removeItem(id)
    setItems(prev => prev.map(i => (i.id === id ? { ...i, qty } : i)))
  }

  const clearCart = () => setItems([])

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.qty * i.price, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, setQty, clearCart, totalCount, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
