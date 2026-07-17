import { NextResponse } from "next/server";
import { updateOrder, updateUserCoins } from "@/lib/firestore";
import { db } from "@/lib/firestore";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get("order_id");
    const type = searchParams.get("type"); // "checkout" | "wallet"
    const uid = searchParams.get("uid");

    if (!order_id) {
      return NextResponse.redirect(new URL("/payment-decline", req.url));
    }

    const url = process.env.CASHFREE_ENVIRONMENT === "PRODUCTION"
      ? `https://api.cashfree.com/pg/orders/${order_id}`
      : `https://sandbox.cashfree.com/pg/orders/${order_id}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY
      }
    });

    const data = await response.json();
    const orderStatus = data.order_status;

    if (orderStatus === "PAID") {
      if (type === "checkout") {
        // Update order status to Received/Paid
        await updateOrder(order_id, { status: "Received", payment_status: "Paid" });
      } else if (type === "wallet" && uid) {
        // Find the pending transaction and update it, and add coins
        const txRef = doc(db, "users", uid, "transactions", order_id);
        const txSnap = await getDoc(txRef);
        
        if (txSnap.exists()) {
          const txData = txSnap.data();
          if (txData.status !== "Completed") {
            // Update the transaction status
            await updateDoc(txRef, { status: "Completed", desc: "Wallet Recharge (Completed)" });
            // Update actual coins (do not add a new transaction log inside updateUserCoins since we already have one)
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            let currentCoins = 0;
            if (userSnap.exists()) {
              currentCoins = userSnap.data().coins;
              if (typeof currentCoins === 'string') currentCoins = parseFloat(currentCoins) || 0;
            }
            await updateDoc(userRef, { coins: currentCoins + txData.coins });
          }
        }
      }

      return NextResponse.redirect(new URL(`/payment-success?order_id=${order_id}&type=${type}`, req.url));
    } else {
      // Payment failed or is still pending
      if (type === "checkout") {
        await updateOrder(order_id, { status: "Failed", payment_status: "Failed" });
      } else if (type === "wallet" && uid) {
        const txRef = doc(db, "users", uid, "transactions", order_id);
        const txSnap = await getDoc(txRef);
        if (txSnap.exists()) {
          await updateDoc(txRef, { status: "Failed", desc: "Wallet Recharge (Failed)" });
        }
      }
      return NextResponse.redirect(new URL(`/payment-decline?order_id=${order_id}&type=${type}`, req.url));
    }
  } catch (error) {
    console.error("Cashfree Verification Error:", error);
    return NextResponse.redirect(new URL("/payment-decline", req.url));
  }
}
