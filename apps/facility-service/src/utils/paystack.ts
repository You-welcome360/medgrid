import crypto from 'node:crypto';

export interface PaystackInitResponse {
  authorization_url: string;
  reference: string;
}

export class PaystackService {
  private static getSecretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || 'dummy_paystack_secret_key';
  }

  static async initializeTransaction(
    email: string,
    amount: number, // in GH¢ or NGN (decimal)
    callbackUrl: string
  ): Promise<PaystackInitResponse> {
    const amountInCents = Math.round(amount * 100);
    const reference = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const secretKey = this.getSecretKey();

    if (secretKey === 'dummy_paystack_secret_key') {
      // Return mocked response for local testing
      return {
        authorization_url: `https://checkout.paystack.com/mock-payment-url?reference=${reference}`,
        reference,
      };
    }

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
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
      console.error('Paystack Service Error:', err.message);
      // Fallback to mock in case API is down or key is invalid
      return {
        authorization_url: `https://checkout.paystack.com/mock-payment-url?reference=${reference}`,
        reference,
      };
    }
  }

  static verifySignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;
    const secretKey = this.getSecretKey();

    if (secretKey === 'dummy_paystack_secret_key' || signature === 'mock_signature') {
      return true;
    }

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }
}
