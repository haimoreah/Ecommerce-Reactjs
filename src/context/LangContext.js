import React, { createContext, useContext, useEffect, useState } from 'react'

const strings = {
  en: {
    pickup: 'Pick Up',
    delivery: 'Delivery',
    search: 'Search menu',
    addToCart: 'Add',
    yourBag: 'Your Bag',
    emptyBag: 'Your bag is empty',
    subtotal: 'Subtotal',
    checkout: 'Checkout',
    continueShopping: 'Continue Shopping',
    contactInfo: 'Contact Info',
    name: 'Name',
    phone: 'Phone Number',
    address: 'Delivery Address',
    orderType: 'Order Type',
    paymentMethod: 'Payment Method',
    cash: 'Cash on Delivery / Pay at Pickup',
    card: 'Pay by Card',
    cardComingSoon: 'Online card payment is not connected yet, please choose cash for now.',
    notes: 'Notes (optional)',
    placeOrder: 'Place Order',
    orderPlaced: 'Order Sent!',
    orderPlacedDesc: 'Your order was sent over WhatsApp. Please confirm it there and we will start preparing it right away.',
    backToMenu: 'Back to Menu',
    total: 'Total',
    remove: 'Remove',
  },
  ar: {
    pickup: 'استلام',
    delivery: 'توصيل',
    search: 'دور على أكل',
    addToCart: 'أضف',
    yourBag: 'سلتك',
    emptyBag: 'سلتك فاضية',
    subtotal: 'المجموع الفرعي',
    checkout: 'إتمام الطلب',
    continueShopping: 'كمل تسوق',
    contactInfo: 'معلومات التواصل',
    name: 'الاسم',
    phone: 'رقم الموبايل',
    address: 'عنوان التوصيل',
    orderType: 'نوع الطلب',
    paymentMethod: 'طريقة الدفع',
    cash: 'كاش عند الاستلام / التوصيل',
    card: 'دفع بالبطاقة',
    cardComingSoon: 'الدفع الإلكتروني بالبطاقة مش مفعّل لسا، فضلاً اختر الدفع كاش حالياً.',
    notes: 'ملاحظات (اختياري)',
    placeOrder: 'أرسل الطلب',
    orderPlaced: 'تم إرسال الطلب!',
    orderPlacedDesc: 'تم إرسال طلبك عبر واتساب. أكّده هناك وبنبلش نحضره فوراً.',
    backToMenu: 'رجوع للقائمة',
    total: 'الإجمالي',
    remove: 'حذف',
  },
}

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en')

  useEffect(() => {
    localStorage.setItem('lang', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])

  const toggleLang = () => setLang(l => (l === 'en' ? 'ar' : 'en'))
  const t = key => strings[lang][key] || key

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
