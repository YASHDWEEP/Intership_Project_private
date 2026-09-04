import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

export const getRazorpayKeyId = (): string => {
  return process.env.RAZORPAY_KEY_ID || 'rzp_test_cabmitra2026';
};

export const getRazorpayKeySecret = (): string => {
  return process.env.RAZORPAY_KEY_SECRET || 'cabmitra_razorpay_secret_key_2026';
};

export const getRazorpayWebhookSecret = (): string => {
  return process.env.RAZORPAY_WEBHOOK_SECRET || 'cabmitra_webhook_secret_2026';
};

export const getRazorpayInstance = (): Razorpay => {
  const key_id = getRazorpayKeyId();
  const key_secret = getRazorpayKeySecret();
  return new Razorpay({
    key_id,
    key_secret,
  });
};

// Export dynamic proxy / instance for backwards compatibility
export const razorpayInstance = new Proxy({} as Razorpay, {
  get(_target, prop) {
    const instance = getRazorpayInstance();
    const val = (instance as any)[prop];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});
