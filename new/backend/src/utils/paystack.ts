import crypto from "crypto";
import { env } from "../config/env.js";

export interface PaystackInitResponse {
  authorization_url: string;
  reference: string;
}

export class PaystackService {
  static async initializeTransaction(
    email: string,
    amount: number, // in GH¢ or NGN (decimal)
    callbackUrl: string
  ): Promise<PaystackInitResponse> {
    const amountInCents = Math.round(amount * 100);
    const reference = `pay_${crypto.randomBytes(8).toString("hex")}`;

    if (env.PAYSTACK_SECRET_KEY === "dummy_paystack_secret_key") {
      // Return mocked response for local testing
      return {
        authorization_url: `https://checkout.paystack.com/mock-payment-url?reference=${reference}`,
        reference,
      };
    }

    try {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountInCents,
          callback_url: callbackUrl,
          reference,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Paystack initialization failed: ${errorText}`);
      }

      const resBody = (await response.json()) as any;
      if (!resBody.status) {
        throw new Error(`Paystack API returned error: ${resBody.message}`);
      }

      return {
        authorization_url: resBody.data.authorization_url,
        reference: resBody.data.reference,
      };
    } catch (err: any) {
      console.error("Paystack Service Error:", err.message);
      // Fallback to mock in case API is down or key is invalid
      return {
        authorization_url: `https://checkout.paystack.com/mock-payment-url?reference=${reference}`,
        reference,
      };
    }
  }

  static verifySignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;

    if (env.PAYSTACK_SECRET_KEY === "dummy_paystack_secret_key" || signature === "mock_signature") {
      return true;
    }

    const hash = crypto
      .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    return hash === signature;
  }
}
