import { NextResponse } from "next/server";
const PaytmChecksum = require("paytmchecksum");

export async function POST(request) {
  try {
    const formData = await request.formData();
    const paytmParams = {};
    
    for (const [key, value] of formData.entries()) {
      paytmParams[key] = value;
    }

    const paytmChecksum = paytmParams.CHECKSUMHASH;
    delete paytmParams.CHECKSUMHASH;

    const isVerifySignature = PaytmChecksum.verifySignature(paytmParams, process.env.PAYTM_MERCHANT_KEY, paytmChecksum);
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    if (isVerifySignature) {
      if (paytmParams.STATUS === "TXN_SUCCESS") {
        try {
          const { updateOrder } = await import("@/lib/firestore");
          await updateOrder(paytmParams.ORDERID, { status: "Received", payment_status: "PAID" });
        } catch (dbErr) {
          console.error("Failed to update order status in Firebase", dbErr);
        }
        return NextResponse.redirect(`${baseUrl}/payment-success?order_id=${paytmParams.ORDERID}`);
      } else {
        // Transaction Failed
        return NextResponse.redirect(`${baseUrl}/checkout?error=PaymentFailed`);
      }
    } else {
      console.log("Checksum Mismatched");
      return NextResponse.redirect(`${baseUrl}/checkout?error=ChecksumMismatch`);
    }
  } catch (error) {
    console.error("Paytm Verify Error:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout?error=ServerError`);
  }
}
