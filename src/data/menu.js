export const categories = [
  { id: 'chicken-sandwiches', en: 'Chicken Sandwiches', ar: 'ساندويشات الدجاج' },
  { id: 'cheesesteaks', en: 'Cheesesteaks', ar: 'ساندويشات الستيك' },
  { id: 'burgers', en: 'Burgers', ar: 'البرغر' },
  { id: 'salads', en: 'Salads', ar: 'السلطات' },
  { id: 'appetizers', en: 'Appetizers', ar: 'المقبلات' },
  { id: 'fries', en: 'Fries', ar: 'فرايز' },
  { id: 'meals', en: 'Make It a Meal', ar: 'حولها لوجبة' },
  { id: 'drinks', en: 'Drinks', ar: 'مشروبات' },
]

export const menuItems = [
  // Chicken Sandwiches
  { id: 'chicken-philly', category: 'chicken-sandwiches', price: 4.49,
    en: { name: 'Chicken Philly', desc: 'Chicken breast, caramelized onions, bell peppers, white cheese and cheese whiz' },
    ar: { name: 'فيلي دجاج', desc: 'صدر دجاج، بصل مكرمل، فلفل أخضر، جبنة بيضاء، جبنة الويز' } },
  { id: 'miami-chicken', category: 'chicken-sandwiches', price: 4.49,
    en: { name: 'Miami Chicken', desc: 'Chicken breast, caramelized onions, bell peppers, miami sauce, white cheese and cheese whiz' },
    ar: { name: 'ميامي دجاج', desc: 'صدر دجاج، بصل مكرمل، فلفل أخضر، صوص الميامي، جبنة بيضاء، جبنة الويز' } },
  { id: 'crispy-chicken', category: 'chicken-sandwiches', price: 4.75,
    en: { name: 'Crispy Chicken', desc: 'Crispy fried chicken breast, gouda cheese, cream sauce, smoked turkey, mozzarella cheese and cheese whiz' },
    ar: { name: 'دجاج كرسبي', desc: 'صدر دجاج مقلي، جبنة الجودا، صوص كريمة، تركي مدخن، جبنة الموزاريلا، جبنة الويز' } },
  { id: 'mushroom-alfredo', category: 'chicken-sandwiches', price: 5.25,
    en: { name: 'Mushroom Alfredo', desc: 'Chicken breast, caramelized onions, mushrooms, alfredo sauce, mozzarella cheese' },
    ar: { name: 'دجاج الفريدو بالمشروم', desc: 'صدر دجاج، بصل مكرمل، فطر، صوص الآلفريدو، جبنة الموزاريلا' } },

  // Cheesesteaks
  { id: 'classic-cheesesteak', category: 'cheesesteaks', price: 4.99,
    en: { name: 'Classic Cheesesteak', desc: 'Steak, caramelized onions, white cheese and cheese whiz' },
    ar: { name: 'كلاسيك ستيك بالجبنة', desc: 'ستيك، بصل مكرمل، جبنة بيضاء، جبنة الويز' } },
  { id: 'philly-cheesesteak', category: 'cheesesteaks', price: 4.99,
    en: { name: 'Philly Cheesesteak', desc: 'Steak, caramelized onions, bell peppers, white cheese and cheese whiz' },
    ar: { name: 'فيلي ستيك بالجبنة', desc: 'ستيك، بصل مكرمل، فلفل أخضر، جبنة بيضاء، جبنة الويز' } },
  { id: 'mushroom-cheesesteak', category: 'cheesesteaks', price: 5.49,
    en: { name: 'Mushroom Cheesesteak', desc: 'Steak, caramelized onions, fresh mushrooms, cream, white cheese' },
    ar: { name: 'مشروم ستيك بالجبنة', desc: 'ستيك، بصل مكرمل، فطر، كريمة، جبنة بيضاء' } },

  // Burgers
  { id: 'hoagies-burger', category: 'burgers', price: 4.99,
    en: { name: 'Hoagies Burger', desc: '150g double smashed patties, cheddar cheese, hoagies sauce, lettuce, tomatoes, pickles & onions' },
    ar: { name: 'برغر هوجيز', desc: 'برغر دبل (150غ)، مع جبنة التشيدر، صوص هوغيز، خس، بندورة، مخلل، بصل' } },
  { id: 'cheese-burger', category: 'burgers', price: 4.99,
    en: { name: 'Cheese Burger', desc: '150g double smashed patties, cheddar cheese, hoagies sauce, gouda cheese & caramelized onions' },
    ar: { name: 'تشيز برغر', desc: 'برغر دبل (150غ)، مع جبنة التشيدر، صوص هوغيز، جبنة الجودا والبصل المكرمل' } },
  { id: 'mushroom-burger', category: 'burgers', price: 5.49,
    en: { name: 'Mushroom Burger', desc: '150g double smashed patties, mushrooms, gouda cheese, mozzarella cheese, hoagies sauce' },
    ar: { name: 'برغر الماشروم', desc: 'برغر دبل (150غ)، مع الفطر، جبنة الجودا، جبنة الموزاريلا وصوص هوغيز' } },

  // Salads
  { id: 'chicken-salad', category: 'salads', price: 4.99,
    en: { name: 'Chicken Salad', desc: '' }, ar: { name: 'سلطة الدجاج', desc: '' } },
  { id: 'steak-salad', category: 'salads', price: 5.49,
    en: { name: 'Steak Salad', desc: '' }, ar: { name: 'سلطة الستيك', desc: '' } },

  // Appetizers
  { id: 'chicken-strips', category: 'appetizers', price: 2.99,
    en: { name: 'Chicken Strips', desc: '' }, ar: { name: 'سترپس الدجاج', desc: '' } },
  { id: 'chicken-nuggets', category: 'appetizers', price: 2.99,
    en: { name: 'Chicken Nuggets', desc: '' }, ar: { name: 'نغتس', desc: '' } },
  { id: 'chicken-loaded-fries', category: 'appetizers', price: 4.99,
    en: { name: 'Chicken Loaded Fries', desc: '' }, ar: { name: 'لوديد فرايز مع الدجاج', desc: '' } },
  { id: 'steak-loaded-fries', category: 'appetizers', price: 5.49,
    en: { name: 'Steak Loaded Fries', desc: '' }, ar: { name: 'لوديد فرايز مع الستيك', desc: '' } },
  { id: 'mac-cheese', category: 'appetizers', price: 2.99,
    en: { name: 'Mac & Cheese', desc: '' }, ar: { name: 'ماك آند تشيز', desc: '' } },
  { id: 'crispy-chicken-mac-cheese', category: 'appetizers', price: 5.49,
    en: { name: 'Crispy Chicken Mac & Cheese', desc: 'Mac & cheese with crispy chicken' },
    ar: { name: 'ماك آند تشيز', desc: 'مع الدجاج المقرمش' } },

  // Fries
  { id: 'french-fries', category: 'fries', price: 1.49,
    en: { name: 'French Fries', desc: '' }, ar: { name: 'بطاطا مقلية', desc: '' } },
  { id: 'potato-wedges', category: 'fries', price: 1.99,
    en: { name: 'Potato Wedges', desc: '' }, ar: { name: 'بطاطا ويدجز', desc: '' } },
  { id: 'curly-fries', category: 'fries', price: 2.25,
    en: { name: 'Curly Fries', desc: '' }, ar: { name: 'بطاطا كيرلي', desc: '' } },

  // Make It a Meal
  { id: 'meal-french-fries', category: 'meals', price: 1.49,
    en: { name: 'French Fries & Drink', desc: '' }, ar: { name: 'بطاطا مقلية ومشروب', desc: '' } },
  { id: 'meal-potato-wedges', category: 'meals', price: 1.75,
    en: { name: 'Potato Wedges & Drink', desc: '' }, ar: { name: 'بطاطا ويدجز ومشروب', desc: '' } },
  { id: 'meal-curly-fries', category: 'meals', price: 1.99,
    en: { name: 'Curly Fries & Drink', desc: '' }, ar: { name: 'بطاطا كيرلي ومشروب', desc: '' } },

  // Drinks
  { id: 'joy-cola', category: 'drinks', price: 0.75,
    en: { name: 'Joy Cola', desc: '' }, ar: { name: 'جوي كولا', desc: '' } },
  { id: 'joy-cola-zero', category: 'drinks', price: 0.75,
    en: { name: 'Joy Cola Zero', desc: '' }, ar: { name: 'جوي كولا زيرو', desc: '' } },
  { id: 'joy-sprite', category: 'drinks', price: 0.75,
    en: { name: 'Joy Sprite', desc: '' }, ar: { name: 'جوي سبرايت', desc: '' } },
  { id: 'joy-sprite-diet', category: 'drinks', price: 0.75,
    en: { name: 'Joy Sprite Diet', desc: '' }, ar: { name: 'جوي سبرايت دايت', desc: '' } },
  { id: 'joy-orange', category: 'drinks', price: 0.75,
    en: { name: 'Joy Orange', desc: '' }, ar: { name: 'جوي اورانج', desc: '' } },
  { id: 'water', category: 'drinks', price: 0.50,
    en: { name: 'Water', desc: '' }, ar: { name: 'ماء', desc: '' } },
]
