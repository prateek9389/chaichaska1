import { NextResponse } from "next/server";
import admin from "firebase-admin";

export async function POST(req) {
  try {
    const { token, title, body, orderId, userId, data } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing FCM token" }, { status: 400 });
    }

    if (!admin.apps.length) {
      // Try to load the service account from the local file
      try {
        const serviceAccount = require("../../../service-account.json");
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (err) {
        console.error("Failed to load service-account.json. Please ensure it is present in the root 'chai' directory.", err);
        return NextResponse.json({ error: "Server missing Firebase Service Account configuration" }, { status: 500 });
      }
    }

    const message = {
      notification: {
        title: title || "Chai Chaska Update",
        body: body || "Your order status has been updated.",
      },
      data: {
        orderId: orderId || "",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        ...data
      },
      token: token,
    };

    const response = await admin.messaging().send(message);
    
    if (userId) {
      await admin.firestore().collection('notifications').add({
        userId: userId,
        title: title || "Chai Chaska Update",
        body: body || "Your order status has been updated.",
        orderId: orderId || "",
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    return NextResponse.json({ success: true, messageId: response });
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
