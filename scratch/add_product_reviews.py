import sys
import re

with open('app/product/[id]/page.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
if 'getApprovedFeedbackForProduct' not in code:
    code = code.replace(
        'import { getMenuItems, getCombos, getStock, getAddons } from "@/lib/firestore";',
        'import { getMenuItems, getCombos, getStock, getAddons, submitProductFeedback, getApprovedFeedbackForProduct } from "@/lib/firestore";'
    )
    # If the first replace failed (e.g. imports are different)
    if 'getApprovedFeedbackForProduct' not in code:
        code = code.replace(
            'from "@/lib/firestore";',
            ', submitProductFeedback, getApprovedFeedbackForProduct } from "@/lib/firestore";'
        ).replace('},', '}') # fix potential typo

# 2. State variables inside the component
state_code = """
  // Review System State
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (product) {
      getApprovedFeedbackForProduct(product.id).then(setReviews).catch(console.error);
    }
  }, [product]);

  const handleSubmitReview = async () => {
    if (!user) {
      alert("Please login to submit a review.");
      router.push("/login?redirect=/product/" + unwrappedParams.id);
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) return;
    setSubmittingReview(true);
    try {
      await submitProductFeedback({
        productId: product.id,
        productName: product.name,
        userId: user.uid,
        userName: user.email.split('@')[0],
        rating: reviewRating,
        comment: reviewComment
      });
      alert("Thank you! Your feedback has been submitted and is pending admin approval.");
      setShowReviewModal(false);
      setReviewComment("");
      setReviewRating(5);
    } catch (e) {
      alert("Error submitting review. Please try again.");
    }
    setSubmittingReview(false);
  };
"""
if 'const [reviews, setReviews]' not in code:
    code = code.replace(
        'const [selectedAddons, setSelectedAddons] = useState([]);',
        'const [selectedAddons, setSelectedAddons] = useState([]);\n' + state_code
    )

# 3. Reviews UI (Inject before <style suppressHydrationWarning>)
reviews_ui = """
      {/* Product Reviews Section */}
      {product && (
        <div style={{ marginTop: "60px", paddingTop: "40px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
            <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#2c1b0d" }}>Customer Reviews</h3>
            <button 
              onClick={() => {
                if (!user) {
                  alert("Please login to write a review.");
                  router.push("/login?redirect=/product/" + unwrappedParams.id);
                } else {
                  setShowReviewModal(true);
                }
              }}
              style={{
                background: "#2c1b0d", color: "#fff", border: "none", borderRadius: "999px",
                padding: "10px 24px", fontSize: "13px", fontWeight: 700, cursor: "pointer"
              }}
            >
              Write a Review
            </button>
          </div>

          {reviews.length === 0 ? (
            <p style={{ color: "#777", fontSize: "14px", fontStyle: "italic" }}>No approved reviews yet. Be the first to share your thoughts!</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: "#fdfdfd", border: "1px solid rgba(0,0,0,0.04)", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#2c1b0d" }}>{r.userName}</span>
                    <span style={{ color: "#f1c40f", fontSize: "14px" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: "13.5px", color: "#555", lineHeight: 1.6, margin: 0 }}>"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => !submittingReview && setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <button className="modal-close" onClick={() => !submittingReview && setShowReviewModal(false)}>×</button>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#2c1b0d", marginBottom: "8px" }}>Rate & Review</h3>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "24px" }}>Share your feedback about {product?.name}</p>

            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
              {[1,2,3,4,5].map(star => (
                <span 
                  key={star} 
                  onClick={() => setReviewRating(star)}
                  style={{ 
                    fontSize: "32px", 
                    cursor: "pointer", 
                    color: star <= reviewRating ? "#f1c40f" : "#ddd",
                    transition: "color 0.2s"
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            <textarea 
              placeholder="What did you like or dislike?"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows="4"
              style={{
                width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #eee",
                fontSize: "14px", resize: "none", marginBottom: "24px", fontFamily: "inherit", outline: "none"
              }}
            />

            <button 
              onClick={handleSubmitReview}
              disabled={submittingReview}
              style={{
                width: "100%", padding: "14px", background: "#2c1b0d", color: "#fff",
                border: "none", borderRadius: "999px", fontWeight: 700, fontSize: "14px",
                cursor: submittingReview ? "not-allowed" : "pointer", opacity: submittingReview ? 0.7 : 1
              }}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}
"""

if '{/* Product Reviews Section */}' not in code:
    code = code.replace(
        '{/* Styled JSX */}',
        reviews_ui.strip() + '\n\n      {/* Styled JSX */}'
    )

with open('app/product/[id]/page.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Product page reviews UI injected.")
