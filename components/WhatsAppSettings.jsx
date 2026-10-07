"use client";
import React, { useState, useEffect } from 'react';
import { getWhatsAppConfig, updateWhatsAppConfig } from '@/lib/firestore';
import { DEFAULT_WHATSAPP_CONFIG, sanitizeApiKey } from '@/lib/whatsapp';

export default function WhatsAppSettings() {
  // Config state
  const [baseUrl, setBaseUrl] = useState(DEFAULT_WHATSAPP_CONFIG.baseUrl);
  const [instance, setInstance] = useState(DEFAULT_WHATSAPP_CONFIG.instance);
  const [apiKey, setApiKey] = useState(DEFAULT_WHATSAPP_CONFIG.apiKey);
  const [senderNumber, setSenderNumber] = useState(DEFAULT_WHATSAPP_CONFIG.senderNumber);
  const [isEnabled, setIsEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Simple Tab: 'sender' (Quick Message & Media Sender) | 'settings' (Account & API Settings)
  const [activeTab, setActiveTab] = useState('sender');

  // Server health state
  const [serverStatus, setServerStatus] = useState({
    isReady: false,
    state: 'checking',
    lastChecked: null
  });
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Simplified Sender Form
  const [recipientNumber, setRecipientNumber] = useState('');
  const [messageText, setMessageText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // { name, type, dataUrl, mediaType }
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Send State
  const [sending, setSending] = useState(false);
  const [lastSentStatus, setLastSentStatus] = useState(null);

  // Load saved config
  useEffect(() => {
    async function load() {
      try {
        const config = await getWhatsAppConfig();
        if (config) {
          setIsEnabled(config.isEnabled !== false);
          setBaseUrl(config.baseUrl || DEFAULT_WHATSAPP_CONFIG.baseUrl);
          setInstance(config.instance || DEFAULT_WHATSAPP_CONFIG.instance);
          setApiKey(config.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey);
          setSenderNumber(config.senderNumber || DEFAULT_WHATSAPP_CONFIG.senderNumber);
        }
      } catch (err) {
        console.error('Error loading config:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Quick Health Check
  const checkHealth = async () => {
    setCheckingStatus(true);
    try {
      const cleanKey = sanitizeApiKey(apiKey);
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkStatus',
          baseUrl,
          instance,
          apiKey: cleanKey
        })
      });
      const data = await res.json();
      const stateVal = data?.data?.instance?.state || data?.state || (res.ok ? 'open' : 'disconnected');
      const isReady = stateVal === 'open' || stateVal === 'connected';

      setServerStatus({
        isReady,
        state: stateVal,
        lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) {
      setServerStatus({
        isReady: false,
        state: 'error',
        lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      checkHealth();
    }
  }, [loading]);

  // Save Settings
  const handleSave = async () => {
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const cleanKey = sanitizeApiKey(apiKey);
      const targetApiUrl = `${baseUrl.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(instance)}`;
      const payload = {
        isEnabled,
        mode: 'evolution',
        baseUrl: baseUrl.trim(),
        instance: instance.trim(),
        apiKey: cleanKey,
        senderNumber: senderNumber.trim(),
        apiUrl: targetApiUrl
      };

      const success = await updateWhatsAppConfig(payload);
      if (success) {
        setApiKey(cleanKey);
        setMsg({ type: 'success', text: '✅ WhatsApp settings updated successfully!' });
        checkHealth();
      } else {
        setMsg({ type: 'error', text: '❌ Failed to save WhatsApp settings.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: `❌ Error: ${err.message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
    }
  };

  // Restore Defaults
  const handleRestoreDefaults = () => {
    setBaseUrl(DEFAULT_WHATSAPP_CONFIG.baseUrl);
    setInstance(DEFAULT_WHATSAPP_CONFIG.instance);
    setApiKey(DEFAULT_WHATSAPP_CONFIG.apiKey);
    setSenderNumber(DEFAULT_WHATSAPP_CONFIG.senderNumber);
    setIsEnabled(true);
    setMsg({ type: 'info', text: '🔄 Reset to default working server credentials.' });
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  // Handle local file picking (PDF, Image, Video)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result;
      if (typeof dataUri === 'string') {
        let mediaType = 'document';
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type.startsWith('audio/')) mediaType = 'audio';

        setAttachedFile({
          name: file.name,
          type: file.type || 'application/pdf',
          mediaType,
          dataUrl: dataUri,
          sizeKb: Math.round(file.size / 1024)
        });
        setMediaUrlInput('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick Preset Attachments
  const pickSampleFile = (type) => {
    if (type === 'pdf') {
      setAttachedFile({
        name: 'ChaiChaska_GST_Tax_Invoice.pdf',
        type: 'application/pdf',
        mediaType: 'document',
        dataUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        sizeKb: 13
      });
      if (!messageText) setMessageText('Here is your GST Tax Invoice for your Chai Chaska order. 📄');
    } else if (type === 'image') {
      setAttachedFile({
        name: 'Chai_Order_Receipt.jpg',
        type: 'image/jpeg',
        mediaType: 'image',
        dataUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop',
        sizeKb: 85
      });
      if (!messageText) setMessageText('Your hot chai order is being prepared with love! ☕');
    }
  };

  // Send WhatsApp Message / Media
  const handleSendMessage = async () => {
    if (!recipientNumber.trim()) {
      setMsg({ type: 'error', text: '⚠️ Please enter a recipient phone number.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3500);
      return;
    }

    if (!messageText.trim() && !attachedFile && !mediaUrlInput.trim()) {
      setMsg({ type: 'error', text: '⚠️ Please write a message or attach a file to send.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3500);
      return;
    }

    setSending(true);
    setLastSentStatus(null);
    setMsg({ type: '', text: '' });

    try {
      const cleanKey = sanitizeApiKey(apiKey);
      let payload = {
        baseUrl,
        instance,
        apiKey: cleanKey,
        number: recipientNumber
      };

      // Determine if sending media or pure text
      const mediaSource = attachedFile ? attachedFile.dataUrl : (mediaUrlInput.trim() || null);

      if (mediaSource) {
        let mediaType = attachedFile ? attachedFile.mediaType : 'image';
        let fileName = attachedFile ? attachedFile.name : 'attachment.jpg';
        let mimeType = attachedFile ? attachedFile.type : (mediaType === 'document' ? 'application/pdf' : 'image/jpeg');

        if (!attachedFile && mediaUrlInput) {
          if (mediaUrlInput.toLowerCase().endsWith('.pdf')) {
            mediaType = 'document';
            fileName = 'document.pdf';
            mimeType = 'application/pdf';
          } else if (mediaUrlInput.toLowerCase().endsWith('.mp4')) {
            mediaType = 'video';
            fileName = 'video.mp4';
            mimeType = 'video/mp4';
          }
        }

        payload = {
          ...payload,
          action: 'sendMedia',
          mediaUrl: mediaSource,
          mediaType,
          fileName,
          mimeType,
          caption: messageText.trim()
        };
      } else {
        payload = {
          ...payload,
          action: 'sendText',
          text: messageText.trim()
        };
      }

      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setLastSentStatus({
          success: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          to: recipientNumber,
          hasMedia: !!mediaSource
        });
        setMsg({ type: 'success', text: `🎉 Message sent successfully to ${recipientNumber}!` });
        // Reset attached file
        setAttachedFile(null);
        setMediaUrlInput('');
      } else {
        setLastSentStatus({
          success: false,
          error: data.data?.response?.message || data.error || 'Failed to deliver message'
        });
        setMsg({ type: 'error', text: `❌ Could not send: ${data.data?.response?.message || data.error || 'Check server status'}` });
      }
    } catch (err) {
      setLastSentStatus({ success: false, error: err.message });
      setMsg({ type: 'error', text: `❌ Error: ${err.message}` });
    } finally {
      setSending(false);
      setTimeout(() => setMsg({ type: '', text: '' }), 5000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "50px", textAlign: "center", color: "#666" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>☕</div>
        <p style={{ fontWeight: "600" }}>Loading WhatsApp Assistant...</p>
      </div>
    );
  }

  return (
    <div className="tab-fade-in" style={{ padding: "24px 30px", maxWidth: "900px", margin: "0 auto", textAlign: "left", fontFamily: "inherit" }}>
      
      {/* HEADER WITH STATUS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>💬</span>
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#2c1b0d", margin: 0 }}>
              WhatsApp Messaging Center
            </h1>
          </div>
          <p style={{ color: "#71717a", fontSize: "13.5px", margin: "4px 0 0" }}>
            Send instant messages, order updates, photos, and PDF invoices to your customers.
          </p>
        </div>

        {/* HEALTH STATUS CARD */}
        <div style={{ 
          background: serverStatus.isReady ? "#f0fdf4" : "#fef2f2", 
          border: `1px solid ${serverStatus.isReady ? "#bbf7d0" : "#fecaca"}`, 
          borderRadius: "12px", 
          padding: "8px 16px", 
          display: "flex", 
          alignItems: "center", 
          gap: "10px" 
        }}>
          <span style={{ 
            width: "10px", 
            height: "10px", 
            borderRadius: "50%", 
            background: serverStatus.isReady ? "#16a34a" : "#dc2626", 
            display: "inline-block",
            boxShadow: serverStatus.isReady ? "0 0 8px #16a34a" : "none"
          }}></span>
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: "800", color: serverStatus.isReady ? "#15803d" : "#b91c1c" }}>
              {checkingStatus ? "Checking..." : (serverStatus.isReady ? "WhatsApp Online & Ready" : "Disconnected / Offline")}
            </div>
            {serverStatus.lastChecked && (
              <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                Connected ({senderNumber || instance})
              </div>
            )}
          </div>
          <button
            onClick={checkHealth}
            disabled={checkingStatus}
            style={{
              background: "transparent",
              border: "none",
              color: "#52525b",
              cursor: "pointer",
              fontSize: "14px",
              padding: "4px",
              marginLeft: "4px"
            }}
            title="Refresh Status"
          >
            🔄
          </button>
        </div>
      </div>

      {/* ALERT NOTIFICATION */}
      {msg.text && (
        <div style={{ 
          marginBottom: "20px", 
          padding: "12px 16px", 
          background: msg.type === "success" ? "#dcfce7" : (msg.type === "info" ? "#e0f2fe" : "#fee2e2"), 
          color: msg.type === "success" ? "#166534" : (msg.type === "info" ? "#075985" : "#991b1b"), 
          borderRadius: "10px",
          fontWeight: "700",
          fontSize: "13.5px",
          border: `1px solid ${msg.type === "success" ? "#86efac" : (msg.type === "info" ? "#7dd3fc" : "#fca5a5")}`
        }}>
          {msg.text}
        </div>
      )}

      {/* TOP NAVIGATION TABS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab('sender')}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "12px",
            border: "none",
            background: activeTab === 'sender' ? "#2c1b0d" : "#f4f4f5",
            color: activeTab === 'sender' ? "#ffffff" : "#3f3f46",
            fontWeight: "800",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: activeTab === 'sender' ? "0 4px 12px rgba(44, 27, 13, 0.2)" : "none",
            transition: "all 0.15s ease"
          }}
        >
          <span>🚀</span> Send Message & Attachments
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "12px",
            border: "none",
            background: activeTab === 'settings' ? "#2c1b0d" : "#f4f4f5",
            color: activeTab === 'settings' ? "#ffffff" : "#3f3f46",
            fontWeight: "800",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: activeTab === 'settings' ? "0 4px 12px rgba(44, 27, 13, 0.2)" : "none",
            transition: "all 0.15s ease"
          }}
        >
          <span>⚙️</span> WhatsApp Settings & Keys
        </button>
      </div>

      {/* TAB 1: SIMPLE MESSAGE & MEDIA SENDER */}
      {activeTab === 'sender' && (
        <div style={{ background: "#ffffff", padding: "28px", borderRadius: "18px", border: "1px solid #e4e4e7", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          
          {/* STEP 1: RECIPIENT PHONE NUMBER */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: "800", color: "#2c1b0d", marginBottom: "8px" }}>
              1. Customer Phone Number
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                value={recipientNumber}
                onChange={(e) => setRecipientNumber(e.target.value)}
                placeholder="Enter 10-digit number or +919876543210"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1.5px solid #d4d4d8",
                  fontSize: "15px",
                  fontWeight: "600",
                  outline: "none"
                }}
              />
              <button
                type="button"
                onClick={() => setRecipientNumber('+919411800280')}
                style={{
                  background: "#f4f4f5",
                  border: "1px solid #d4d4d8",
                  borderRadius: "10px",
                  padding: "0 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#3f3f46",
                  cursor: "pointer"
                }}
                title="Fill test number"
              >
                Insert Test #
              </button>
            </div>
            <span style={{ fontSize: "11.5px", color: "#71717a", marginTop: "5px", display: "block" }}>
              Country code <code>+91</code> is automatically added if you type a 10-digit mobile number.
            </span>
          </div>

          {/* STEP 2: READY-MADE MESSAGE BUTTONS */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#52525b", marginBottom: "8px" }}>
              Quick Templates (Click to fill):
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setMessageText('☕ *Order Confirmed | Chai Chaska*\n\nYour order has been received and scheduled for preparation. Thank you!')}
                style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >
                📦 Order Confirmed
              </button>
              <button
                type="button"
                onClick={() => setMessageText('🔥 *Your Kadak Chai is Brewing!*\n\nOur brewmaster is preparing your freshly made chai right now. Estimated ready: 4 minutes.')}
                style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >
                🫖 Brewing Now
              </button>
              <button
                type="button"
                onClick={() => setMessageText('🚀 *Out for Desk Delivery!*\n\nOur runner is on the way with your hot beverages. Enjoy your chai break! ☕')}
                style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >
                🏃 Out for Delivery
              </button>
              <button
                type="button"
                onClick={() => setMessageText('💳 *ChaiCo Wallet Credited*\n\n₹500 added to your Chai Chaska Corporate Wallet. Thank you!')}
                style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >
                💰 Wallet Added
              </button>
            </div>
          </div>

          {/* STEP 3: MESSAGE TEXT AREA */}
          <div style={{ marginBottom: "22px" }}>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: "800", color: "#2c1b0d", marginBottom: "8px" }}>
              2. Message Text (Optional if sending only PDF/Photo)
            </label>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Write your message here... (e.g. Hello! Here is your bill from Chai Chaska.)"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1.5px solid #d4d4d8",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none"
              }}
            />
          </div>

          {/* STEP 4: ATTACH FILE (PDF, PHOTO, VIDEO) */}
          <div style={{ marginBottom: "26px", padding: "18px 20px", background: "#f8fafc", borderRadius: "14px", border: "1.5px dashed #cbd5e1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: attachedFile || mediaUrlInput ? "14px" : "0" }}>
              <div>
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", display: "block" }}>
                  3. Attach PDF Invoice, Image, or Video
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Pick a file from your computer or use one of the quick samples below.
                </span>
              </div>

              {/* Upload Button */}
              <label style={{
                background: "#25D366",
                color: "#ffffff",
                padding: "9px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "800",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)"
              }}>
                <span>📁</span> Pick File (.pdf, .jpg, .png, .mp4)
                <input
                  type="file"
                  accept=".pdf,image/*,video/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {/* Quick Sample Attachments */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b" }}>Quick Attach:</span>
              <button
                type="button"
                onClick={() => pickSampleFile('pdf')}
                style={{
                  background: attachedFile?.type === 'application/pdf' ? "#dbeafe" : "#ffffff",
                  border: `1px solid ${attachedFile?.type === 'application/pdf' ? "#3b82f6" : "#cbd5e1"}`,
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#1e40af",
                  cursor: "pointer"
                }}
              >
                📄 Sample Tax Invoice (PDF)
              </button>
              <button
                type="button"
                onClick={() => pickSampleFile('image')}
                style={{
                  background: attachedFile?.type === 'image/jpeg' ? "#dbeafe" : "#ffffff",
                  border: `1px solid ${attachedFile?.type === 'image/jpeg' ? "#3b82f6" : "#cbd5e1"}`,
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#334155",
                  cursor: "pointer"
                }}
              >
                📸 Chai Order Photo
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  textDecoration: "underline",
                  marginLeft: "auto"
                }}
              >
                {showUrlInput ? "Hide URL Option" : "+ Paste Web Link Instead"}
              </button>
            </div>

            {/* Optional URL Input */}
            {showUrlInput && (
              <div style={{ marginTop: "12px" }}>
                <input
                  type="text"
                  value={mediaUrlInput}
                  onChange={(e) => {
                    setMediaUrlInput(e.target.value);
                    setAttachedFile(null);
                  }}
                  placeholder="https://example.com/invoice.pdf or photo URL"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                />
              </div>
            )}

            {/* SELECTED FILE CARD PREVIEW */}
            {attachedFile && (
              <div style={{ marginTop: "14px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "22px" }}>
                    {attachedFile.mediaType === 'document' ? '📄' : (attachedFile.mediaType === 'image' ? '📸' : '🎥')}
                  </span>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#166534", display: "block" }}>{attachedFile.name}</strong>
                    <span style={{ fontSize: "11px", color: "#15803d" }}>
                      {attachedFile.mediaType.toUpperCase()} • {attachedFile.sizeKb ? `${attachedFile.sizeKb} KB` : 'Ready'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>

          {/* STEP 5: BIG SEND BUTTON */}
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={sending}
            style={{
              width: "100%",
              background: "#25D366",
              color: "#ffffff",
              padding: "16px 24px",
              borderRadius: "12px",
              border: "none",
              fontWeight: "800",
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: "0 4px 16px rgba(37, 211, 102, 0.35)",
              opacity: sending ? 0.7 : 1,
              transition: "transform 0.1s ease"
            }}
          >
            {sending ? (
              <>⏳ Sending to WhatsApp...</>
            ) : (
              <>🚀 Send to Customer via WhatsApp</>
            )}
          </button>

          {/* LAST SENT CONFIRMATION BANNER */}
          {lastSentStatus && (
            <div style={{ 
              marginTop: "18px", 
              padding: "12px 16px", 
              borderRadius: "10px", 
              background: lastSentStatus.success ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${lastSentStatus.success ? "#86efac" : "#fca5a5"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ fontSize: "13px", color: lastSentStatus.success ? "#166534" : "#991b1b", fontWeight: "600" }}>
                {lastSentStatus.success ? (
                  <>✅ Delivered to <strong>{lastSentStatus.to}</strong> at {lastSentStatus.time} {lastSentStatus.hasMedia ? '(with attachment)' : ''}</>
                ) : (
                  <>❌ Failed to send: {lastSentStatus.error}</>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: SIMPLE CREDENTIALS & SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ background: "#ffffff", padding: "28px", borderRadius: "18px", border: "1px solid #e4e4e7", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f4f4f5", paddingBottom: "14px" }}>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#2c1b0d", margin: "0 0 4px" }}>
                WhatsApp Account & Server Configuration
              </h2>
              <p style={{ fontSize: "12.5px", color: "#71717a", margin: 0 }}>
                Manage your connected business WhatsApp instance and API keys.
              </p>
            </div>

            <button
              onClick={handleRestoreDefaults}
              style={{
                background: "#f4f4f5",
                color: "#2c1b0d",
                border: "1px solid #d4d4d8",
                padding: "6px 12px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "11.5px",
                cursor: "pointer"
              }}
            >
              🔄 Reset to Defaults
            </button>
          </div>

          {/* Master Enable/Disable Switch */}
          <div style={{ marginBottom: "20px", padding: "14px 18px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <label htmlFor="wa-enable-toggle" style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", display: "block", cursor: "pointer" }}>
                Enable Automated WhatsApp Order Notifications
              </label>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                When checked, customers receive automated updates when orders are placed, brewed, and dispatched.
              </span>
            </div>
            <input
              type="checkbox"
              id="wa-enable-toggle"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
          </div>

          {/* Form Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px", color: "#2c1b0d" }}>
                Server URL
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d4d4d8", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px", color: "#2c1b0d" }}>
                Connected Instance Name
              </label>
              <input
                type="text"
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d4d4d8", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px", color: "#2c1b0d" }}>
                API Key
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #d4d4d8", fontSize: "13px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{ background: "#f4f4f5", border: "1px solid #d4d4d8", borderRadius: "8px", padding: "0 10px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px", color: "#2c1b0d" }}>
                Sender Phone Number
              </label>
              <input
                type="text"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d4d4d8", fontSize: "13px" }}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: "#2c1b0d",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "10px",
              fontWeight: "800",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? "Saving Changes..." : "💾 Save WhatsApp Settings"}
          </button>
        </div>
      )}

    </div>
  );
}
