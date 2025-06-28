import express from 'express';
import { auth } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { initiateTelebirrPayment, verifyTelebirrPayment } from '../config/payment.js';
import { sendEmail, emailTemplates } from '../config/email.js';

const router = express.Router();

// Initiate payment
router.post('/initiate', auth, async (req, res) => {
  try {
    const { plan, billingCycle, paymentMethod } = req.body;
    
    // Validate plan and billing cycle
    if (!['starter', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    // Calculate amount based on plan and billing cycle
    const prices = {
      starter: { monthly: 99, yearly: 990 },
      premium: { monthly: 249, yearly: 2490 }
    };
    const amount = prices[plan][billingCycle];

    // Create payment record
    const payment = new Payment({
      userId: req.user.userId,
      amount,
      plan,
      billingCycle,
      paymentMethod,
      status: 'pending'
    });
    await payment.save();

    let paymentResponse;
    if (paymentMethod === 'telebirr') {
      paymentResponse = await initiateTelebirrPayment({
        orderId: payment.orderId,
        amount: payment.amount,
        planName: `${plan} Plan (${billingCycle})`
      });
    } else {
      throw new Error('Payment method not supported');
    }

    res.json({
      paymentId: payment._id,
      orderId: payment.orderId,
      ...paymentResponse
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// Payment verification webhook
router.post('/telebirr/notify', async (req, res) => {
  try {
    const { transactionId, orderId, status } = req.body;

    // Verify the payment with Telebirr
    const verificationResult = await verifyTelebirrPayment(transactionId);
    
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const user = await User.findById(payment.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (verificationResult.status === 'SUCCESS') {
      payment.status = 'completed';
      payment.completedAt = new Date();
      payment.transactionId = transactionId;
      payment.paymentDetails = verificationResult;
      await payment.save();

      // Update user's plan
      const nextBillingDate = new Date(Date.now() + (payment.billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000);
      await User.findByIdAndUpdate(payment.userId, {
        plan: payment.plan,
        planDetails: {
          startDate: new Date(),
          nextBillingDate,
          status: 'active',
          paymentMethod: payment.paymentMethod
        }
      });

      // Send success email
      await sendEmail({
        to: user.email,
        ...emailTemplates.paymentSuccess(user.username, payment.plan, payment.amount)
      });

      // Schedule renewal reminder email (3 days before)
      const reminderDate = new Date(nextBillingDate);
      reminderDate.setDate(reminderDate.getDate() - 3);
      setTimeout(async () => {
        await sendEmail({
          to: user.email,
          ...emailTemplates.subscriptionRenewal(
            user.username,
            payment.plan,
            payment.amount,
            nextBillingDate
          )
        });
      }, reminderDate.getTime() - Date.now());

    } else {
      payment.status = 'failed';
      payment.errorDetails = verificationResult;
      await payment.save();

      // Send failure email
      await sendEmail({
        to: user.email,
        ...emailTemplates.paymentFailed(user.username, payment.plan, payment.amount)
      });
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: 'Failed to process payment notification' });
  }
});

// Get payment status
router.get('/status/:paymentId', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      userId: req.user.userId
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(payments);
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

export default router; 