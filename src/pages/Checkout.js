import React, { useState } from 'react'
import Header from '../components/Header'
import { useLang } from '../context/LangContext'
import { useCart } from '../context/CartContext'
import restaurant from '../config/restaurant'
import jumpTo from '../modules/Navigation'

function buildWhatsAppMessage({ lang, items, totalPrice, orderType, name, phone, address, notes }) {
  const lines = []
  lines.push(`${restaurant.name} - ${orderType === 'delivery' ? 'Delivery' : 'Pickup'} order`)
  lines.push(`Name: ${name}`)
  lines.push(`Phone: ${phone}`)
  if (orderType === 'delivery') lines.push(`Address: ${address}`)
  lines.push('')
  items.forEach(item => {
    lines.push(`${item.qty} x ${item[lang].name} - ${(item.qty * item.price).toFixed(2)} ${restaurant.currency}`)
  })
  lines.push('')
  lines.push(`Total: ${totalPrice.toFixed(2)} ${restaurant.currency}`)
  if (notes) lines.push(`Notes: ${notes}`)
  return lines.join('\n')
}

export default function Checkout() {
  const { lang, t } = useLang()
  const { items, totalPrice, clearCart } = useCart()
  const [orderType, setOrderType] = useState('pickup')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState('cash')

  const canSubmit =
    name.trim() &&
    phone.trim() &&
    (orderType === 'pickup' || address.trim()) &&
    items.length > 0

  const handlePlaceOrder = () => {
    if (!canSubmit) return
    const message = buildWhatsAppMessage({ lang, items, totalPrice, orderType, name, phone, address, notes })
    const waUrl = `https://wa.me/${restaurant.whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank')
    clearCart()
    jumpTo('/order-confirmation')
  }

  return (
    <div>
      <Header />
      <div className="hg-page">
        <div className="hg-page-title">{t('checkout')}</div>

        <div className="hg-order-type">
          <button className={orderType === 'pickup' ? 'active' : ''} onClick={() => setOrderType('pickup')}>
            {t('pickup')}
          </button>
          <button className={orderType === 'delivery' ? 'active' : ''} onClick={() => setOrderType('delivery')}>
            {t('delivery')}
          </button>
        </div>

        <div className="hg-summary" style={{ marginTop: 16 }}>
          <div className="hg-form-group" style={{ marginBottom: 0 }}>
            <label>{t('contactInfo')}</label>
          </div>
          <div className="hg-form-group">
            <input placeholder={t('name')} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="hg-form-group">
            <input placeholder={t('phone')} value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          {orderType === 'delivery' && (
            <div className="hg-form-group">
              <input
                placeholder={t('address')}
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
          )}
          <div className="hg-form-group">
            <textarea
              rows={2}
              placeholder={t('notes')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="hg-summary">
          <label style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>{t('paymentMethod')}</label>
          <div
            className="hg-payment-option"
            style={{ border: payment === 'cash' ? '2px solid var(--hg-yellow)' : '2px solid transparent' }}
            onClick={() => setPayment('cash')}
          >
            <input type="radio" readOnly checked={payment === 'cash'} />
            {t('cash')}
          </div>
          <div
            className={`hg-payment-option ${restaurant.onlinePaymentEnabled ? '' : 'disabled'}`}
            onClick={() => restaurant.onlinePaymentEnabled && setPayment('card')}
          >
            <input type="radio" readOnly checked={payment === 'card'} disabled={!restaurant.onlinePaymentEnabled} />
            {t('card')}
          </div>
          {!restaurant.onlinePaymentEnabled && <div className="hg-hint">{t('cardComingSoon')}</div>}
        </div>

        <div className="hg-summary">
          <div className="hg-summary-row">
            <span>{t('total')}</span>
            <span>
              {totalPrice.toFixed(2)} {restaurant.currency}
            </span>
          </div>
        </div>

        <button className="hg-btn-primary" disabled={!canSubmit} onClick={handlePlaceOrder}>
          {t('placeOrder')}
        </button>
      </div>
    </div>
  )
}
