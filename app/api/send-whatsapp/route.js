import fs from 'fs';
import path from 'path';
import { getWhatsAppConfig } from '@/lib/firestore';
import { DEFAULT_WHATSAPP_CONFIG, cleanPhoneForApi } from '@/lib/whatsapp';
import { getProductMeta } from '@/lib/productMeta';

export const dynamic = 'force-dynamic';

function getPaymentQrBase64() {
  try {
    const qrPath = path.join(process.cwd(), 'public', 'chaiqr.jpeg');
    if (fs.existsSync(qrPath)) {
      const fileBuf = fs.readFileSync(qrPath);
      return `data:image/jpeg;base64,${fileBuf.toString('base64')}`;
    }
  } catch (e) {
    console.error('Error reading chaiqr.jpeg:', e);
  }
  return null;
}

function formatPaymentQrCaption({ template, name, displayOrderId, amountStr }) {
  const defaultCaption = `💳 *Scan & Pay via UPI | Chai Chaska*

Hi *{name}*,
Please scan the QR code above with any UPI app (Paytm / Google Pay / PhonePe / BHIM) to complete your payment of *{amount}* for order *{orderId}*.

📱 *Instant UPI Payment*
UPI ID: paytm.s2splxe@pty

After paying, our brewmaster will update your order status to *Paid*. Thank you! 🫖✨`;

  const cap = template || defaultCaption;
  return cap
    .replace(/{name}/g, name || 'Customer')
    .replace(/{orderId}/g, displayOrderId || 'ORD')
    .replace(/{amount}/g, amountStr || '');
}

