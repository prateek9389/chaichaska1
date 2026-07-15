const fs = require('fs');
let content = fs.readFileSync('app/product/[id]/page.js', 'utf8');

// The file still contains the old dummy addons and teas because I reverted it via git checkout.
// 1. Remove dummy 'teas' block
const teasRegex = /const teas = \[\s*\{[\s\S]*?\n  \];/m;
content = content.replace(teasRegex, '');

// 2. Remove product find 
content = content.replace(/const product = teas\.find\(\(t\) => t\.id === productId\) \|\| teas\[0\];/, '');

// 3. Remove dummy 'addons' block
const addonsRegex = /\/\/ Addon list items\s*const addons = \[\s*\{[\s\S]*?\n  \];/m;
content = content.replace(addonsRegex, '');

// 4. Inject loadData logic and new loading/auth guards
const hooksStart = content.indexOf('  // Active Gallery Media');
const replacement = `  const [product, setProduct] = useState(null);
  const [addons, setAddons] = useState([]);
  const [crossSellTeas, setCrossSellTeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const p = await getProductById(productId);
        const a = await getAddons();
        const all = await getProducts();
        
        let finalP = p || all[0];
        if (finalP && !finalP.gallery) {
          finalP.gallery = [
            { type: "image", url: finalP.image || "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg" },
            { type: "video", url: "/sub-video.mp4" }
          ];
        }
        setProduct(finalP);
        setAddons(a);
        setCrossSellTeas(all.filter(t => Number(t.id) !== productId));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  if (loading) return <div style={{ background: "#fcfaf7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><h2>Brewing Details...</h2></div>;
  if (!product) return <div style={{ background: "#fcfaf7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><h2>Product not found</h2></div>;

`;
content = content.substring(0, hooksStart) + replacement + content.substring(hooksStart);

// 5. Update auth guards in handlePurchase
const purchaseOld = `  const handlePurchase = () => {
    setModalStep("sugar");
    setIsAddonModalOpen(true);
  };`;
const purchaseNew = `  const handlePurchase = () => {
    if (!user) {
      router.push(\`/login?redirect=/product/\${productId}\`);
      return;
    }
    setModalStep("sugar");
    setIsAddonModalOpen(true);
  };`;
content = content.replace(purchaseOld, purchaseNew);

// 6. Update Buy buttons to reflect locks
const buttonsOld = `<button onClick={handlePurchase} className="nordic-btn-add" style={{ flexGrow: 1 }}>
                ADD TO CART
              </button>
              <button onClick={handlePurchase} className="nordic-btn-buy" style={{ flexGrow: 1 }}>
                BUY NOW
              </button>`;
const buttonsNew = `<button onClick={handlePurchase} className="nordic-btn-add" style={{ flexGrow: 1 }}>
                {user ? "ADD TO CART" : "🔒 Sign In to Order"}
              </button>
              <button onClick={handlePurchase} className="nordic-btn-buy" style={{ flexGrow: 1 }}>
                {user ? "BUY NOW" : "🔒 Sign In to Buy"}
              </button>`;
content = content.replace(buttonsOld, buttonsNew);

// 7. Remove duplicate crossSellTeas
const duplicateRegex = /const crossSellTeas = teas\.filter\(\(t\) => t\.id !== productId\);/g;
content = content.replace(duplicateRegex, '');

fs.writeFileSync('app/product/[id]/page.js', content);
console.log('Restored product page data loading AND added auth guards WITHOUT duplicate variable.');
