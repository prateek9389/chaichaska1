export async function POST(req) {
  const { to, orderId, status, customerName, totalAmount, date } = await req.json();

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to, // "91XXXXXXXXXX" format
        type: "template",
        template: {
          name: "jaspers_market_plain_text_v1", 
          language: { code: "en_US" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: customerName || "Customer" },
              { type: "text", text: orderId || "ORD-0000" },
              { type: "text", text: totalAmount ? String(totalAmount) : "N/A" },
              { type: "text", text: date || "Today" }
            ]
          }]
        },
      }),
    }
  );

  const data = await res.json();
  return Response.json(data);
}
