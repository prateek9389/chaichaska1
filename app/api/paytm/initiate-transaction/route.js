import { NextResponse } from "next/server";
const PaytmChecksum = require("paytmchecksum");

export async function POST(request) {
  try {
    const { orderId, amount, customerId, customerEmail, customerPhone } = await request.json();

    const paytmParams = {};

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    paytmParams.body = {
      "requestType": "Payment",
      "mid": process.env.PAYTM_MID,
      "websiteName": process.env.PAYTM_WEBSITE,
      "orderId": orderId,
      "callbackUrl": `${baseUrl}/api/paytm/verify`,
      "txnAmount": {
        "value": String(amount),
        "currency": "INR",
      },
      "userInfo": {
        "custId": customerId || "CUST_001",
        "email": customerEmail || "customer@example.com",
        "mobile": customerPhone || "9999999999"
      },
    };

    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), process.env.PAYTM_MERCHANT_KEY);
    
    paytmParams.head = {
      "signature": checksum
    };

    const isProduction = process.env.PAYTM_ENVIRONMENT === "PRODUCTION";
    const hostname = isProduction ? "securegw.paytm.in" : "securegw-stage.paytm.in";
    const post_data = JSON.stringify(paytmParams);

    const response = await fetch(`https://${hostname}/theia/api/v1/initiateTransaction?mid=${process.env.PAYTM_MID}&orderId=${orderId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": post_data.length
      },
      body: post_data
    });

    const data = await response.json();

    if (data.body && data.body.resultInfo && data.body.resultInfo.resultStatus === "S") {
      return NextResponse.json({ 
        txnToken: data.body.txnToken,
        orderId: orderId,
        mid: process.env.PAYTM_MID,
        environment: isProduction ? "PRODUCTION" : "STAGING"
      });
    } else {
      console.error("Paytm Initiate Error:", data);
      return NextResponse.json({ error: data.body?.resultInfo?.resultMsg || "Failed to initiate transaction" }, { status: 400 });
    }
  } catch (error) {
    console.error("Paytm Initiate Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
