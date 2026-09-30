export const DEFAULT_PRODUCT_META = [
  {
    keywords: ["chai chaska", "normal chai", "masala chai", "adrak chai", "elaichi chai", "kesar chai", "tandoori chai", "cutting chai", "chai combo", "special chai", "tea", "chai"],
    image: "/logo.png",
    category: "Chai"
  },
  {
    keywords: ["namkeen", "bhujia", "mixture", "sev", "chivda", "roasted peanuts", "peanuts", "chips"],
    image: "/logo.png",
    category: "Snacks"
  },
  {
    keywords: ["biscuit", "cookies", "parle", "rusk", "cookie"],
    image: "/logo.png",
    category: "Snacks"
  },
  {
    keywords: ["veg maggi", "butter maggi", "cheese maggi", "maggi", "noodles", "masala maggi"],
    image: "/logo.png",
    category: "Maggi"
  },
  {
    keywords: ["cold coffee", "iced coffee", "frappe"],
    image: "/logo.png",
    category: "Coffee"
  },
  {
    keywords: ["hot coffee", "black coffee", "espresso", "cappuccino", "filter coffee", "coffee"],
    image: "/logo.png",
    category: "Coffee"
  },
  {
    keywords: ["cheese-corn sandwich", "paneer - corn sandwich", "paneer-corn sandwich", "veg grilled sandwich", "sandwich", "club sandwich", "grilled sandwich"],
    image: "/logo.png",
    category: "Sandwich"
  },
  {
    keywords: ["bread toast", "toast", "bun maska", "maska bun", "bun", "garlic bread"],
    image: "/logo.png",
    category: "Toast"
  },
  {
    keywords: ["kitkat shake", "oreo shake", "chocolate shake", "shake"],
    image: "/logo.png",
    category: "Drinks"
  },
  {
    keywords: ["strawberry shake", "black current shake", "berry shake", "smoothie"],
    image: "/logo.png",
    category: "Drinks"
  },
  {
    keywords: ["energy drink", "soft drink", "coke", "pepsi", "sprite", "cold drink", "soda", "lemonade", "nimbu"],
    image: "/logo.png",
    category: "Drinks"
  },
  {
    keywords: ["green tea", "kahwa", "herbal tea", "lemon tea"],
    image: "/logo.png",
    category: "Chai"
  },
  {
    keywords: ["water", "1 ltr water", "20 ltr water", "500 ml water", "mineral water"],
    image: "/logo.png",
    category: "Water"
  },
  {
    keywords: ["samosa", "kachori", "pakora", "patty", "patties", "fries", "french fries"],
    image: "/logo.png",
    category: "Snacks"
  }
];

export function getProductMeta(name, currentImg, currentCat) {
  const norm = (name || "").toLowerCase().trim();
  
  const isInvalidImg = !currentImg ||
    currentImg === "/logo.png" ||
    currentImg.includes("tea_icon") ||
    currentImg.includes("ezzolluycd01piettblm") ||
    currentImg.includes("cmzhutu452ld8798gbln") ||
    currentImg.includes("br6kkfrjvoopkqkzpanm") ||
    currentImg.includes("p7f5conzmiziw1trmlsw") ||
    currentImg.includes("obzeioklky9xtmsrupw2");

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
    image: isInvalidImg ? "/logo.png" : currentImg,
    category: isInvalidCat ? "Chai" : currentCat
  };
}
