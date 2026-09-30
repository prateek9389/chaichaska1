export const DEFAULT_PRODUCT_META = [
  {
    keywords: ["chai chaska", "chai combo", "normal chai", "masala chai", "adrak chai", "elaichi chai", "kesar chai", "tandoori chai", "cutting chai", "special chai", "tea", "chai"],
    image: "/products/chai-chaska.jpg",
    category: "Chai"
  },
  {
    keywords: ["namkeen", "bhujia", "mixture", "sev", "chivda", "roasted peanuts", "peanuts", "chips"],
    image: "/products/namkeen.webp",
    category: "Snacks"
  },
  {
    keywords: ["biscuit", "cookies", "parle", "rusk", "cookie"],
    image: "/products/biscuit.jpg",
    category: "Snacks"
  },
  {
    keywords: ["veg maggi", "maggi", "noodles", "masala maggi"],
    image: "/products/veg-maggi.jpg",
    category: "Maggi"
  },
  {
    keywords: ["butter maggi", "cheese maggi"],
    image: "/products/butter-maggi.jpg",
    category: "Maggi"
  },
  {
    keywords: ["cold coffee", "iced coffee", "frappe"],
    image: "/products/cold-coffee.jpg",
    category: "Coffee"
  },
  {
    keywords: ["hot coffee", "espresso", "cappuccino", "filter coffee", "coffee"],
    image: "/products/hot-coffee.jpg",
    category: "Coffee"
  },
  {
    keywords: ["black coffee", "americano"],
    image: "/products/black-coffee.jpg",
    category: "Coffee"
  },
  {
    keywords: ["cheese-corn sandwich", "corn cheese sandwich"],
    image: "/products/cheese-corn-sandwich.jpg",
    category: "Sandwich"
  },
  {
    keywords: ["paneer - corn sandwich", "paneer-corn sandwich", "paneer sandwich"],
    image: "/products/paneer-corn-sandwich.jpg",
    category: "Sandwich"
  },
  {
    keywords: ["veg grilled sandwich", "grilled sandwich", "sandwich", "club sandwich"],
    image: "/products/veg-grilled-sandwich.jpg",
    category: "Sandwich"
  },
  {
    keywords: ["bread toast", "toast", "bun maska", "maska bun", "bun", "garlic bread"],
    image: "/products/bread-toast.png",
    category: "Toast"
  },
  {
    keywords: ["kitkat shake", "chocolate shake"],
    image: "/products/kitkat-shake.jpg",
    category: "Drinks"
  },
  {
    keywords: ["oreo shake"],
    image: "/products/oreo-shake.png",
    category: "Drinks"
  },
  {
    keywords: ["strawberry shake", "berry shake"],
    image: "/products/strawberry-shake.jpg",
    category: "Drinks"
  },
  {
    keywords: ["black current shake", "blackcurrant", "smoothie", "shake"],
    image: "/products/black-current-shake.jpg",
    category: "Drinks"
  },
  {
    keywords: ["energy drink", "red bull", "monster", "sting"],
    image: "/products/energy-drink.jpg",
    category: "Drinks"
  },
  {
    keywords: ["soft drink", "coke", "pepsi", "sprite", "cold drink", "soda", "lemonade", "nimbu"],
    image: "/products/soft-drink.png",
    category: "Drinks"
  },
  {
    keywords: ["green tea", "kahwa", "herbal tea", "lemon tea"],
    image: "/products/green-tea.jpg",
    category: "Chai"
  },
  {
    keywords: ["500 ml water", "500ml water"],
    image: "/products/500-ml-water.png",
    category: "Water"
  },
  {
    keywords: ["1 ltr water", "1ltr water", "1 liter water"],
    image: "/products/1-ltr-water.png",
    category: "Water"
  },
  {
    keywords: ["20 ltr water", "20ltr water", "camper", "water bottle", "water", "mineral water"],
    image: "/products/20-ltr-water.png",
    category: "Water"
  },
  {
    keywords: ["samosa", "kachori", "pakora", "patty", "patties", "fries", "french fries"],
    image: "/products/namkeen.webp",
    category: "Snacks"
  }
];

export function getProductMeta(name, currentImg, currentCat) {
  const norm = (name || "").toLowerCase().trim();
  
  const isInvalidImg = !currentImg ||
    currentImg === "/logo.png" ||
    currentImg.includes("tea_icon") ||
    currentImg.includes("undefined") ||
    currentImg.includes("null");

  const isInvalidCat = !currentCat || currentCat === "Beverages" || currentCat === "Other" || currentCat === "undefined";

  for (const item of DEFAULT_PRODUCT_META) {
    if (item.keywords.some((k) => norm.includes(k))) {
      return {
        image: isInvalidImg ? item.image : currentImg,
        category: (isInvalidCat || (item.category !== "Chai" && currentCat === "Beverages")) ? item.category : currentCat
      };
    }
  }

  return {
    image: isInvalidImg ? "/products/chai-chaska.jpg" : currentImg,
    category: isInvalidCat ? "Chai" : currentCat
  };
}
