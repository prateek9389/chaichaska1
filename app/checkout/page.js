"use client";

import { useState, useEffect, Suspense } from "react";
import { getProductById, getCoupons, createOrder, getUserAddresses, addUserAddress, updateUserCoins, addSubscription } from "@/lib/firestore";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

function CheckoutPortal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { cartItems, getCartTotal, clearCart, isLoaded: cartLoaded } = useCart();
  const [checkoutStep, setCheckoutStep] = useState("shipping");
  const [orderRef, setOrderRef] = useState("");
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    if (cartLoaded && cartItems.length === 0 && checkoutStep !== "thankyou") {
      router.push("/");
    }
  }, [cartItems, cartLoaded, checkoutStep, router]);

  useEffect(() => {
    // Load Paytm script dynamically
    const mid = process.env.NEXT_PUBLIC_PAYTM_MID;
    const isProd = process.env.NEXT_PUBLIC_PAYTM_ENVIRONMENT === "PRODUCTION";
    const paytmUrl = isProd 
      ? `https://securegw.paytm.in/merchantpgpui/checkoutjs/merchants/${mid}.js`
      : `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${mid}.js`;

    if (!document.getElementById("paytm-script") && mid && mid !== "YOUR_PAYTM_MERCHANT_ID_HERE") {
      const script = document.createElement("script");
      script.id = "paytm-script";
      script.src = paytmUrl;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);
    }
  }, []);





  const [dbCoupons, setDbCoupons] = useState([]);

  const [loading, setLoading] = useState(true);

  // Additional States
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState("Morning");
  
  const [slotMorning, setSlotMorning] = useState(false);
  const [slotEvening, setSlotEvening] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // Address Modal Fields
  const [addrLabel, setAddrLabel] = useState("");
  const [addrOfficeNum, setAddrOfficeNum] = useState("");
  const [addrOfficeName, setAddrOfficeName] = useState("");
  const [addrFloor, setAddrFloor] = useState("");
  const [addrStreet, setAddrStreet] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const c = await getCoupons();
        setDbCoupons(c);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      getUserAddresses(user.uid).then(addrs => {
         setSavedAddresses(addrs);
         if(addrs.length > 0) setSelectedAddressId(addrs[0].id);
      });
    }
  }, [user]);

  // Address Step form
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [officeNo, setOfficeNo] = useState("");
  const [floor, setFloor] = useState("");
  const [building, setBuilding] = useState("");
  const [landmark, setLandmark] = useState("");
  const [locLoading, setLocLoading] = useState(false);

  // Coupons
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0); // in Rupees
  const [appliedCodeLabel, setAppliedCodeLabel] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("upi"); // "upi" | "wallet"

  // Pre-fill from logged-in user profile
  useEffect(() => {
    if (user) {
      setFullname(profile?.name || user.displayName || "");
      setPhone(profile?.phone || "");
      setOfficeNo(profile?.floor || "");
    }
    setPaymentMethod("upi");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleUseLocation = () => {
    setLocLoading(true);
    setTimeout(() => {
      setFullname(profile?.name || user?.displayName || "Royal Tea Aficionado");
      setPhone(profile?.phone || "9876543210");
      setPincode("302001");
      setOfficeNo(profile?.floor || "4-C");
      setFloor("Floor 4");
      setBuilding("Palace Square Vista");
      setLandmark("Jaipur, Rajasthan, India");
      setLocLoading(false);
    }, 1500);
  };

  const handleApplyCoupon = (code) => {
    const coupon = dbCoupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
    if (coupon) {
      if (coupon.type === "flat") {
        setAppliedDiscount(coupon.value);
        setAppliedCodeLabel(`${coupon.code} (₹${coupon.value} Off)`);
        setCouponCode(coupon.code);
      } else if (coupon.type === "percent") {
        const sub = getCartTotal();
        const disc = Math.round(sub * (coupon.value / 100));
        setAppliedDiscount(disc);
        setAppliedCodeLabel(`${coupon.code} (${coupon.value}% Off - Save ₹${disc})`);
        setCouponCode(coupon.code);
      }
    } else {
      alert("Invalid or inactive coupon code.");
    }
  };



  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if(!addrLabel || !addrOfficeNum || !addrOfficeName || !addrFloor || !addrStreet) {
      alert("Please fill all address fields.");
      return;
    }
    if(user) {
       const newAddr = { 
         label: addrLabel, 
         officeNumber: addrOfficeNum, 
         officeName: addrOfficeName, 
         floor: addrFloor, 
         address: addrStreet 
       };
       const id = await addUserAddress(user.uid, newAddr);
       const finalAddr = { ...newAddr, id };
       setSavedAddresses(prev => [...prev, finalAddr]);
       setSelectedAddressId(id);
       setShowAddressModal(false);
       
       setAddrLabel(""); setAddrOfficeNum(""); setAddrOfficeName(""); setAddrFloor(""); setAddrStreet("");
    } else {
       alert("Please log in to save addresses.");
    }
  };

  if (loading || !cartLoaded) return <div style={{ background: "#fcfaf7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><h2>Loading Checkout...</h2></div>;
  if (cartItems.length === 0 && checkoutStep !== "thankyou") return null;

  // Cost calculations
  const cartSub = getCartTotal();
  let subtotal = cartSub;
  let finalPayable = 0;
  let deliveryCharge = 0;
  
  deliveryCharge = 0; // Removed delivery charge as per request
  finalPayable = Math.max(0, subtotal - appliedDiscount);

  const handlePlaceOrder = async () => {
    if (checkoutStep === "shipping") {
      if (!fullname || !phone || phone.length < 10) {
        alert("Please provide your full name and a valid 10-digit mobile number.");
        return;
      }
      if (savedAddresses.length === 0 && (!officeNo || !floor || !building || !landmark)) {
        alert("Please fill in all office address fields (Office No, Floor, Building, Landmark).");
        return;
      }
      if (savedAddresses.length > 0 && !selectedAddressId) {
        alert("Please select a delivery address.");
        return;
      }
      setCheckoutStep("payment");
      return;
    }

    if (checkoutStep === "payment" || checkoutStep === "upi_payment") {
      setCheckoutStep("processing");
      
      let finalAddress = `${officeNo}, ${floor}, ${building}, ${landmark}`;
      if (savedAddresses.length > 0) {
         const sel = savedAddresses.find(a => a.id === selectedAddressId);
         if(sel) finalAddress = `${sel.officeNumber}, ${sel.officeName}, Floor ${sel.floor}, ${sel.address}`;
      }


      const orderData = {
        userId: user?.uid || "guest",
        customer: fullname || profile?.name || "Guest",
        phone: phone || profile?.phone || "",
        pincode: pincode || "N/A",
        office: finalAddress,
        item: cartItems.map(i => `${i.name} x${i.quantity}`).join(" + "),
        sugar: cartItems.map(i => i.sugar).join(", ") || "Normal Sugar",
        milk: "Whole Milk",
        img: cartItems[0]?.image || "/chai-ingredients.png",
        priority: "Normal",
        total: `₹${finalPayable}`,

        coupon: couponCode || "None",
        deliveryTime: deliveryTime,
        paymentMethod: paymentMethod || "upi"
      };
      
      try {

          if (paymentMethod === "upi") {
            try {
              // Create pending order first to get the unique Order ID
              const pendingOrderId = await createOrder({ ...orderData, status: "Pending" });
              
              const res = await fetch("/api/paytm/initiate-transaction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: finalPayable,
                  customerId: user?.uid || `guest_${Date.now()}`,
                  customerPhone: phone || profile?.phone || "9999999999",
                  customerEmail: profile?.email || "customer@example.com",
                  orderId: pendingOrderId
                })
              });
              const data = await res.json();
              
              if (data.txnToken) {
                 if (window.Paytm && window.Paytm.CheckoutJS) {
                    window.Paytm.CheckoutJS.init({
                        "root": "",
                        "flow": "DEFAULT",
                        "data": {
                            "orderId": data.orderId,
                            "token": data.txnToken,
                            "tokenType": "TXN_TOKEN",
                            "amount": finalPayable
                        },
                        "handler": {
                            "notifyMerchant": function(eventName, data) {
                                console.log("notifyMerchant called", eventName, data);
                            }
                        }
                    }).then(function() {
                        window.Paytm.CheckoutJS.invoke();
                    }).catch(function(error) {
                        console.error("Paytm init error", error);
                        alert("Payment window failed to load.");
                        setCheckoutStep("payment");
                    });
                 } else {
                    alert("Paytm SDK is still loading or blocked. Please refresh.");
                    setCheckoutStep("payment");
                 }
              } else {
                 alert("Failed to initialize payment: " + (data.error || "Unknown Error"));
                 setCheckoutStep("payment");
              }
            } catch(err) {
              console.error(err);
              alert("Payment initialization failed");
              setCheckoutStep("payment");
            }
            return;
          }

        const id = await createOrder(orderData);
        

        setOrderRef(id);
        setReceiptData({
          cartItems: [...cartItems],
          finalPayable,
          paymentMethod
        });
        clearCart();
        setCheckoutStep("thankyou");
      } catch (err) {
        console.error(err);
        alert("Order placement failed.");
        setCheckoutStep("payment");
      }
    }
  };

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", overflowX: "hidden" }}>
      <Navbar />

      <div className="checkout-page-container">
        
        {checkoutStep !== "thankyou" && (
          <section className="checkout-title-row">
            <h1>Secure Checkout</h1>
            <p>Review details, add delivery instructions, and claim exclusive loyalty discounts.</p>
          </section>
        )}

        {checkoutStep !== "thankyou" ? (
          <div className="checkout-grid-layout">
            
            {/* LEFT COLUMN: INTERACTIVE CHECKOUT FORM */}
            <div className="checkout-left-column">
              
              {/* STEP NAVIGATION STATUS BAR */}
              <div className="steps-status-bar">
                <div className={`step-indicator ${checkoutStep === "shipping" ? "active" : "completed"}`}>
                  <span className="step-num">1</span>
                  <span>Office Address</span>
                </div>
                <div className={`step-connector ${checkoutStep === "payment" ? "completed" : ""}`} />
                <div className={`step-indicator ${checkoutStep === "payment" ? "active" : ""}`}>
                  <span className="step-num">2</span>
                  <span>Payment Method</span>
                </div>
              </div>

              {/* STEP 1: SHIPPING ADDRESS */}
              {checkoutStep === "shipping" && (
                <div className="checkout-card">
                  <div style={{ marginBottom: "20px" }}>
                    <h3 className="card-title">Office Destination</h3>
                  </div>

                  <div className="address-inputs-grid" style={{ marginBottom: "16px" }}>
                    <div className="form-group">
                      <label>Receiver Full Name</label>
                      <input type="text" placeholder="John Doe" value={fullname} onChange={(e) => setFullname(e.target.value)} className="checkout-text-input" />
                    </div>
                    <div className="form-group">
                      <label>Contact Phone Number</label>
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "12px", background: "#f5f5f7", overflow: "hidden" }}>
                        <span style={{ padding: "0 14px", fontWeight: "600", color: "#555", borderRight: "1px solid rgba(0,0,0,0.1)" }}>+91</span>
                        <input type="tel" maxLength={10} placeholder="XXXXX XXXXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="checkout-text-input" style={{ border: "none", borderRadius: 0, flexGrow: 1, background: "transparent", outline: "none", margin: 0 }} />
                      </div>
                    </div>
                    {(!user || savedAddresses.length === 0) && (
                      <div className="address-inputs-grid full-width" style={{ gridColumn: "1 / -1", marginTop: "16px" }}>
                        <div className="form-group">
                          <label>Office No</label>
                          <input type="text" placeholder="e.g. 402" value={officeNo} onChange={(e) => setOfficeNo(e.target.value)} className="checkout-text-input" />
                        </div>
                        <div className="form-group">
                          <label>Floor</label>
                          <input type="text" placeholder="e.g. 4th Floor" value={floor} onChange={(e) => setFloor(e.target.value)} className="checkout-text-input" />
                        </div>
                        <div className="form-group">
                          <label>Building</label>
                          <input type="text" placeholder="e.g. Infinity Tower" value={building} onChange={(e) => setBuilding(e.target.value)} className="checkout-text-input" />
                        </div>
                        <div className="form-group">
                          <label>Landmark</label>
                          <input type="text" placeholder="e.g. Near Metro Station" value={landmark} onChange={(e) => setLandmark(e.target.value)} className="checkout-text-input" />
                        </div>
                      </div>
                    )}
                  </div>

                  {user && savedAddresses.length > 0 && (
                    <div className="saved-addresses-grid" style={{ marginBottom: "20px" }}>
                      <h4 style={{ fontSize: "14px", marginBottom: "12px", color: "#555" }}>Select Office Address</h4>
                      <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "10px" }}>
                        {savedAddresses.map(addr => (
                          <div 
                            key={addr.id} 
                            onClick={() => setSelectedAddressId(addr.id)}
                            style={{ 
                              minWidth: "220px", 
                              border: selectedAddressId === addr.id ? "2px solid #8a583c" : "1.5px solid #eee",
                              background: selectedAddressId === addr.id ? "rgba(138, 88, 60, 0.05)" : "#fff",
                              padding: "12px", borderRadius: "12px", cursor: "pointer", flexShrink: 0 
                            }}
                          >
                            <strong>{addr.label}</strong>
                            <p style={{ fontSize: "12px", color: "#666", marginTop: "4px", lineHeight: "1.4" }}>
                              {addr.officeNumber}, {addr.officeName}<br/>
                              {addr.address}
                            </p>
                          </div>
                        ))}
                        <div 
                          onClick={() => setShowAddressModal(true)}
                          style={{ minWidth: "150px", border: "1.5px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", cursor: "pointer", flexShrink: 0, padding: "12px", color: "#8a583c", fontWeight: 700 }}
                        >
                          + Add New
                        </div>
                      </div>
                    </div>
                  )}

                  {user && savedAddresses.length === 0 && (
                    <div style={{ marginBottom: "20px" }}>
                       <button onClick={() => setShowAddressModal(true)} style={{ background: "#8a583c", color: "#fff", padding: "10px 20px", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
                         + Save an Address (Optional)
                       </button>
                    </div>
                  )}


                  <button onClick={handlePlaceOrder} className="btn-continue-checkout">
                    Proceed to Payment Options
                  </button>
                </div>
              )}

              {/* STEP 2: PAYMENT METHOD */}
              {checkoutStep === "payment" && (
                <div className="checkout-card">
                  {/* Subscription UI removed */}

                  <h3 className="card-title" style={{ marginBottom: "20px" }}>Choose Payment Method</h3>
                  
                  <div className="payment-options-grid">
                    <label className={`pay-choice-box ${paymentMethod === "upi" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="pay"
                        value="upi"
                        checked={paymentMethod === "upi"}
                        onChange={() => setPaymentMethod("upi")}
                      />
                      <div>
                        <strong>UPI Instant Pay</strong>
                        <span className="pay-desc">Pay securely via GPay, PhonePe, Paytm, etc.</span>
                      </div>
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button onClick={() => setCheckoutStep("shipping")} className="btn-continue-checkout back-btn">
                      Back
                    </button>
                    <button onClick={handlePlaceOrder} className="btn-continue-checkout">
                      Pay & Confirm Order (₹{finalPayable})
                    </button>
                  </div>
                </div>
              )}



              {/* STEP 3: PROCESSING SCREEN */}
              {checkoutStep === "processing" && (
                <div className="checkout-card loader-card" style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div className="checkout-spinner" />
                  <h3 style={{ fontSize: "20px", fontWeight: 900, marginTop: "24px" }}>Configuring Spice Distillation...</h3>
                  <p style={{ color: "#666", fontSize: "13.5px", marginTop: "8px" }}>
                    Validating secure checkout nodes and forwarding order mapping coordinates to the brewery terminal.
                  </p>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: VIDEO, ADD-ONS & SUMMARY */}
            <div className="checkout-right-column">
              
              {/* VIDEO MINI CARD */}
              <div className="checkout-video-card">
                <video
                  src="/sub-video.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="checkout-video-loop"
                />
                <div className="checkout-video-overlay" />
                <div className="checkout-video-text">
                  <h4>Freshly Distilled Spices</h4>
                  <p>Hand-pounded cardamom and ginger, brewed to order.</p>
                </div>
              </div>





              {/* PRICING BREAKDOWN CARD */}
              <div className="checkout-card pricing-breakdown">
                <h4 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "14px" }}>Order Cost Summary</h4>
                
                <div className="breakdown-list">
                  {cartItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: "8px" }}>
                      <div className="breakdown-row" style={{ paddingBottom: "0" }}>
                        <span>{item.name} (x{item.quantity})</span>
                        <span>{item.basePrice ? `₹${item.basePrice * item.quantity}` : `₹${parseInt(String(item.price).replace(/[^0-9]/g, "")) * item.quantity}`}</span>
                      </div>
                    </div>
                  ))}

                  {appliedDiscount > 0 && (
                    <div className="breakdown-row discount">
                      <span>Promo Coupon Discount</span>
                      <span>- ₹{appliedDiscount}</span>
                    </div>
                  )}

                  <div className="breakdown-row">
                    <span>Delivery Charge</span>
                    <span>FREE</span>
                  </div>

                  <div className="breakdown-row total">
                    <span>Amount Payable</span>
                    <span>₹{finalPayable}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* STEP 4: THANK YOU ORDER SUCCESS PAGE */
          <div className="thank-you-layout">
            <div className="thank-you-card">
              <div className="success-badge-circle">✓</div>
              <h2 className="success-title">Order Placed successfully!</h2>
              <p className="success-message">
                Your order is confirmed and heading to the brewing counter. We've dispatched reference details to your registered number.
              </p>

              <div className="receipt-box">
                <div className="receipt-row">
                  <span>Order Reference ID:</span>
                  <strong>{orderRef}</strong>
                </div>
                <div className="receipt-row">
                  <span>Items:</span>
                  <strong>
                    {receiptData?.cartItems?.map((item, idx) => (
                      <div key={idx} style={{ marginBottom: "4px" }}>
                        <div>{item.quantity}x {item.name}</div>
                      </div>
                    ))}
                  </strong>
                </div>
                <div className="receipt-row" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed rgba(0,0,0,0.08)" }}>
                  <span>Payment Method:</span>
                  <strong style={{ color: "#8a583c" }}>{receiptData?.paymentMethod === 'upi' ? 'Online Payment' : 'Cash'}</strong>
                </div>
                <div className="receipt-row">
                  <span>Total Paid Amount:</span>
                  <strong style={{ color: "#27ae60", fontSize: "16px" }}>₹{receiptData?.finalPayable}</strong>
                </div>
                <div className="receipt-row">
                  <span>Estimated Delivery Time:</span>
                  <strong>15-20 Minutes 🚀</strong>
                </div>
                <div className="receipt-row" style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                  <span>Office Address:</span>
                  <span style={{ fontSize: "12px", textAlign: "right", maxWidth: "220px", color: "#555" }}>
                    {savedAddresses.find(a => a.id === selectedAddressId) ? `${savedAddresses.find(a => a.id === selectedAddressId).officeNumber}, ${savedAddresses.find(a => a.id === selectedAddressId).officeName}, Floor ${savedAddresses.find(a => a.id === selectedAddressId).floor}, ${savedAddresses.find(a => a.id === selectedAddressId).address}` : address}
                  </span>
                </div>
              </div>

              {/* Mock Delivery Map Tracker visual */}
              <div className="mock-tracker-visual">
                <div className="tracker-line">
                  <div className="tracker-progress" />
                  <span className="dot start">🏠</span>
                  <span className="dot destination">📍</span>
                </div>
                <div className="tracker-labels">
                  <span>Brewmaster</span>
                  <span>You</span>
                </div>
              </div>

              <Link href="/" className="btn-continue-checkout" style={{ maxWidth: "260px", margin: "0 auto", display: "block", textDecoration: "none", textAlign: "center" }}>
                Return to Home
              </Link>
            </div>
          </div>
        )}

      </div>

      {showAddressModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", width: "90%", maxWidth: "400px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px", color: "#2c1b0d" }}>Add Office Address</h3>
            <form onSubmit={handleSaveAddress} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input type="text" placeholder="Label (e.g. Gurugram Office)" value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} className="checkout-text-input" required />
              <input type="text" placeholder="Office / Room Number" value={addrOfficeNum} onChange={(e) => setAddrOfficeNum(e.target.value)} className="checkout-text-input" required />
              <input type="text" placeholder="Office / Company Name" value={addrOfficeName} onChange={(e) => setAddrOfficeName(e.target.value)} className="checkout-text-input" required />
              <input type="text" placeholder="Floor Level" value={addrFloor} onChange={(e) => setAddrFloor(e.target.value)} className="checkout-text-input" required />
              <input type="text" placeholder="Street Address" value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} className="checkout-text-input" required />
              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button type="button" onClick={() => setShowAddressModal(false)} style={{ flex: 1, padding: "12px", border: "1px solid #ccc", borderRadius: "8px", background: "#fff", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "#2c1b0d", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}



      <Footer />

      {/* Styled JSX */}
      <style>{`
        .checkout-page-container {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 120px 24px 60px;
          box-sizing: border-box;
        }

        .checkout-title-row {
          margin-bottom: 30px;
        }

        .checkout-title-row h1 {
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 900;
          color: #2c1b0d;
          margin-bottom: 8px;
        }

        .checkout-title-row p {
          font-size: 14.5px;
          color: #666;
        }

        /* 2-Column layout */
        .checkout-grid-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 30px;
          align-items: start;
        }

        .checkout-left-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-width: 0;
        }

        .checkout-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 30px;
          border: 1px solid rgba(0,0,0,0.04);
          box-shadow: 0 4px 30px rgba(0,0,0,0.01);
          min-width: 0;
          box-sizing: border-box;
          width: 100%;
        }

        .checkout-card.compact {
          padding: 20px;
        }

        .card-title {
          font-size: 18px;
          font-weight: 850;
          color: #2c1b0d;
        }

        /* Address inputs form */
        .address-inputs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 12.5px;
          font-weight: 700;
          color: #555;
        }

        .checkout-text-input {
          border: 1.5px solid rgba(44, 27, 13, 0.1);
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 13.5px;
          background: #fbf9f6;
          color: #2c1b0d;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }

        .checkout-text-input.area {
          resize: none;
        }

        .checkout-text-input:focus {
          border-color: #2c1b0d;
        }

        .btn-use-location {
          background: rgba(138, 88, 60, 0.08);
          border: 1px solid rgba(138, 88, 60, 0.2);
          color: #8a583c;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-use-location:hover {
          background: rgba(138, 88, 60, 0.15);
        }

        .btn-continue-checkout {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 14px 24px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-continue-checkout:hover {
          background: #111;
        }

        .btn-continue-checkout.back-btn {
          background: #fbf9f6;
          border: 1.5px solid rgba(0,0,0,0.1);
          color: #2c1b0d;
        }

        /* Step navigation status bar */
        .steps-status-bar {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          gap: 12px;
          background: #ffffff;
          padding: 16px 24px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.03);
          box-sizing: border-box;
          width: 100%;
          overflow: hidden;
        }

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: #888;
        }

        .step-indicator.active {
          color: #2c1b0d;
        }

        .step-indicator.completed {
          color: #27ae60;
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ddd;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .step-indicator.active .step-num {
          background: #2c1b0d;
        }

        .step-indicator.completed .step-num {
          background: #27ae60;
        }

        .step-connector {
          flex-grow: 1;
          height: 2px;
          background: #eee;
        }

        .step-connector.completed {
          background: #27ae60;
        }

        /* Payment choices */
        .payment-options-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pay-choice-box {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #fbf9f6;
          border: 1.5px solid rgba(0,0,0,0.05);
          padding: 14px 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pay-choice-box.selected {
          border-color: #8a583c;
          background: rgba(138, 88, 60, 0.02);
        }

        .pay-choice-box strong {
          display: block;
          font-size: 13.5px;
        }

        .pay-desc {
          font-size: 11px;
          color: #777;
          display: block;
          margin-top: 2px;
        }

        /* Right column details */
        .checkout-right-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-width: 0;
        }

        .checkout-video-card {
          position: relative;
          aspect-ratio: 1.8 / 1;
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }

        .checkout-video-loop {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0.85;
        }

        .checkout-video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);
          z-index: 1;
        }

        .checkout-video-text {
          position: absolute;
          bottom: 16px;
          left: 20px;
          right: 20px;
          z-index: 2;
          color: #ffffff;
        }

        .checkout-video-text h4 {
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .checkout-video-text p {
          font-size: 11.5px;
          color: rgba(255,255,255,0.85);
          line-height: 1.4;
        }

        /* Add-ons List */
        .checkout-addons-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .checkout-addon-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fbf9f6;
          border: 1.5px solid rgba(0,0,0,0.05);
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .checkout-addon-pill.selected {
          border-color: #8a583c;
          background: rgba(138, 88, 60, 0.02);
        }

        .check-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid #bbb;
        }

        .checkout-addon-pill.selected .check-dot {
          border-color: #8a583c;
          background: #8a583c;
        }

        /* Coupons styling */
        .coupon-text-field {
          flex-grow: 1;
          border: 1.5px solid rgba(44, 27, 13, 0.1);
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 12.5px;
          background: #fbf9f6;
          outline: none;
        }

        .coupon-text-field:focus {
          border-color: #2c1b0d;
        }

        .btn-coupon-apply {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .coupon-pills-row {
          display: flex;
          gap: 8px;
        }

        .coupon-pill {
          background: #fbf9f6;
          border: 1px dashed rgba(44,27,13,0.2);
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 11.5px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .coupon-pill:hover {
          background: rgba(138,88,60,0.05);
        }

        .success-coupon-label {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          border-radius: 6px;
          padding: 8px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 10px;
        }

        /* Pricing breakdown list */
        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .breakdown-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
        }

        .breakdown-row.discount {
          color: #27ae60;
          font-weight: 600;
        }

        .breakdown-row.total {
          font-size: 16px;
          font-weight: 900;
          color: #2c1b0d;
          border-top: 1px dashed rgba(0,0,0,0.08);
          padding-top: 12px;
          margin-top: 6px;
        }

        /* Loading spinner */
        .checkout-spinner {
          border: 4px solid rgba(44, 27, 13, 0.1);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border-left-color: #2c1b0d;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Thank you layout styles */
        .thank-you-layout {
          max-width: 600px;
          margin: 0 auto;
        }

        .thank-you-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 40px;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 10px 40px rgba(0,0,0,0.03);
          text-align: center;
        }

        .success-badge-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
          margin: 0 auto 20px;
        }

        .success-title {
          font-size: 24px;
          font-weight: 900;
          color: #2c1b0d;
          margin-bottom: 8px;
        }

        .success-message {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 30px;
        }

        .receipt-box {
          background: #fbf9f6;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 30px;
          text-align: left;
        }

        .receipt-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          margin-bottom: 10px;
        }

        .receipt-row:last-child {
          margin-bottom: 0;
        }

        /* Mock Map Delivery Progress Tracker */
        .mock-tracker-visual {
          border: 1.5px solid rgba(0,0,0,0.05);
          border-radius: 16px;
          padding: 20px 16px;
          margin-bottom: 30px;
          background: #ffffff;
        }

        .tracker-line {
          position: relative;
          height: 4px;
          background: #eee;
          margin: 20px 10px;
        }

        .tracker-progress {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 50%;
          background: #8a583c;
        }

        .dot {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
        }

        .dot.start { left: 0; }
        .dot.current { left: 50%; }
        .dot.destination { left: 100%; }

        .tracker-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: #888;
        }

        @media (max-width: 990px) {
          .checkout-grid-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .checkout-page-container {
            padding: 100px 16px 40px;
          }
          .checkout-card {
            padding: 20px;
          }
          .steps-status-bar {
            padding: 12px 16px;
            gap: 8px;
          }
          .step-indicator {
            font-size: 12px;
          }
          .step-indicator span:last-child {
            display: none;
          }
          .checkout-title-row h1 {
            font-size: 24px;
          }
        }

        @media (max-width: 550px) {
          .address-inputs-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: "100px", textAlign: "center" }}>Loading Checkout Details...</div>}>
      <CheckoutPortal />
    </Suspense>
  );
}
