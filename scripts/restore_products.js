const { v2: cloudinary } = require("cloudinary");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc } = require("firebase/firestore");
const path = require("path");
const fs = require("fs");

const envPath = path.resolve(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return;
  process.env[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
});

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function restoreProducts() {
  console.log("Fetching images from Cloudinary...");
  try {
    const result = await cloudinary.search
      .expression('resource_type:image')
      .sort_by('created_at', 'desc')
      .max_results(50)
      .execute();
      
    const images = result.resources;
    if (!images || images.length === 0) {
      console.log("No images found on Cloudinary.");
      return;
    }
    
    console.log(`Found ${images.length} images. Restoring products...`);
    
    for (const img of images) {
      // Create a basic product out of the cloudinary image
      const productName = img.public_id.split('/').pop().replace(/[_-]/g, ' ');
      
      const product = {
        name: productName.charAt(0).toUpperCase() + productName.slice(1),
        desc: "Restored product description.",
        price: "₹149",
        priceNum: 149,
        category: "Chai", // Default category
        image: img.secure_url,
        active: true,
        isRestored: true,
        createdAt: img.created_at,
        unit: "Kulhad",
        minQty: 1,
        maxQty: 12
      };
      
      const docRef = await addDoc(collection(db, "products"), product);
      console.log(`Restored product: ${product.name} with ID: ${docRef.id}`);
    }
    
    console.log("Restore complete!");
  } catch (error) {
    console.error("Error restoring products:", error);
  }
  process.exit(0);
}

restoreProducts();
