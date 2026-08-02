import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { useLang } from '../context/LangContext'
import { useCart } from '../context/CartContext'
import restaurant from '../config/restaurant'

export default function Cart() {
  const { lang, t } = useLang()
  const { items, setQty, removeItem, totalPrice } = useCart()

  return (
    <div>
      <Header />
      <div className="hg-page">
        <div className="hg-page-title">{t('yourBag')}</div>

        {items.length === 0 ? (
          <div className="hg-empty">{t('emptyBag')}</div>
        ) : (
          <>
            {items.map(item => (
              <div key={item.id} className="hg-cart-row">
                <div>
                  <div className="hg-cart-row-name">{item[lang].name}</div>
                  <div className="hg-cart-row-price">
                    {item.price.toFixed(2)} {restaurant.currency}
                  </div>
                  <button className="hg-remove" onClick={() => removeItem(item.id)}>
                    {t('remove')}
                  </button>
                </div>
                <div className="hg-qty">
                  <button onClick={() => setQty(item.id, item.qty - 1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => setQty(item.id, item.qty + 1)}>+</button>
                </div>
              </div>
            ))}

            <div className="hg-summary">
              <div className="hg-summary-row">
                <span>{t('subtotal')}</span>
                <span>
                  {totalPrice.toFixed(2)} {restaurant.currency}
                </span>
              </div>
            </div>

            <Link to="/checkout" className="hg-btn-primary">
              {t('checkout')}
            </Link>
          </>
        )}
        <Link to="/" className="hg-btn-outline">
          {t('continueShopping')}
        </Link>
      </div>
    </div>
  )
}
