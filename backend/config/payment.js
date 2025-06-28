import axios from 'axios';
import crypto from 'crypto';

const TELEBIRR_CONFIG = {
  appId: process.env.TELEBIRR_APP_ID,
  appKey: process.env.TELEBIRR_APP_KEY,
  shortCode: process.env.TELEBIRR_SHORT_CODE,
  publicKey: process.env.TELEBIRR_PUBLIC_KEY,
  notifyUrl: process.env.TELEBIRR_NOTIFY_URL || 'http://localhost:3001/api/payments/telebirr/notify',
  returnUrl: process.env.TELEBIRR_RETURN_URL || 'http://localhost:5173/payment/complete',
  timeout: 300, // 5 minutes timeout
  baseUrl: process.env.TELEBIRR_API_URL || 'https://api.telebirr.com'
};

// Utility function to encrypt payload using Telebirr's public key
const encryptPayload = (data) => {
  try {
    const publicKey = Buffer.from(TELEBIRR_CONFIG.publicKey, 'base64');
    const dataString = JSON.stringify(data);
    const encryptedData = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      Buffer.from(dataString)
    );
    return encryptedData.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt payment data');
  }
};

// Initialize payment with Telebirr
export const initiateTelebirrPayment = async (paymentData) => {
  try {
    const payload = {
      appId: TELEBIRR_CONFIG.appId,
      shortCode: TELEBIRR_CONFIG.shortCode,
      nonce: Math.random().toString(36).substring(2),
      notifyUrl: TELEBIRR_CONFIG.notifyUrl,
      returnUrl: TELEBIRR_CONFIG.returnUrl,
      timestamp: Date.now(),
      outTradeNo: paymentData.orderId,
      subject: paymentData.planName,
      totalAmount: paymentData.amount,
      timeoutExpress: TELEBIRR_CONFIG.timeout,
      receiveName: 'Credit Score Dashboard'
    };

    const encryptedPayload = encryptPayload(payload);

    const response = await axios.post(`${TELEBIRR_CONFIG.baseUrl}/payment/initiate`, {
      appId: TELEBIRR_CONFIG.appId,
      encryptedPayload
    });

    return response.data;
  } catch (error) {
    console.error('Telebirr payment initiation error:', error);
    throw new Error('Failed to initiate payment');
  }
};

// Verify Telebirr payment
export const verifyTelebirrPayment = async (transactionId) => {
  try {
    const payload = {
      appId: TELEBIRR_CONFIG.appId,
      shortCode: TELEBIRR_CONFIG.shortCode,
      nonce: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      transactionId
    };

    const encryptedPayload = encryptPayload(payload);

    const response = await axios.post(`${TELEBIRR_CONFIG.baseUrl}/payment/verify`, {
      appId: TELEBIRR_CONFIG.appId,
      encryptedPayload
    });

    return response.data;
  } catch (error) {
    console.error('Telebirr payment verification error:', error);
    throw new Error('Failed to verify payment');
  }
};

export default {
  TELEBIRR_CONFIG,
  initiateTelebirrPayment,
  verifyTelebirrPayment
}; 