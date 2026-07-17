import { NextResponse } from "next/server";
import { createOrder, addUserTransaction } from "@/lib/firestore";

export async function POST(req) {
  try {
    const body = await req.json();
    const { amount, customer_id, customer_phone, customer_name, customer_email, order_meta, type, firebase_uid } = body;

    const order_id = `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const host = req.headers.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const payload = {
      order_id,
      order_amount: typeof amount === "string" ? parseFloat(amount) : amount,
      order_currency: "INR",
      customer_details: {
        customer_id: customer_id ? String(customer_id).replace(/[^a-zA-Z0-9_-]/g, "") : `guest_${Date.now()}`,
        customer_phone: customer_phone || "9999999999",
        customer_name: customer_name || "Guest User",
        customer_email: customer_email || "guest@example.com"
      },
      order_meta: {
        return_url: `${baseUrl}/api/cashfree/verify?order_id=${order_id}&type=${type}&uid=${firebase_uid || ""}`,
        notify_url: `${baseUrl}/api/cashfree/webhook`,
        payment_methods: "cc,dc,ccc,ppc,nb,upi,paypal,emi,paylater"
      }
    };

    const url = process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" 
      ? "https://api.cashfree.com/pg/orders" 
      : "https://sandbox.cashfree.com/pg/orders";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Cashfree API Error payload:", JSON.stringify(payload, null, 2));
      console.error("Cashfree API Error response:", JSON.stringify(data, null, 2));
      return NextResponse.json({ error: "Failed to create order", details: data }, { status: 500 });
    }

    // Save initial transaction pending record
    if (type === "checkout") {
       const newOrderData = {
         ...order_meta,
         status: "Pending Payment",
         cashfree_order_id: order_id
       };
       // Store in firestore with the pending status
       await createOrder({ ...newOrderData, orderId: order_id });
    } else if (type === "wallet" && firebase_uid) {
       await addUserTransaction(firebase_uid, {
         id: order_id, // we use order_id as txId
         desc: `Wallet Recharge (Pending)`,
         type: "credit",
         coins: order_meta.coins || 0,
         amount_inr: amount,
         date: new Date().toISOString().split("T")[0],
         status: "Pending",
         cashfree_order_id: order_id
       });
    }

    return NextResponse.json({
      payment_session_id: data.payment_session_id,
      order_id: data.order_id
    });
  } catch (error) {
    console.error("Cashfree Order Creation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
