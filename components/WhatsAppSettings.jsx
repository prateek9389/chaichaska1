"use client";
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getWhatsAppConfig, updateWhatsAppConfig } from '@/lib/firestore';
import { DEFAULT_WHATSAPP_CONFIG, sanitizeApiKey, cleanPhoneForApi } from '@/lib/whatsapp';

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

  // Navigation Tabs: 'sender' (Quick Single) | 'bulk' (Bulk Broadcast) | 'settings' (API & Keys)
  const [activeTab, setActiveTab] = useState('sender');

  // Server health state
  const [serverStatus, setServerStatus] = useState({
    isReady: false,
    state: 'checking',
    lastChecked: null
  });
  const [checkingStatus, setCheckingStatus] = useState(false);

  // -------------------------------------------------------------
  // TAB 1: SINGLE QUICK SENDER STATE
  // -------------------------------------------------------------
  const [recipientNumber, setRecipientNumber] = useState('');
  const [messageText, setMessageText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // { name, type, dataUrl, mediaType, sizeKb }
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSentStatus, setLastSentStatus] = useState(null);

  // -------------------------------------------------------------
  // TAB 2: BULK BROADCAST & CAMPAIGN STATE
  // -------------------------------------------------------------
  const [dbContacts, setDbContacts] = useState([]); // Loaded from Firebase Orders, Subscriptions & Saved Contacts
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [savingManualContacts, setSavingManualContacts] = useState(false);
  const [contactCategoryFilter, setContactCategoryFilter] = useState('all'); // 'all' | 'manual' | 'online' | 'offline' | 'subscription'
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  
  // Selected recipients (Array of { phone, name, source })
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  
  // Manual numbers input
  const [manualInputText, setManualInputText] = useState('');
  const [manualInputName, setManualInputName] = useState('');

  // Bulk Media & Message
  const [bulkAttachedImage, setBulkAttachedImage] = useState(null); // { name, dataUrl, sizeKb }
  const [bulkImageUrlInput, setBulkImageUrlInput] = useState('');
  const [showBulkUrlInput, setShowBulkUrlInput] = useState(false);
  const [bulkMessageText, setBulkMessageText] = useState(
    '☕ *Special Offer | Chai Chaska*\n\nHi {name},\nEnjoy your favorite piping hot Karak Masala Chai & Snacks today with a *Flat 20% OFF* on your next order! 🫖✨\n\nOrder online now: https://www.chaichaska.co.in/shop\n\nHave a refreshing day! 🌿'
  );

  // Bulk Sending Engine State
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [bulkLogs, setBulkLogs] = useState([]); // [{ phone, name, status: 'pending'|'sending'|'success'|'error', error: '' }]
  const [bulkStopped, setBulkStopped] = useState(false);
  const stopRef = useRef(false);

  // -------------------------------------------------------------
  // Load saved config & Database contacts
  // -------------------------------------------------------------
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
    loadDatabaseContacts();
  }, []);

  // Fetch unique customer contacts from Firebase (Orders + Subscriptions + Saved Contacts) with ZERO Duplicates
  const loadDatabaseContacts = async () => {
    setLoadingContacts(true);
    try {
      const contactsMap = new Map();

      // 1. Extract from Saved Contacts Collection (whatsapp_contacts)
      try {
        const savedSnap = await getDocs(collection(db, 'whatsapp_contacts'));
        savedSnap.forEach((docSnap) => {
          const d = docSnap.data();
          const rawPhone = d.phone || d.mobile || docSnap.id;
          if (rawPhone) {
            const clean10 = String(rawPhone).replace(/\D/g, '').slice(-10);
            if (clean10.length === 10) {
              const formatted = `+91${clean10}`;
              contactsMap.set(formatted, {
                id: docSnap.id,
                phone: formatted,
                cleanPhone: clean10,
                name: d.name || 'Saved Contact',
                source: 'manual',
                sourceLabel: '✍️ Saved Contact',
                orderCount: d.orderCount || 0,
                lastOrderDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : 'Saved in DB',
                totalSpent: d.totalSpent || 0,
                isManualSaved: true
              });
            }
          }
        });
      } catch (e) {
        console.warn('whatsapp_contacts fetch error (first time setup):', e);
      }

      // 2. Extract from Orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      ordersSnap.forEach((doc) => {
        const o = doc.data();
        const rawPhone = o.phone || o.mobile || o.address?.phone;
        if (rawPhone && typeof rawPhone === 'string') {
          const clean10 = rawPhone.replace(/\D/g, '').slice(-10);
          if (clean10.length === 10) {
            const formatted = `+91${clean10}`;
            const existing = contactsMap.get(formatted);
            const customerName = o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}`.trim() : '');
            const isOffline = Boolean(o.isOffline || o.walkIn);

            if (!existing) {
              contactsMap.set(formatted, {
                id: formatted,
                phone: formatted,
                cleanPhone: clean10,
                name: customerName || (isOffline ? 'Counter Guest' : 'Online Customer'),
                source: isOffline ? 'offline' : 'online',
                sourceLabel: isOffline ? '🏪 Offline Counter' : '🌐 Online App',
                orderCount: 1,
                lastOrderDate: o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'Recent'),
                totalSpent: Number(String(o.total || o.priceNum || 0).replace(/[^\d.]/g, '')) || 0
              });
            } else {
              existing.orderCount = (existing.orderCount || 0) + 1;
              if (customerName && (existing.name.includes('Customer') || existing.name.includes('Guest') || existing.name.includes('Saved Contact'))) {
                existing.name = customerName;
              }
              existing.totalSpent = (existing.totalSpent || 0) + (Number(String(o.total || o.priceNum || 0).replace(/[^\d.]/g, '')) || 0);
            }
          }
        }
      });

      // 3. Extract from Subscriptions
      try {
        const subSnap = await getDocs(collection(db, 'subscriptions'));
        subSnap.forEach((doc) => {
          const s = doc.data();
          const rawPhone = s.phone || s.mobile || s.contact;
          if (rawPhone && typeof rawPhone === 'string') {
            const clean10 = rawPhone.replace(/\D/g, '').slice(-10);
            if (clean10.length === 10) {
              const formatted = `+91${clean10}`;
              const existing = contactsMap.get(formatted);
              const subName = s.customerName || s.name || s.user;
              if (!existing) {
                contactsMap.set(formatted, {
                  id: formatted,
                  phone: formatted,
                  cleanPhone: clean10,
                  name: subName || 'Subscription Member',
                  source: 'subscription',
                  sourceLabel: '⭐ Subscribed Member',
                  orderCount: 1,
                  lastOrderDate: 'Active Plan',
                  totalSpent: s.price || 0
                });
              } else {
                existing.source = 'subscription';
                existing.sourceLabel = '⭐ Subscribed Member';
                if (subName) existing.name = subName;
              }
            }
          }
        });
      } catch (e) {
        console.warn('Subscriptions fetch error (optional):', e);
      }

      const list = Array.from(contactsMap.values());
      setDbContacts(list);
      return list;
    } catch (err) {
      console.error('Error fetching database contacts:', err);
      return [];
    } finally {
      setLoadingContacts(false);
    }
  };

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

  // Handle local file picking for Single Sender
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

  // Handle local image picking for Bulk Campaign
  const handleBulkImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'error', text: '⚠️ Please select a valid image file (JPEG, PNG, WEBP).' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result;
      if (typeof dataUri === 'string') {
        setBulkAttachedImage({
          name: file.name,
          type: file.type || 'image/jpeg',
          dataUrl: dataUri,
          sizeKb: Math.round(file.size / 1024)
        });
        setBulkImageUrlInput('');
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

  // Quick Preset Bulk Images
  const pickBulkSampleImage = (preset) => {
    if (preset === 'offer') {
      setBulkAttachedImage({
        name: 'ChaiChaska_Special_Discount_Offer.jpg',
        type: 'image/jpeg',
        dataUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=900&auto=format&fit=crop',
        sizeKb: 112
      });
    } else if (preset === 'new_menu') {
      setBulkAttachedImage({
        name: 'ChaiChaska_New_Menu_Launch.jpg',
        type: 'image/jpeg',
        dataUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900&auto=format&fit=crop',
        sizeKb: 98
      });
    } else if (preset === 'festive') {
      setBulkAttachedImage({
        name: 'ChaiChaska_Weekend_Chai_Festival.jpg',
        type: 'image/jpeg',
        dataUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=900&auto=format&fit=crop',
        sizeKb: 125
      });
    }
  };

  // Send Single Message
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

  // -------------------------------------------------------------
  // BULK RECIPIENT MANAGEMENT & PERSISTENT DATABASE STORAGE
  // -------------------------------------------------------------
  
  // Filter database contacts (DEDUPLICATED)
  const filteredDbContacts = dbContacts.filter((c) => {
    if (contactCategoryFilter !== 'all' && c.source !== contactCategoryFilter) {
      return false;
    }
    if (contactSearchQuery.trim()) {
      const q = contactSearchQuery.toLowerCase().trim();
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone.includes(q) || c.cleanPhone.includes(q);
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  // Toggle single DB contact
  const toggleContactSelection = (contact) => {
    const isSelected = selectedRecipients.some((r) => r.phone === contact.phone);
    if (isSelected) {
      setSelectedRecipients(selectedRecipients.filter((r) => r.phone !== contact.phone));
    } else {
      setSelectedRecipients([...selectedRecipients, contact]);
    }
  };

  // Select all filtered contacts
  const handleSelectAllFiltered = () => {
    const existingPhones = new Set(selectedRecipients.map((r) => r.phone));
    const newToAdd = filteredDbContacts.filter((c) => !existingPhones.has(c.phone));
    setSelectedRecipients([...selectedRecipients, ...newToAdd]);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedRecipients([]);
  };

  // Add Manual Numbers, Save All to Database (whatsapp_contacts), and Auto-Insert into Selection List
  const handleSaveAndAddManualNumbers = async () => {
    if (!manualInputText.trim()) {
      setMsg({ type: 'error', text: '⚠️ Please enter at least one mobile number.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3500);
      return;
    }

    setSavingManualContacts(true);
    try {
      // Split tokens by comma, newline, semicolon, space
      const rawTokens = manualInputText.split(/[\n,; ]+/).map((t) => t.trim()).filter(Boolean);
      
      const newValidMap = new Map();
      let duplicateCount = 0;
      const existingDbPhones = new Set(dbContacts.map((c) => c.phone));

      rawTokens.forEach((token) => {
        const clean10 = token.replace(/\D/g, '').slice(-10);
        if (clean10.length === 10) {
          const formatted = `+91${clean10}`;
          if (newValidMap.has(formatted) || existingDbPhones.has(formatted)) {
            duplicateCount++;
          }
          // Store unique entry
          if (!newValidMap.has(formatted)) {
            newValidMap.set(formatted, {
              phone: formatted,
              cleanPhone: clean10,
              name: manualInputName.trim() || 'Valued Customer',
              source: 'manual',
              sourceLabel: '✍️ Saved Contact',
              orderCount: 0,
              lastOrderDate: 'Saved in DB',
              totalSpent: 0,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
        }
      });

      const uniqueItemsToSave = Array.from(newValidMap.values());

      if (uniqueItemsToSave.length === 0) {
        setMsg({ type: 'error', text: `⚠️ No new valid numbers to add. ${duplicateCount > 0 ? `(${duplicateCount} duplicates skipped)` : ''}` });
        setSavingManualContacts(false);
        setTimeout(() => setMsg({ type: '', text: '' }), 4000);
        return;
      }

      // Persist each unique contact to Firestore whatsapp_contacts collection
      for (const item of uniqueItemsToSave) {
        const docRef = doc(db, 'whatsapp_contacts', item.phone);
        await setDoc(docRef, {
          phone: item.phone,
          cleanPhone: item.cleanPhone,
          name: item.name,
          source: 'manual',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }, { merge: true });
      }

      // Refresh database contacts
      const updatedList = await loadDatabaseContacts();

      // Automatically auto-select all newly saved contacts so admin can immediately broadcast
      const newPhonesSet = new Set(uniqueItemsToSave.map(u => u.phone));
      const newlyCreatedContacts = (updatedList || []).filter(c => newPhonesSet.has(c.phone));
      
      const existingSelectedPhones = new Set(selectedRecipients.map(r => r.phone));
      const mergedSelected = [
        ...selectedRecipients,
        ...newlyCreatedContacts.filter(c => !existingSelectedPhones.has(c.phone))
      ];
      setSelectedRecipients(mergedSelected);

      setManualInputText('');
      setManualInputName('');
      setMsg({
        type: 'success',
        text: `🎉 Saved ${uniqueItemsToSave.length} contact(s) to Database & selected for broadcast! ${duplicateCount > 0 ? `(${duplicateCount} duplicate(s) filtered)` : ''}`
      });
    } catch (err) {
      console.error('Error saving manual contacts:', err);
      setMsg({ type: 'error', text: `❌ Error saving contacts: ${err.message}` });
    } finally {
      setSavingManualContacts(false);
      setTimeout(() => setMsg({ type: '', text: '' }), 5000);
    }
  };

  // Delete a manual contact from Firestore database
  const handleDeleteDbContact = async (contact, e) => {
    if (e) e.stopPropagation();
    const confirmDel = confirm(`Delete contact ${contact.name} (${contact.phone}) from database?`);
    if (!confirmDel) return;

    try {
      if (contact.isManualSaved || contact.source === 'manual') {
        await deleteDoc(doc(db, 'whatsapp_contacts', contact.phone));
      }
      setSelectedRecipients(prev => prev.filter(r => r.phone !== contact.phone));
      await loadDatabaseContacts();
      setMsg({ type: 'info', text: `🗑️ Removed ${contact.phone} from database.` });
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error deleting contact:', err);
      alert('Failed to delete contact: ' + err.message);
    }
  };

  // Remove single selected recipient from campaign
  const removeSelectedRecipient = (phone) => {
    setSelectedRecipients(selectedRecipients.filter((r) => r.phone !== phone));
  };

  // -------------------------------------------------------------
  // BULK SENDING EXECUTION ENGINE
  // -------------------------------------------------------------
  const handleStartBulkCampaign = async () => {
    if (selectedRecipients.length === 0) {
      setMsg({ type: 'error', text: '⚠️ Please select at least one recipient number to start campaign.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3500);
      return;
    }

    if (!bulkMessageText.trim() && !bulkAttachedImage && !bulkImageUrlInput.trim()) {
      setMsg({ type: 'error', text: '⚠️ Please write a campaign message or select an image to broadcast.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 3500);
      return;
    }

    if (!serverStatus.isReady) {
      const proceed = confirm("⚠️ WhatsApp status shows disconnected or offline. Would you like to proceed anyway?");
      if (!proceed) return;
    }

    const confirmSend = confirm(`🚀 Are you sure you want to broadcast this message & image to ${selectedRecipients.length} customer(s)?`);
    if (!confirmSend) return;

    setBulkSending(true);
    setBulkStopped(false);
    stopRef.current = false;

    // Initialize logs
    const initialLogs = selectedRecipients.map((r) => ({
      phone: r.phone,
      name: r.name,
      source: r.sourceLabel || r.source,
      status: 'pending',
      error: '',
      time: ''
    }));
    setBulkLogs(initialLogs);
    setBulkProgress({ current: 0, total: selectedRecipients.length, success: 0, failed: 0 });

    const cleanKey = sanitizeApiKey(apiKey);
    const mediaSource = bulkAttachedImage ? bulkAttachedImage.dataUrl : (bulkImageUrlInput.trim() || null);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedRecipients.length; i++) {
      if (stopRef.current) {
        break;
      }

      const recipient = selectedRecipients[i];
      
      // Update item status to 'sending'
      setBulkLogs((prev) =>
        prev.map((log, idx) => (idx === i ? { ...log, status: 'sending' } : log))
      );

      // Customize personalized message tag {name}
      const customizedText = bulkMessageText
        .replace(/{name}/gi, recipient.name || 'Valued Customer')
        .replace(/{phone}/gi, recipient.phone || '');

      let payload = {
        baseUrl,
        instance,
        apiKey: cleanKey,
        number: recipient.phone
      };

      if (mediaSource) {
        payload = {
          ...payload,
          action: 'sendMedia',
          mediaUrl: mediaSource,
          mediaType: 'image',
          fileName: bulkAttachedImage?.name || 'promo_image.jpg',
          mimeType: bulkAttachedImage?.type || 'image/jpeg',
          caption: customizedText
        };
      } else {
        payload = {
          ...payload,
          action: 'sendText',
          text: customizedText
        };
      }

      try {
        const res = await fetch('/api/whatsapp/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.ok) {
          successCount++;
          setBulkLogs((prev) =>
            prev.map((log, idx) =>
              idx === i
                ? {
                    ...log,
                    status: 'success',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  }
                : log
            )
          );
        } else {
          failedCount++;
          setBulkLogs((prev) =>
            prev.map((log, idx) =>
              idx === i
                ? {
                    ...log,
                    status: 'error',
                    error: data.data?.response?.message || data.error || 'Failed to deliver',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  }
                : log
            )
          );
        }
      } catch (e) {
        failedCount++;
        setBulkLogs((prev) =>
          prev.map((log, idx) =>
            idx === i ? { ...log, status: 'error', error: e.message, time: new Date().toLocaleTimeString() } : log
          )
        );
      }

      setBulkProgress({
        current: i + 1,
        total: selectedRecipients.length,
        success: successCount,
        failed: failedCount
      });

      // Safe pause between dispatches (600ms)
      if (i < selectedRecipients.length - 1 && !stopRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    setBulkSending(false);
    if (stopRef.current) {
      setMsg({ type: 'info', text: `⏸️ Bulk campaign stopped. Delivered to ${successCount} numbers.` });
    } else {
      setMsg({
        type: successCount > 0 ? 'success' : 'error',
        text: `🎉 Bulk broadcast completed! ✅ Sent: ${successCount} | ❌ Failed: ${failedCount}`
      });
    }
    setTimeout(() => setMsg({ type: '', text: '' }), 6000);
  };

  const handleStopBulkCampaign = () => {
    stopRef.current = true;
    setBulkStopped(true);
  };

  if (loading) {
    return (
      <div style={{ padding: "50px", textAlign: "center", color: "#666" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>☕</div>
        <p style={{ fontWeight: "600" }}>Loading WhatsApp Assistant & Database Contacts...</p>
      </div>
    );
  }

  return (
    <div className="tab-fade-in" style={{ padding: "20px 24px", maxWidth: "1080px", margin: "0 auto", textAlign: "left", fontFamily: "inherit" }}>
      
      {/* HEADER WITH HEALTH STATUS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "22px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>💬</span>
            <h1 style={{ fontSize: "24px", fontWeight: "850", color: "#2c1b0d", margin: 0 }}>
              WhatsApp Messaging Center
            </h1>
          </div>
          <p style={{ color: "#71717a", fontSize: "13.5px", margin: "4px 0 0" }}>
            Direct customer chat, bulk marketing broadcasts, image promos, and API keys configuration.
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "10px", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab('sender')}
          style={{
            padding: "13px",
            borderRadius: "12px",
            border: "none",
            background: activeTab === 'sender' ? "#2c1b0d" : "#f4f4f5",
            color: activeTab === 'sender' ? "#ffffff" : "#3f3f46",
            fontWeight: "800",
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: activeTab === 'sender' ? "0 4px 12px rgba(44, 27, 13, 0.2)" : "none",
            transition: "all 0.15s ease"
          }}
        >
          <span>🚀</span> Quick Message
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          style={{
            padding: "13px",
            borderRadius: "12px",
            border: activeTab === 'bulk' ? "none" : "1.5px solid #25D366",
            background: activeTab === 'bulk' ? "#25D366" : "#f0fdf4",
            color: activeTab === 'bulk' ? "#ffffff" : "#166534",
            fontWeight: "900",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: activeTab === 'bulk' ? "0 4px 16px rgba(37, 211, 102, 0.35)" : "none",
            transition: "all 0.15s ease"
          }}
        >
          <span>📢</span> Bulk Broadcast & Database Contacts
          {selectedRecipients.length > 0 && (
            <span style={{
              background: activeTab === 'bulk' ? "#ffffff" : "#16a34a",
              color: activeTab === 'bulk' ? "#16a34a" : "#ffffff",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "900"
            }}>
              {selectedRecipients.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: "13px",
            borderRadius: "12px",
            border: "none",
            background: activeTab === 'settings' ? "#2c1b0d" : "#f4f4f5",
            color: activeTab === 'settings' ? "#ffffff" : "#3f3f46",
            fontWeight: "800",
            fontSize: "13.5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: activeTab === 'settings' ? "0 4px 12px rgba(44, 27, 13, 0.2)" : "none",
            transition: "all 0.15s ease"
          }}
        >
          <span>⚙️</span> API & Keys
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUICK SINGLE MESSAGE & MEDIA SENDER */}
      {/* ========================================================================= */}
      {activeTab === 'sender' && (
        <div style={{ background: "#ffffff", padding: "26px", borderRadius: "18px", border: "1px solid #e4e4e7", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
          
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
                placeholder="Enter 10-digit number (e.g. 9876543210)"
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
              Country code <code>+91</code> is automatically prefixed to 10-digit numbers.
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
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* STEP 4: ATTACH FILE */}
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
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                />
              </div>
            )}

            {/* PREVIEW */}
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

          {/* SEND BUTTON */}
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
              opacity: sending ? 0.7 : 1
            }}
          >
            {sending ? <>⏳ Sending to WhatsApp...</> : <>🚀 Send to Customer via WhatsApp</>}
          </button>

          {/* CONFIRMATION BANNER */}
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

      {/* ========================================================================= */}
      {/* TAB 2: BULK BROADCAST & DATABASE CONTACTS */}
      {/* ========================================================================= */}
      {activeTab === 'bulk' && (
        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

          {/* CAMPAIGN OVERVIEW BANNER */}
          <div style={{
            background: "linear-gradient(135deg, #09090b 0%, #2c1b0d 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            borderRadius: "16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "20px" }}>📢</span>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "900", color: "#fef08a" }}>
                  Chai Chaska Bulk Broadcast Hub
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#d4d4d8", maxWidth: "620px" }}>
                Add mobile numbers directly to your persistent database with zero duplicates, filter & select target customer audiences, attach promo images, and broadcast personalized WhatsApp messages in 1 click!
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "#a1a1aa", textTransform: "uppercase", fontWeight: "800", display: "block" }}>
                  Selected Target Audience
                </span>
                <strong style={{ fontSize: "24px", color: "#4ade80", fontWeight: "900" }}>
                  {selectedRecipients.length} <span style={{ fontSize: "14px", fontWeight: "600", color: "#e4e4e7" }}>Numbers</span>
                </strong>
              </div>

              {selectedRecipients.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    cursor: "pointer"
                  }}
                >
                  ✕ Clear All
                </button>
              )}
            </div>
          </div>

          {/* MAIN 2-COLUMN GRID: RECIPIENT PICKER (LEFT) + CAMPAIGN COMPOSER (RIGHT) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "22px", alignItems: "start" }}>

            {/* LEFT COLUMN: RECIPIENT SELECTION (DATABASE & MANUAL) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              
              {/* STEP 1: ADD NEW NUMBERS TO DATABASE & AUTO-INSERT */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1.5px solid #bbf7d0", boxShadow: "0 4px 16px rgba(34, 197, 94, 0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "900", color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>➕</span> 1. Add Numbers to Database
                  </h4>
                  <span style={{ fontSize: "11px", color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: "6px", fontWeight: "800" }}>
                    Auto Deduplicated 🛡️
                  </span>
                </div>
                <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#52525b" }}>
                  Paste multiple numbers (comma, newline, or space separated). New numbers will be saved in Database and immediately added to your selection below.
                </p>

                <div style={{ marginBottom: "10px" }}>
                  <textarea
                    rows={3}
                    value={manualInputText}
                    onChange={(e) => setManualInputText(e.target.value)}
                    placeholder="Enter numbers e.g.: 9876543210, 9811223344, +919988776655, 9411800280..."
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "13px",
                      fontFamily: "monospace",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={manualInputName}
                    onChange={(e) => setManualInputName(e.target.value)}
                    placeholder="Optional Contact Name (e.g. VIP Guest)"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "12.5px",
                      outline: "none"
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAndAddManualNumbers}
                    disabled={savingManualContacts}
                    style={{
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: "850",
                      cursor: savingManualContacts ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)"
                    }}
                  >
                    {savingManualContacts ? "Saving..." : "💾 Save to DB & Select"}
                  </button>
                </div>
              </div>

              {/* STEP 2: SELECT FROM DATABASE (WITH ZERO DUPLICATES & FILTER TABS) */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e4e4e7", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "850", color: "#09090b", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🗄️</span> 2. Select From Database
                    </h4>
                    <span style={{ fontSize: "11.5px", color: "#71717a" }}>
                      {dbContacts.length} unique customer contacts found (All duplicates filtered)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={loadDatabaseContacts}
                    disabled={loadingContacts}
                    style={{
                      background: "#f4f4f5",
                      border: "1px solid #e4e4e7",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      color: "#3f3f46",
                      cursor: "pointer"
                    }}
                  >
                    {loadingContacts ? "🔄 Loading..." : "🔄 Refresh DB"}
                  </button>
                </div>

                {/* Filter Pills */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {[
                    { key: 'all', label: `All Unique (${dbContacts.length})` },
                    { key: 'manual', label: `Added in DB (${dbContacts.filter(c => c.source === 'manual').length})` },
                    { key: 'online', label: `Online App (${dbContacts.filter(c => c.source === 'online').length})` },
                    { key: 'offline', label: `Counter (${dbContacts.filter(c => c.source === 'offline').length})` },
                    { key: 'subscription', label: `Subscribers (${dbContacts.filter(c => c.source === 'subscription').length})` },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setContactCategoryFilter(cat.key)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "1px solid",
                        borderColor: contactCategoryFilter === cat.key ? "#09090b" : "#e4e4e7",
                        background: contactCategoryFilter === cat.key ? "#09090b" : "#ffffff",
                        color: contactCategoryFilter === cat.key ? "#ffffff" : "#52525b",
                        fontSize: "11.5px",
                        fontWeight: "750",
                        cursor: "pointer"
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    placeholder="Search database contacts by name or phone..."
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 30px",
                      borderRadius: "8px",
                      border: "1.5px solid #e2e8f0",
                      fontSize: "12.5px",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <span style={{ position: "absolute", left: "10px", top: "8px", fontSize: "13px", color: "#94a3b8" }}>🔍</span>
                </div>

                {/* Action Bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", padding: "6px 10px", background: "#f8fafc", borderRadius: "8px" }}>
                  <span style={{ fontSize: "12px", color: "#475569", fontWeight: "700" }}>
                    Showing {filteredDbContacts.length} contacts
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      style={{ background: "#09090b", color: "#ffffff", border: "none", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                    >
                      + Select All Filtered ({filteredDbContacts.length})
                    </button>
                  </div>
                </div>

                {/* Contact List Box */}
                <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "10px", padding: "6px", background: "#fafafa" }}>
                  {filteredDbContacts.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8", fontSize: "12.5px" }}>
                      No contacts found matching this filter.
                    </div>
                  ) : (
                    filteredDbContacts.map((contact) => {
                      const isSelected = selectedRecipients.some((r) => r.phone === contact.phone);
                      return (
                        <div
                          key={contact.phone}
                          onClick={() => toggleContactSelection(contact)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            marginBottom: "4px",
                            background: isSelected ? "#f0fdf4" : "#ffffff",
                            border: `1px solid ${isSelected ? "#86efac" : "#e2e8f0"}`,
                            cursor: "pointer",
                            transition: "all 0.1s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by parent container click
                              style={{ width: "16px", height: "16px", accentColor: "#16a34a", cursor: "pointer" }}
                            />
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <strong style={{ fontSize: "13px", color: "#09090b" }}>{contact.name}</strong>
                                <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: isSelected ? "#dcfce7" : "#f1f5f9", color: isSelected ? "#15803d" : "#64748b", fontWeight: "700" }}>
                                  {contact.sourceLabel}
                                </span>
                              </div>
                              <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "800", letterSpacing: "0.3px" }}>
                                {contact.phone}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ textAlign: "right", fontSize: "11px", color: "#64748b" }}>
                              <span style={{ display: "block", fontWeight: "700" }}>{contact.orderCount > 0 ? `${contact.orderCount} Orders` : contact.lastOrderDate}</span>
                              {contact.totalSpent > 0 && <span>₹{Math.round(contact.totalSpent)}</span>}
                            </div>

                            {contact.source === 'manual' && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteDbContact(contact, e)}
                                title="Delete from Database"
                                style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "13px", cursor: "pointer", padding: "2px" }}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* STEP 3: SELECTED RECIPIENTS SUMMARY BADGE PILLS */}
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1.5px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "850", color: "#09090b" }}>
                    🎯 Final Target Audience ({selectedRecipients.length} Selected)
                  </span>
                  {selectedRecipients.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      style={{ background: "transparent", border: "none", color: "#e11d48", fontSize: "11px", fontWeight: "800", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedRecipients.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
                    No recipients selected yet. Select numbers from Database above.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "120px", overflowY: "auto" }}>
                    {selectedRecipients.map((rec) => (
                      <span
                        key={rec.phone}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "16px",
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: "750",
                          color: "#1e293b",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <span>{rec.name || rec.phone}</span>
                        <span style={{ color: "#16a34a", fontSize: "10.5px" }}>({rec.phone})</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedRecipient(rec.phone)}
                          style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, fontSize: "12px", fontWeight: "bold" }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: CAMPAIGN IMAGE, MESSAGE COMPOSER & PREVIEW */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* STEP 4: IMAGE ATTACHMENT CARD */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e4e4e7", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "850", color: "#09090b", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🖼️</span> 3. Select Campaign Image
                    </h4>
                    <span style={{ fontSize: "11.5px", color: "#71717a" }}>
                      Add a poster, discount banner, or chai photo
                    </span>
                  </div>

                  <label style={{
                    background: "#09090b",
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span>📁</span> Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBulkImageChange}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                {/* Quick Sample Image Banners */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#64748b", alignSelf: "center" }}>Preset Banners:</span>
                  <button
                    type="button"
                    onClick={() => pickBulkSampleImage('offer')}
                    style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "700", color: "#3f3f46", cursor: "pointer" }}
                  >
                    🏷️ 20% OFF Offer
                  </button>
                  <button
                    type="button"
                    onClick={() => pickBulkSampleImage('new_menu')}
                    style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "700", color: "#3f3f46", cursor: "pointer" }}
                  >
                    🫖 New Chai Menu
                  </button>
                  <button
                    type="button"
                    onClick={() => pickBulkSampleImage('festive')}
                    style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "700", color: "#3f3f46", cursor: "pointer" }}
                  >
                    🎉 Weekend Treat
                  </button>
                </div>

                {/* Image URL link toggle */}
                <div style={{ marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowBulkUrlInput(!showBulkUrlInput)}
                    style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: "11.5px", fontWeight: "750", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    {showBulkUrlInput ? "Hide Web URL input" : "+ Paste Image Link / URL"}
                  </button>
                  {showBulkUrlInput && (
                    <input
                      type="text"
                      value={bulkImageUrlInput}
                      onChange={(e) => {
                        setBulkImageUrlInput(e.target.value);
                        setBulkAttachedImage(null);
                      }}
                      placeholder="https://example.com/banner.jpg"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", fontSize: "12.5px", marginTop: "6px", boxSizing: "border-box" }}
                    />
                  )}
                </div>

                {/* IMAGE PREVIEW CARD */}
                {(bulkAttachedImage || bulkImageUrlInput) && (
                  <div style={{ marginTop: "10px", padding: "10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        src={bulkAttachedImage ? bulkAttachedImage.dataUrl : bulkImageUrlInput}
                        alt="Campaign preview"
                        style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover", border: "1px solid #bbf7d0" }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div>
                        <strong style={{ fontSize: "12.5px", color: "#166534", display: "block" }}>
                          {bulkAttachedImage ? bulkAttachedImage.name : "Web Link Image Attached"}
                        </strong>
                        <span style={{ fontSize: "11px", color: "#15803d" }}>
                          {bulkAttachedImage?.sizeKb ? `${bulkAttachedImage.sizeKb} KB • ` : ''}Ready for WhatsApp Broadcast
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBulkAttachedImage(null);
                        setBulkImageUrlInput('');
                      }}
                      style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 5: MESSAGE COMPOSER */}
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e4e4e7", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "850", color: "#09090b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>✍️</span> 4. Write Campaign Message
                  </h4>

                  <button
                    type="button"
                    onClick={() => setBulkMessageText(prev => prev + ' {name}')}
                    style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: "800", color: "#1e293b", cursor: "pointer" }}
                    title="Insert customer name placeholder"
                  >
                    + Insert &#123;name&#125;
                  </button>
                </div>

                {/* Preset Text Templates */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setBulkMessageText('☕ *Special 20% OFF | Chai Chaska*\n\nHi {name},\nTreat yourself to fresh hot Karak Chai & crunchy Bun Maska today! Use code *CHAI20* at checkout for a Flat 20% discount.\n\n👉 Order now: https://www.chaichaska.co.in/shop')}
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "600", color: "#334155", cursor: "pointer" }}
                  >
                    🏷️ 20% Promo
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMessageText('🫖 *New Special Blend Introduced!*\n\nHi {name},\nOur Master Brewer has just crafted a new Royal Kesar Saffron Chai! Available for fast delivery to your desk.\n\n👉 Try it today: https://www.chaichaska.co.in/shop')}
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "600", color: "#334155", cursor: "pointer" }}
                  >
                    🌟 New Arrival
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMessageText('🏢 *Corporate Desk Chai Pass*\n\nHi {name},\nGet unlimited daily fresh brewed hot tea delivered to your office desk with our Corporate Subscription plan starting @ just ₹29/cup.\n\n👉 Subscribe: https://www.chaichaska.co.in/orders')}
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "3px 8px", fontSize: "11px", fontWeight: "600", color: "#334155", cursor: "pointer" }}
                  >
                    🏢 Corporate Plan
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={bulkMessageText}
                  onChange={(e) => setBulkMessageText(e.target.value)}
                  placeholder="Write your broadcast message... (Use *bold*, _italic_, and {name} tag)"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    lineHeight: "1.4"
                  }}
                />

                <span style={{ fontSize: "11px", color: "#71717a", display: "block", marginTop: "4px" }}>
                  💡 Tip: The <code>&#123;name&#125;</code> tag will be automatically replaced with the customer&apos;s real name!
                </span>
              </div>

              {/* STEP 6: LIVE WHATSAPP SCREEN MOCKUP PREVIEW */}
              <div style={{ background: "#efeae2", padding: "16px", borderRadius: "16px", border: "1px solid #dcd7ce", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid #ded8ce", paddingBottom: "8px" }}>
                  <span style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#2c1b0d", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                    ☕
                  </span>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#111b21", display: "block" }}>Chai Chaska 🫖</strong>
                    <span style={{ fontSize: "10.5px", color: "#667781" }}>Live WhatsApp Preview</span>
                  </div>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div style={{
                  background: "#ffffff",
                  padding: "10px 12px",
                  borderRadius: "10px 10px 10px 2px",
                  maxWidth: "88%",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.13)",
                  position: "relative"
                }}>
                  {(bulkAttachedImage || bulkImageUrlInput) && (
                    <img
                      src={bulkAttachedImage ? bulkAttachedImage.dataUrl : bulkImageUrlInput}
                      alt="Preview"
                      style={{ width: "100%", maxHeight: "160px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}

                  <p style={{ margin: 0, fontSize: "12.5px", color: "#111b21", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                    {bulkMessageText ? bulkMessageText.replace(/{name}/gi, 'Rahul Sharma') : "Message content preview..."}
                  </p>

                  <div style={{ textAlign: "right", marginTop: "4px", fontSize: "10px", color: "#667781", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "3px" }}>
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ color: "#53bdeb" }}>✓✓</span>
                  </div>
                </div>
              </div>

              {/* ACTION SEND / STOP BUTTONS */}
              <div style={{ display: "flex", gap: "10px" }}>
                {!bulkSending ? (
                  <button
                    type="button"
                    onClick={handleStartBulkCampaign}
                    disabled={selectedRecipients.length === 0}
                    style={{
                      flex: 1,
                      background: selectedRecipients.length === 0 ? "#cbd5e1" : "#25D366",
                      color: "#ffffff",
                      padding: "16px 20px",
                      borderRadius: "12px",
                      border: "none",
                      fontWeight: "900",
                      fontSize: "15px",
                      cursor: selectedRecipients.length === 0 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: selectedRecipients.length > 0 ? "0 4px 16px rgba(37, 211, 102, 0.4)" : "none"
                    }}
                  >
                    <span>🚀</span> Launch Bulk Campaign ({selectedRecipients.length} Recipients)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopBulkCampaign}
                    style={{
                      flex: 1,
                      background: "#ef4444",
                      color: "#ffffff",
                      padding: "16px 20px",
                      borderRadius: "12px",
                      border: "none",
                      fontWeight: "900",
                      fontSize: "15px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    <span>⏸️</span> Stop Broadcast
                  </button>
                )}
              </div>

            </div>

          </div>

          {/* BULK SENDING PROGRESS & LOGS ACCORDION */}
          {bulkLogs.length > 0 && (
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e4e4e7", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "850", color: "#09090b" }}>
                    📊 Campaign Execution Progress
                  </h4>
                  <span style={{ fontSize: "12px", color: "#71717a" }}>
                    Processed {bulkProgress.current} of {bulkProgress.total} recipients
                  </span>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#16a34a", background: "#dcfce7", padding: "3px 10px", borderRadius: "6px" }}>
                    ✅ Delivered: {bulkProgress.success}
                  </span>
                  {bulkProgress.failed > 0 && (
                    <span style={{ fontSize: "12.5px", fontWeight: "800", color: "#dc2626", background: "#fee2e2", padding: "3px 10px", borderRadius: "6px" }}>
                      ❌ Failed: {bulkProgress.failed}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", marginBottom: "16px" }}>
                <div
                  style={{
                    width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>

              {/* Live Log Table */}
              <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "10px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Recipient</th>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Phone</th>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Category</th>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Status</th>
                      <th style={{ padding: "8px 12px", color: "#475569" }}>Timestamp / Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkLogs.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: "700", color: "#09090b" }}>{log.name}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#166534", fontWeight: "bold" }}>{log.phone}</td>
                        <td style={{ padding: "8px 12px", color: "#64748b" }}>{log.source}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {log.status === 'pending' && <span style={{ color: "#94a3b8", fontWeight: "600" }}>⏳ Pending</span>}
                          {log.status === 'sending' && <span style={{ color: "#3b82f6", fontWeight: "700" }}>🔄 Sending...</span>}
                          {log.status === 'success' && <span style={{ color: "#16a34a", fontWeight: "800" }}>✅ Sent</span>}
                          {log.status === 'error' && <span style={{ color: "#dc2626", fontWeight: "800" }}>❌ Failed</span>}
                        </td>
                        <td style={{ padding: "8px 12px", color: log.error ? "#dc2626" : "#64748b", fontSize: "11.5px" }}>
                          {log.error ? log.error : (log.time || '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CREDENTIALS & API SETTINGS */}
      {/* ========================================================================= */}
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
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d4d4d8", fontSize: "13px", boxSizing: "border-box" }}
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
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d4d4d8", fontSize: "13px", boxSizing: "border-box" }}
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
                  style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #d4d4d8", fontSize: "13px", boxSizing: "border-box" }}
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
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d4d4d8", fontSize: "13px", boxSizing: "border-box" }}
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
