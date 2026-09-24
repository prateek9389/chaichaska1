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
        const res = await fetch('http://localhost:3001/status');
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
          <div style={{ padding: "16px", background: "#d4edda", color: "#155724", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>✅</span>
            <div>
              <strong>WhatsApp is Connected!</strong><br />
              Your device is successfully linked. The system is ready to send messages.
            </div>
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

      <div style={{ background: "#fff", padding: "30px", borderRadius: "16px", border: "1px solid #e4e4e7" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 16px", borderBottom: "1px solid #eee", paddingBottom: "12px" }}>
          API Configuration
        </h2>

        <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <input 
            type="checkbox" 
            id="wa-enable" 
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            style={{ width: "18px", height: "18px" }}
          />
          <label htmlFor="wa-enable" style={{ fontSize: "15px", fontWeight: "bold", color: "#2c1b0d", cursor: "pointer" }}>
            Enable WhatsApp Integration (Order confirmations & Status updates)
          </label>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#2c1b0d" }}>API URL</label>
          <input 
            type="text" 
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:3001/send-message (Default for local server)" 
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }} 
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#2c1b0d" }}>API Key (Optional for local server)</label>
          <input 
            type="text" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Not required if using local Node server" 
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }} 
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          style={{ background: "#25D366", color: "#fff", padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer", fontSize: "15px", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>

      </div>
    </div>
  );
}
