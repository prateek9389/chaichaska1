"use client";

import React from "react";
import { motion } from "framer-motion";

export default function AppDownloadCTA() {
  return (
    <section
      style={{
        padding: "100px 20px",
        minHeight: "600px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2c1b0d 0%, #1a1008 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative Circles */}
      <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(253, 245, 233, 0.05) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: "-150px", left: "-100px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255, 167, 38, 0.05) 0%, transparent 70%)" }} />

      <div style={{ maxWidth: "1200px", width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "60px", zIndex: 2 }}>
        
        {/* Left Side: Text and Download Button */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          style={{ flex: "1 1 500px", color: "#fdf5e9" }}
        >
          <h2 style={{ fontSize: "48px", fontWeight: "800", marginBottom: "24px", lineHeight: "1.1" }}>
            Get Your Chai <br /> <span style={{ color: "#ffa726" }}>On The Chai Chaska!</span>
          </h2>
          <p style={{ fontSize: "18px", lineHeight: "1.6", color: "rgba(253, 245, 233, 0.8)", marginBottom: "40px" }}>
            Experience the authentic taste of Indian Chai right at your fingertips. Download our official Chai Chaska app to order your favorite brews, manage subscriptions, and earn exclusive rewards!
          </p>
          
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <motion.a 
              href="https://drive.google.com/file/d/1QJ5mnsLvmb6Bd2G4KaStpuxSbe2Nj2qE/view?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                background: "#fdf5e9",
                color: "#2c1b0d",
                padding: "16px 32px",
                borderRadius: "50px",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "18px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download APK
            </motion.a>
          </div>
        </motion.div>

        {/* Right Side: Animated App Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          viewport={{ once: true }}
          style={{ flex: "1 1 400px", display: "flex", justifyContent: "center", position: "relative" }}
        >
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "relative", width: "300px", height: "600px", zIndex: 2 }}
          >
            {/* Phone Frame */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "#121212",
              borderRadius: "45px",
              border: "12px solid #333",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5), inset 0 0 0 2px #555",
              overflow: "hidden"
            }}>
              {/* Dynamic Island / Notch */}
              <div style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "120px",
                height: "25px",
                background: "#333",
                borderBottomLeftRadius: "16px",
                borderBottomRightRadius: "16px",
                zIndex: 10
              }} />
              
              {/* Simulated App Screen content */}
              <div style={{ width: "100%", height: "100%", background: "#fdf5e9", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
                
                {/* Header */}
                <div style={{ padding: "45px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>Good Morning, 👋</p>
                    <h3 style={{ margin: 0, fontSize: "20px", color: "#2c1b0d", fontWeight: "800" }}>Chai Lover</h3>
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#ffa726", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold" }}>
                    C
                  </div>
                </div>

                {/* Featured Cards */}
                <div style={{ padding: "0 20px 20px", display: "flex", gap: "12px" }}>
                  <div style={{ background: "#2c1b0d", borderRadius: "16px", flex: 1, padding: "16px", color: "#fdf5e9", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "relative", zIndex: 2 }}>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>Masala Chai</h4>
                      <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>Bestseller</p>
                      <div style={{ marginTop: "16px", fontWeight: "bold", color: "#ffa726" }}>₹49</div>
                    </div>
                    {/* Decorative Circle */}
                    <div style={{ position: "absolute", right: "-20px", bottom: "-20px", width: "80px", height: "80px", background: "rgba(255,167,38,0.2)", borderRadius: "50%" }}></div>
                  </div>
                  <div style={{ background: "#e5d5c5", borderRadius: "16px", flex: 1, padding: "16px", color: "#2c1b0d", position: "relative", overflow: "hidden" }}>
                     <div style={{ position: "relative", zIndex: 2 }}>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>Saffron Chai</h4>
                      <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>Premium</p>
                      <div style={{ marginTop: "16px", fontWeight: "bold" }}>₹99</div>
                    </div>
                  </div>
                </div>
                
                {/* Recent Orders List */}
                <div style={{ flex: 1, background: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px 20px", boxShadow: "0 -4px 20px rgba(0,0,0,0.05)" }}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#2c1b0d" }}>Popular Menu</h4>
                  
                  {/* List Item 1 */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "12px", background: "#fdf5e9", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", fontSize: "20px" }}>
                      ☕
                    </div>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#2c1b0d" }}>Ginger Chai</h5>
                      <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>Extra strong</p>
                    </div>
                    <div style={{ fontWeight: "bold", color: "#2c1b0d", fontSize: "14px" }}>₹59</div>
                  </div>

                  {/* List Item 2 */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "12px", background: "#fdf5e9", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", fontSize: "20px" }}>
                      🍪
                    </div>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#2c1b0d" }}>Osmania Biscuit</h5>
                      <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>Perfect pair</p>
                    </div>
                    <div style={{ fontWeight: "bold", color: "#2c1b0d", fontSize: "14px" }}>₹20</div>
                  </div>
                  
                  {/* List Item 3 */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "12px", background: "#fdf5e9", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "12px", fontSize: "20px" }}>
                      🌿
                    </div>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#2c1b0d" }}>Tulsi Green Tea</h5>
                      <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>Healthy choice</p>
                    </div>
                    <div style={{ fontWeight: "bold", color: "#2c1b0d", fontSize: "14px" }}>₹69</div>
                  </div>

                </div>
                
                {/* Bottom Nav Bar */}
                <div style={{ height: "65px", background: "#fff", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-around", alignItems: "center", paddingBottom: "10px" }}>
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#ffa726" }}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#ccc" }}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#ccc" }}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#ccc" }}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                   </div>
                </div>
              </div>
            </div>
            
            {/* Floating Tea Element */}
            <motion.div
              animate={{ y: [0, 15, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              style={{
                position: "absolute",
                bottom: "100px",
                right: "-40px",
                width: "120px",
                height: "120px",
                background: "#fdf5e9",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 15px 30px rgba(0,0,0,0.2)",
                zIndex: 3
              }}
            >
               <img src="/assets/images/tea_icon.png" alt="Chai" style={{ width: "70%", height: "70%", objectFit: "contain" }} />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
