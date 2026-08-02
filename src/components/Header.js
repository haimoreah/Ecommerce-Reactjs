import React from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import restaurant from '../config/restaurant'

export default function Header() {
  const { lang, toggleLang, t } = useLang()
  const { totalCount } = useCart()
  const { logout } = useAuth()

  return (
    <header className="hg-header">
      <div className="hg-header-inner">
        <Link to="/" className="hg-logo">
          <span className="hg-o" />
          {restaurant.name}
        </Link>
        <div className="hg-header-actions">
          <button className="hg-lang-btn" onClick={toggleLang}>
            {lang === 'en' ? 'عربي' : 'EN'}
          </button>
          <button className="hg-lang-btn" onClick={logout}>
            {t('logout')}
          </button>
          <Link to="/bag" className="hg-cart-btn">
            {t('yourBag')}
            {totalCount > 0 && <span className="hg-cart-badge">{totalCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  )
}
