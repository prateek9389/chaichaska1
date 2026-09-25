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
    const res = await fetch("http://127.0.0.1:3001/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        number: to, 
        text: message 
      }),
    });

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error("Failed to connect to WhatsApp API:", err);
    return Response.json({ error: "Failed to send message", details: err.message }, { status: 500 });
  }
}

