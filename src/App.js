import React from 'react'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { registerNav } from './modules/Navigation'
import { LangProvider } from './context/LangContext'
import { CartProvider } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import './App.css'

function Gate() {
  const { user, initializing } = useAuth()

  if (initializing) return null
  if (!user) return <Login />

  return (
    <Router ref={registerNav}>
      <Switch>
        <Route exact path="/" component={Menu} />
        <Route path="/bag" component={Cart} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/order-confirmation" component={OrderConfirmation} />
      </Switch>
    </Router>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <CartProvider>
          <div className="hg-app">
            <Gate />
          </div>
        </CartProvider>
      </AuthProvider>
    </LangProvider>
  )
}
