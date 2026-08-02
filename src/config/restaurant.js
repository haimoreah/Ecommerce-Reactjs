// Edit these values for your restaurant.
const restaurant = {
  name: 'Hoagies',
  tagline: { en: 'Cheesesteaks & More', ar: 'ساندويشات جبنة ستيك وأكتر' },
  currency: 'JOD',
  // WhatsApp number that orders get sent to, in international format, no + or spaces.
  whatsappNumber: '9627XXXXXXXX',
  // Set to true once you've connected a real payment provider (Stripe, HyperPay, PayTabs...).
  // Until then, only Cash on Delivery / Pay at Pickup is offered at checkout.
  onlinePaymentEnabled: false,
}

export default restaurant
