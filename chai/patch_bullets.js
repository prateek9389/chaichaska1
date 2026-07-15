const fs = require('fs');
let code = fs.readFileSync('app/product/[id]/page.js', 'utf8');

const marker1 = 'ADD TO CART\\n              </button>';
const marker2 = '<strong>Sarah M. ★★★★★</strong>';

// If the file is already patched properly or broken differently, this might fail, let's just do a clean regex replacement on the area
const startStr = `<button onClick={handlePurchase} className="nordic-btn-add" style={{ flexGrow: 1 }}>
                ADD TO CART
              </button>`;

const endStr = `                <strong>Sarah M. ★★★★★</strong>`;

const idx1 = code.indexOf(startStr);
const idx2 = code.indexOf(endStr);

if (idx1 !== -1 && idx2 !== -1) {
  const newMiddle = `
              <button onClick={handlePurchase} className="nordic-btn-buy" style={{ flexGrow: 1 }}>
                BUY NOW
              </button>
            </div>

            {/* Trust Badges */}
            <div className="nordic-trust-row">
              <div className="trust-item">🔒 Secure Payments</div>
              <div className="trust-item">🚚 Free Shipping</div>
              <div className="trust-item">🍃 100% Organic</div>
              <div className="trust-item">☕️ Handcrafted Fresh</div>
            </div>

            {/* Bullet Points */}
            {product.bullets && product.bullets.length > 0 && (
              <ul className="nordic-bullets">
                {product.bullets.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* CUSTOMER REVIEWS GRID */}
        <section className="nordic-reviews-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800 }}>HEAR FROM OUR CUSTOMERS</h2>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#8a583c" }}>★ 4.8/5.0</span>
          </div>

          <div className="reviews-tab-grid">
            <div className="review-tab-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
`;

  const patched = code.substring(0, idx1 + startStr.length) + newMiddle + code.substring(idx2);
  fs.writeFileSync('app/product/[id]/page.js', patched);
  console.log("Patched successfully");
} else {
  console.log("Markers not found!");
}
