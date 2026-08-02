import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { useLang } from '../context/LangContext'

export default function OrderConfirmation() {
  const { t } = useLang()
  return (
    <div>
      <Header />
      <div className="hg-confirm">
        <span className="hg-confirm-icon" role="img" aria-label="success">
          ✅
        </span>
        <h2>{t('orderPlaced')}</h2>
        <p>{t('orderPlacedDesc')}</p>
        <Link to="/" className="hg-btn-primary" style={{ maxWidth: 260, margin: '20px auto 0' }}>
          {t('backToMenu')}
        </Link>
      </div>
    </div>
  )
}
