import React, { useMemo, useState } from 'react'
import Header from '../components/Header'
import { useLang } from '../context/LangContext'
import { useCart } from '../context/CartContext'
import { categories, menuItems } from '../data/menu'
import restaurant from '../config/restaurant'

export default function Menu() {
  const { lang, t } = useLang()
  const { addItem } = useCart()
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const [orderType, setOrderType] = useState('pickup')
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return menuItems.filter(item => {
      const matchesCategory = !q || item.category === activeCategory
      const inCategory = q ? true : item.category === activeCategory
      const matchesQuery = !q || item[lang].name.toLowerCase().includes(q)
      return q ? matchesQuery : (matchesCategory && inCategory)
    })
  }, [activeCategory, query, lang])

  return (
    <div>
      <Header />
      <div className="hg-promo">{restaurant.tagline[lang]}</div>

      <div className="hg-order-type">
        <button
          className={orderType === 'pickup' ? 'active' : ''}
          onClick={() => setOrderType('pickup')}
        >
          {t('pickup')}
        </button>
        <button
          className={orderType === 'delivery' ? 'active' : ''}
          onClick={() => setOrderType('delivery')}
        >
          {t('delivery')}
        </button>
      </div>

      <div className="hg-search">
        <input
          type="text"
          placeholder={t('search')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {!query && (
        <div className="hg-tabs">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`hg-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat[lang]}
            </button>
          ))}
        </div>
      )}

      <div className="hg-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="hg-card">
            <div className="hg-card-name">{item[lang].name}</div>
            {item[lang].desc && <div className="hg-card-desc">{item[lang].desc}</div>}
            <div className="hg-card-footer">
              <span className="hg-price">
                {item.price.toFixed(2)} {restaurant.currency}
              </span>
              <button className="hg-add-btn" onClick={() => addItem(item)}>
                {t('addToCart')}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="hg-footer">
        {restaurant.name} © {new Date().getFullYear()}
      </div>
    </div>
  )
}