function schedulePaymentQrDispatch({ formattedTo, name, displayOrderId, amountStr, config, delaySec = 15 }) {
  const qrDedupeKey = `${formattedTo}-${displayOrderId}-payment-qr`;
  if (!global._waRecentDispatches) {
    global._waRecentDispatches = new Map();
  }
  if (global._waRecentDispatches.has(qrDedupeKey)) {
    return;
  }
  global._waRecentDispatches.set(qrDedupeKey, Date.now());

  setTimeout(async () => {
    try {
      const qrBase64 = getPaymentQrBase64();
      if (!qrBase64) {
        console.warn('Payment QR image not found in public/chaiqr.jpeg');
        return;
      }

      const caption = formatPaymentQrCaption({
        template: config.paymentQrCaption,
        name,
        displayOrderId,
        amountStr
      });

      const baseUrl = (config.baseUrl || DEFAULT_WHATSAPP_CONFIG.baseUrl).replace(/\/+$/, '');
      const instance = config.instance || DEFAULT_WHATSAPP_CONFIG.instance;
      const apiKey = config.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey;

      const mediaUrl = `${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`;
      const res = await fetch(mediaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({
          number: formattedTo,
          mediatype: 'image',
          mimetype: 'image/jpeg',
          media: qrBase64,
          caption: caption,
          fileName: 'chai_chaska_payment_qr.jpg'
        })
      });

      console.log(`[WhatsApp] Auto-sent payment QR to ${formattedTo} for ${displayOrderId} after ${delaySec}s delay. Status: ${res.status}`);
    } catch (err) {
      console.error('[WhatsApp] Delayed payment QR dispatch failed:', err);
    }
  }, delaySec * 1000);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, to, orderId, status, customerName, totalAmount, date, items, itemsList, location, image, customMessage } = body;

    const formattedTo = cleanPhoneForApi(to);
    if (!formattedTo) {
      return Response.json({ error: 'Missing destination phone number' }, { status: 400 });
    }

    const rawId = orderId ? String(orderId).trim() : 'ORD';
    const displayOrderId = rawId.startsWith('#') ? rawId : `#${rawId}`;
    const name = customerName || 'Customer';
    const amountStr = totalAmount ? `₹${String(totalAmount).replace(/[^\d.]/g, '')}` : '';

    const config = (await getWhatsAppConfig()) || DEFAULT_WHATSAPP_CONFIG;
    const isEnabled = config?.isEnabled !== false;

    if (!isEnabled) {
      return Response.json({ error: 'WhatsApp notifications are disabled in settings' }, { status: 400 });
    }

    const baseUrl = (config.baseUrl || DEFAULT_WHATSAPP_CONFIG.baseUrl).replace(/\/+$/, '');
    const instance = config.instance || DEFAULT_WHATSAPP_CONFIG.instance;
    const apiKey = config.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey;

    const headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey
    };

    // -------------------------------------------------------------
    // ORDER AUTOMATION STATUS EVALUATION
    // -------------------------------------------------------------
    const normStatus = String(status || '').toLowerCase();
    const isOrderPlaced = !normStatus || normStatus.includes('received') || normStatus.includes('placed') || normStatus.includes('new');
    const isPreparing = normStatus.includes('prepar') || normStatus.includes('brew');
    const isDelivered = normStatus.includes('deliver') || normStatus.includes('served') || normStatus.includes('completed');

    // -------------------------------------------------------------
    // ACTION: SEND PAYMENT QR CODE (on direct action OR when order status is "Preparing")
    // -------------------------------------------------------------
    if (action === 'sendPaymentQr' || isPreparing) {
      if (config.autoSendPaymentQr === false && action !== 'sendPaymentQr') {
        return Response.json({ success: true, skipped: true, message: 'Payment QR automation is currently paused in settings.' });
      }

      // Deduplication guard for payment QR (within 15 seconds)
      if (!global._waRecentDispatches) {
        global._waRecentDispatches = new Map();
      }
      const dedupeKey = `${formattedTo}-${displayOrderId}-payment-qr`;
      const now = Date.now();
      const lastSent = global._waRecentDispatches.get(dedupeKey);
      if (lastSent && (now - lastSent) < 15000) {
        return Response.json({ success: true, skipped: true, message: 'Duplicate payment QR throttled within 15 seconds.' });
      }
      global._waRecentDispatches.set(dedupeKey, now);

      const qrBase64 = getPaymentQrBase64();
      if (!qrBase64) {
        return Response.json({ error: 'Payment QR image file /public/chaiqr.jpeg not found on server' }, { status: 404 });
      }

      const qrCaption = formatPaymentQrCaption({
        template: config.paymentQrCaption,
        name,
        displayOrderId,
        amountStr
      });

      const mediaUrl = `${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`;
      const mediaRes = await fetch(mediaUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          number: formattedTo,
          mediatype: 'image',
          mimetype: 'image/jpeg',
          media: qrBase64,
          caption: qrCaption,
          fileName: 'chai_chaska_payment_qr.jpg'
        })
      });

      const mediaData = await mediaRes.json().catch(() => ({ success: mediaRes.ok }));
      return Response.json({ success: mediaRes.ok, status: mediaRes.status, data: mediaData, qrSent: true });
    }

    // ONLY allow Custom Messages, Order Placed (Confirmation), and Order Delivered
    // Intermediate status changes (Ready, Out for Delivery, etc.) are strictly skipped
    if (!customMessage && !isOrderPlaced && !isDelivered) {
      return Response.json({ success: true, skipped: true, message: 'Intermediate update messages disabled: only Order Placed, Preparing (Payment QR), and Order Delivered messages are sent.' });
    }

    // Deduplication guard: prevent sending identical message to same number within 15 seconds
    if (!global._waRecentDispatches) {
      global._waRecentDispatches = new Map();
    }
    const dedupeKey = `${formattedTo}-${displayOrderId}-${isDelivered ? 'delivered' : 'placed'}`;
    const now = Date.now();
    const lastSent = global._waRecentDispatches.get(dedupeKey);
    if (!customMessage && lastSent && (now - lastSent) < 15000) {
      return Response.json({ success: true, skipped: true, message: 'Duplicate message throttled within 15 seconds.' });
    }
    global._waRecentDispatches.set(dedupeKey, now);

    // Housekeeping: clean entries older than 2 minutes
    for (const [k, time] of global._waRecentDispatches.entries()) {
      if (now - time > 120000) global._waRecentDispatches.delete(k);
    }

    let message = '';
    if (customMessage) {
      message = customMessage;
    } else if (isDelivered) {
      message = `✅ *Order Delivered | Chai Chaska*

Hi *${name}*,
Thank you for ordering with Chai Chaska! Your order *${displayOrderId}* has been delivered hot & fresh! ☕✨

${amountStr ? `💰 *Total Paid:* ${amountStr}\n` : ''}⭐ *How was your Chai experience?*
Please take 10 seconds to share your review or rate your order:
👉 https://www.chaichaska.co.in/orders

Enjoy your authentic chai break! 🫖`;
    } else {
      message = `☕ *Order Confirmed | Chai Chaska*

Hi *${name}*,
Your order *${displayOrderId}* has been placed and received by our kitchen!

${items ? `📦 *Items:* ${items}\n` : ''}${location ? `📍 *Location:* ${location}\n` : ''}${amountStr ? `💰 *Total Amount:* ${amountStr}\n` : ''}🕒 *Status:* *Received & Queued* ⏳

Track your order live:
https://www.chaichaska.co.in/orders

Thank you for choosing Chai Chaska! 🫖`;
    }

    // 1. IF DELIVERED: SEND CLEAN TEXT-ONLY THANK YOU MESSAGE (NO IMAGE)
    if (isDelivered) {
      try {
        const textUrl = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const textRes = await fetch(textUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            number: formattedTo,
            text: message
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const textData = await textRes.json().catch(() => ({ success: textRes.ok }));
        return Response.json({ success: textRes.ok, status: textRes.status, data: textData, deliveredTextSent: true });
      } catch (delivErr) {
        console.warn('Delivered text WhatsApp send failed:', delivErr.message);
      }
    }

    // 2. Note: Payment QR is dispatched when order status transitions to "Preparing"
    // (Intermediate updates are suppressed until Delivered)

    // 3. SEND ORDER PLACED AUTHENTIC PRODUCT IMAGE + CAPTION
    let resolvedImage = null;
    let mimeType = 'image/jpeg';

    if (image && typeof image === 'string' && image.trim()) {
      const trimmed = image.trim();
      if (trimmed.startsWith('data:image/')) {
        resolvedImage = trimmed;
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        resolvedImage = trimmed;
      } else if (trimmed.startsWith('/')) {
        try {
          const localPath = path.join(process.cwd(), 'public', trimmed.replace(/^\/+/, ''));
          if (fs.existsSync(localPath)) {
            const ext = path.extname(localPath).toLowerCase().replace('.', '');
            mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            const fileBuf = fs.readFileSync(localPath);
            resolvedImage = `data:${mimeType};base64,${fileBuf.toString('base64')}`;
          } else {
            resolvedImage = `https://www.chaichaska.co.in${trimmed}`;
          }
        } catch (e) {
          resolvedImage = `https://www.chaichaska.co.in${trimmed}`;
        }
      }
    }

    if (!resolvedImage) {
      const primaryItemName = (Array.isArray(itemsList) && itemsList[0]?.name) || (typeof items === 'string' ? items.split(',')[0].replace(/x\d+/i, '').trim() : '') || 'Chai Chaska';
      const meta = getProductMeta(primaryItemName);
      if (meta && meta.image) {
        try {
          const localPath = path.join(process.cwd(), 'public', meta.image.replace(/^\/+/, ''));
          if (fs.existsSync(localPath)) {
            const ext = path.extname(localPath).toLowerCase().replace('.', '');
            mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            const fileBuf = fs.readFileSync(localPath);
            resolvedImage = `data:${mimeType};base64,${fileBuf.toString('base64')}`;
          } else {
            resolvedImage = `https://www.chaichaska.co.in${meta.image}`;
          }
        } catch (e) {
          resolvedImage = `https://www.chaichaska.co.in${meta.image}`;
        }
      }
    }

    if (!resolvedImage) {
      try {
        const defaultPath = path.join(process.cwd(), 'public', 'products', 'chai-chaska.jpg');
        if (fs.existsSync(defaultPath)) {
          const fileBuf = fs.readFileSync(defaultPath);
          resolvedImage = `data:image/jpeg;base64,${fileBuf.toString('base64')}`;
        }
      } catch (e) {}
    }

    if (resolvedImage && config.mode !== 'local') {
      try {
        const mediaUrl = `${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const mediaRes = await fetch(mediaUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            number: formattedTo,
            mediatype: 'image',
            mimetype: mimeType,
            media: resolvedImage,
            caption: message,
            fileName: 'chai_chaska_order.jpg'
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (mediaRes.ok) {
          const mediaData = await mediaRes.json().catch(() => ({ success: true }));
          return Response.json({ success: true, status: mediaRes.status, data: mediaData, mediaSent: true, paymentQrScheduled: isOrderPlaced });
        }
      } catch (mediaErr) {
        console.warn('Media send failed, falling back to text message:', mediaErr.message);
      }
    }

    // 4. FALLBACK TO PLAIN TEXT
    const targetUrl = config.mode === 'custom' && config.apiUrl
      ? config.apiUrl
      : (config.mode === 'local' ? 'http://127.0.0.1:3001/send-message' : `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        number: formattedTo,
        text: message
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const data = await res.json().catch(async () => {
      const t = await res.text();
      return { raw: t };
    });

    return Response.json({ success: res.ok, status: res.status, data, mediaSent: false, paymentQrScheduled: isOrderPlaced });
  } catch (err) {
    console.error('Failed to dispatch WhatsApp order update:', err);
    return Response.json({ error: 'Failed to dispatch WhatsApp order update', details: err.message }, { status: 500 });
  }
}
