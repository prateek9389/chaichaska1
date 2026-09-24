"use client";
import React, { useState, useEffect } from 'react';
import { getWhatsAppConfig, updateWhatsAppConfig } from '@/lib/firestore';

export default function WhatsAppSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Local WhatsApp Server state
  const [serverStatus, setServerStatus] = useState({ isReady: false, qr: null, isError: false });

  useEffect(() => {
    async function load() {
      const config = await getWhatsAppConfig();
      if (config) {
        setIsEnabled(config.isEnabled || false);
        setApiUrl(config.apiUrl || "");
        setApiKey(config.apiKey || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  // Poll local server for QR code or ready status
  useEffect(() => {
    let interval;
    const checkServerStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setServerStatus({ isReady: data.isReady, qr: data.qr, isError: false });
        } else {
          setServerStatus({ isReady: false, qr: null, isError: true });
        }
      } catch (err) {
        setServerStatus({ isReady: false, qr: null, isError: true });
      }
    };
    
    // Check immediately, then every 3 seconds
    checkServerStatus();
    interval = setInterval(checkServerStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const success = await updateWhatsAppConfig({ isEnabled, apiUrl, apiKey });
    if (success) {
      setMsg("Settings saved successfully!");
    } else {
      setMsg("Failed to save settings.");
    }
    setLoading(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleLogout = async () => {
    setLoading(true);
    setMsg("Logging out & clearing external API...");
    
    // If they had an external API, clear it so the local QR code shows up
    setApiUrl("");
    setApiKey("");
    await updateWhatsAppConfig({ isEnabled, apiUrl: "", apiKey: "" });

    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      setServerStatus({ isReady: false, qr: null, isError: false });
      setMsg("Logged out successfully. Generating new QR code...");
    } catch (err) {
      setMsg("Failed to logout.");
    }
    setLoading(false);
    setTimeout(() => setMsg(""), 3000);
  };

  if (loading && !apiUrl) return <div>Loading settings...</div>;

  return (
    <div className="tab-fade-in" style={{ padding: "30px", maxWidth: "800px", margin: "0 auto", textAlign: "left" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 20px" }}>WhatsApp API Settings</h1>
      
      {msg && (
        <div style={{ marginBottom: "20px", padding: "12px", background: msg.includes("success") ? "#d4edda" : "#f8d7da", color: msg.includes("success") ? "#155724" : "#721c24", borderRadius: "8px" }}>
          {msg}
        </div>
      )}

      <div style={{ background: "#fff", padding: "30px", borderRadius: "16px", border: "1px solid #e4e4e7", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 16px", borderBottom: "1px solid #eee", paddingBottom: "12px" }}>
          Server Device Link (QR Code)
        </h2>
        
        {serverStatus.isError ? (
          <div style={{ padding: "16px", background: "#f8d7da", color: "#721c24", borderRadius: "8px" }}>
            <strong>Local Server Not Running.</strong> Please start the WhatsApp server in your terminal by running <code>node whatsapp-server.js</code>.
          </div>
        ) : serverStatus.isReady ? (
          <div style={{ padding: "16px", background: "#d4edda", color: "#155724", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>✅</span>
              <div>
                <strong>WhatsApp is Connected!</strong><br />
                Your device is successfully linked. The system is ready to send messages.
              </div>
            </div>
            <button 
              onClick={handleLogout}
              disabled={loading}
              style={{ background: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              Logout / Disconnect
            </button>
          </div>
        ) : serverStatus.qr ? (
          <div style={{ textAlign: "center", padding: "20px", background: "#f8f9fa", borderRadius: "8px", border: "1px dashed #ccc" }}>
            <p style={{ fontWeight: "bold", marginBottom: "12px", color: "#2c1b0d" }}>Scan this QR Code from your WhatsApp App (Linked Devices)</p>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(serverStatus.qr)}`} 
              alt="WhatsApp QR Code" 
              style={{ borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <p style={{ fontSize: "13px", color: "#666", marginTop: "12px" }}>QR Code updates automatically if it expires.</p>
          </div>
        ) : (
          <div style={{ padding: "16px", background: "#fff3cd", color: "#856404", borderRadius: "8px" }}>
            Generating QR Code... Please wait.
          </div>
        )}
      </div>
    </div>
  );
}
