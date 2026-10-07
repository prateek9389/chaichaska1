import fs from 'fs';
import path from 'path';
import { getWhatsAppConfig } from '@/lib/firestore';
import { DEFAULT_WHATSAPP_CONFIG, cleanPhoneForApi } from '@/lib/whatsapp';
import { generateInvoicePdfBuffer } from '@/lib/generateInvoicePdf';
import { getProductMeta } from '@/lib/productMeta';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { to, orderId, status, customerName, totalAmount, date, items, itemsList, location, image, paymentMethod, paymentStatus, customMessage } = await req.json();

    const formattedTo = cleanPhoneForApi(to);
    if (!formattedTo) {
      return Response.json({ error: 'Missing destination phone number' }, { status: 400 });
    }

    const rawId = orderId ? String(orderId).trim() : 'ORD';
    const displayOrderId = rawId.startsWith('#') ? rawId : `#${rawId}`;
    const name = customerName || 'Customer';
    const amountStr = totalAmount ? `₹${String(totalAmount).replace(/[^\d.]/g, '')}` : '';

    let message = '';
    const normStatus = String(status || '').toLowerCase();
    const isDelivered = normStatus.includes('deliver') || normStatus.includes('served') || normStatus.includes('completed');

    if (customMessage) {
      message = customMessage;
    } else if (normStatus.includes('order_updated') || normStatus.includes('items updated') || normStatus.includes('modified') || normStatus.includes('item updated')) {
      message = `🔔 *Order Updated | Chai Chaska*

Hi *${name}*,
Your order *${displayOrderId}* has been updated by our team!

${items ? `📦 *Updated Items:* ${items}\n` : ''}${amountStr ? `💰 *New Total Amount:* ${amountStr}\n` : ''}🕒 *Status:* *${status || 'Updated'}*

Track your order live:
https://www.chaichaska.co.in/orders

Thank you for choosing Chai Chaska! 🫖`;
    } else if (normStatus.includes('received') || normStatus.includes('placed')) {
      message = `☕ *Order Confirmed | Chai Chaska*

Hi *${name}*,
Your order *${displayOrderId}* has been placed and received by our kitchen!

${items ? `📦 *Items:* ${items}\n` : ''}${location ? `📍 *Location:* ${location}\n` : ''}${amountStr ? `💰 *Total Amount:* ${amountStr}\n` : ''}🕒 *Status:* *Received & Queued* ⏳

Track your order live:
https://www.chaichaska.co.in/orders

Thank you for choosing Chai Chaska! 🫖`;
    } else if (normStatus.includes('prepar') || normStatus.includes('brew')) {
      message = `🔥 *Your Chai is Brewing | Chai Chaska*

Hi *${name}*,
Great news! Our Brewmaster has started preparing your fresh hot tea for order *${displayOrderId}*! 🫖

${items ? `📦 *Items:* ${items}\n` : ''}🕒 *Status:* *Freshly Brewing on Stove* 🔥
⏱️ *Estimated Window:* ~4-5 Mins

Track your order live:
https://www.chaichaska.co.in/orders`;
    } else if (normStatus.includes('delivery') || normStatus.includes('shipped') || normStatus.includes('out')) {
      message = `🚀 *Out for Delivery | Chai Chaska*

Hi *${name}*,
Your order *${displayOrderId}* is ready and our runner is delivering it to your desk right now! 🏃💨

${location ? `📍 *Destination:* ${location}\n` : ''}🕒 *Status:* *Out for Delivery* 🚚

Get ready for a refreshing chai break! ☕`;
    } else if (isDelivered) {
      message = `✅ *Order Delivered | Chai Chaska*

Hi *${name}*,
Your Chai Chaska order *${displayOrderId}* has been served hot & fresh at your desk! ☕✨

${amountStr ? `💰 *Total Paid:* ${amountStr}\n` : ''}📄 *Your Official Tax Invoice is attached above.*

⭐ *How was your Chai experience?*
Please take 10 seconds to share your review or rate your order:
👉 https://www.chaichaska.co.in/orders

Enjoy your authentic chai break! 🫖`;
    } else if (normStatus.includes('cancel')) {
      message = `❌ *Order Cancelled | Chai Chaska*

Hi *${name}*,
Your order *${displayOrderId}* has been marked as *Cancelled*.

If you need any assistance, please contact support or re-order at:
https://www.chaichaska.co.in/shop`;
    } else {
      message = `☕ *Order Update | Chai Chaska*

Hi *${name}*,
Your order *${displayOrderId}* status has been updated:
📍 *Current Status:* *${status || 'Updated'}*
${amountStr ? `💰 *Total Amount:* ${amountStr}\n` : ''}
Track live: https://www.chaichaska.co.in/orders

Thank you for choosing Chai Chaska!`;
    }

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

    // 1. IF DELIVERED: GENERATE AND SEND BEAUTIFUL PDF INVOICE
    if (isDelivered && config.mode !== 'local') {
      try {
        const orderForPdf = {
          orderId: displayOrderId,
          customer: name,
          phone: formattedTo,
          office: location || 'Desk Delivery',
          total: amountStr || totalAmount || '₹0',
          item: items || 'Chai Chaska Selection',
          itemsList: itemsList || [],
          paymentMethod: paymentMethod || 'Cash on Delivery',
          paymentStatus: paymentStatus || 'Paid',
          createdAt: date ? new Date(date).getTime() : Date.now()
        };

        const pdfBuffer = await generateInvoicePdfBuffer(orderForPdf);
        const base64Pdf = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

        const mediaUrl = `${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const invoiceRes = await fetch(mediaUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            number: formattedTo,
            mediatype: 'document',
            mimetype: 'application/pdf',
            media: base64Pdf,
            caption: message,
            fileName: `ChaiChaska_Invoice_${displayOrderId.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (invoiceRes.ok) {
          const invoiceData = await invoiceRes.json().catch(() => ({ success: true }));
          return Response.json({ success: true, status: invoiceRes.status, data: invoiceData, invoicePdfSent: true });
        }
      } catch (pdfErr) {
        console.warn('PDF Invoice send failed, falling back to standard notification:', pdfErr.message);
      }
    }

    // 2. IF NOT DELIVERED: SEND AUTHENTIC PRODUCT IMAGE + CAPTION
    let resolvedImage = null;
    let mimeType = 'image/jpeg';

    // A. If image is passed, check if it's data URI, http URL, or local public path
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

    // B. If not resolved yet, resolve from items / itemsList using productMeta
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

    // C. Default fallback to authentic Chai Chaska image from local disk
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
          return Response.json({ success: true, status: mediaRes.status, data: mediaData, mediaSent: true });
        }
      } catch (mediaErr) {
        console.warn('Media send failed, falling back to text message:', mediaErr.message);
      }
    }

    // 3. FALLBACK TO PLAIN TEXT
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

    return Response.json({ success: res.ok, status: res.status, data, mediaSent: false });
  } catch (err) {
    console.error('Failed to dispatch WhatsApp order update:', err);
    return Response.json({ error: 'Failed to dispatch WhatsApp order update', details: err.message }, { status: 500 });
  }
}
