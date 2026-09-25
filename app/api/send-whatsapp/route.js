import { getWhatsAppConfig } from '@/lib/firestore';

export async function POST(req) {
  const { to, orderId, status, customerName, totalAmount, date } = await req.json();

  // Create the custom message (no templates needed!)
  const message = `Hi ${customerName || 'Customer'},

Your order (*${orderId || 'ORD'}*) has been updated!
Current Status: *${status || 'Updated'}*
Total Amount: ${totalAmount ? String(totalAmount) : 'N/A'}

Check your orders here: https://www.chaichaska.co.in/orders

Thank you for ordering from Chai Chaska!`;

  try {
    const config = await getWhatsAppConfig();
    const isEnabled = config?.isEnabled !== false; 
    const apiUrl = config?.apiUrl || process.env.WHATSAPP_LIVE_API_URL || 'http://127.0.0.1:3001/send-message';
    const apiKey = config?.apiKey || process.env.WHATSAPP_LIVE_API_KEY || '';

    if (!isEnabled) {
      return Response.json({ error: 'WhatsApp integration is disabled' }, { status: 400 });
    }

    const headers = {
      "Content-Type": "application/json"
    };
    if (apiKey) {
      headers["apikey"] = apiKey;
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        number: to, // Changed to "number" for Bitechez compatibility
        text: message // Changed to "text" for Bitechez compatibility
      }),
    });

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error("Failed to connect to WhatsApp API:", err);
    return Response.json({ error: "Failed to send message", details: err.message }, { status: 500 });
  }
}

