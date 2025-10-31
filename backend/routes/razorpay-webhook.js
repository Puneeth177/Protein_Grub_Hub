const express = require('express');
const router = express.Router();
const razorpayService = require('../services/razorpay.service');
const Payment = require('../models/payment.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Cart = require('../models/cart.model');

// Razorpay sends JSON but signature verification requires the raw body
router.post('/', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.get('x-razorpay-signature') || req.get('X-Razorpay-Signature');
    const rawBody = req.body; // Buffer

    if (!signature || !razorpayService.verifyWebhook(rawBody, signature)) {
      console.error('Razorpay webhook signature validation failed');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());
    const { event: type, payload } = event;

    if (type === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      const rzpOrderId = paymentEntity.order_id;

      const payment = await Payment.findOne({ razorpay_order_id: rzpOrderId });
      if (!payment) {
        console.warn('Payment not found for razorpay_order_id:', rzpOrderId);
        return res.status(200).send('ok');
      }

      payment.razorpay_payment_id = paymentEntity.id;
      payment.status = 'succeeded';
      await payment.save();

      const order = await Order.findById(payment.orderId);
      if (order) {
        order.status = 'completed';
        if (order.payment) order.payment.status = 'completed';
        await order.save();

        // Optionally send email here if service is available
        // Clear user's cart after successful payment
        try {
          await Cart.updateOne({ userId: payment.userId }, { $set: { items: [], subtotal: 0, total: 0 } });
        } catch (e) {
          console.warn('Cart clear after Razorpay success failed (non-fatal):', e.message);
        }
      }

      console.log('Razorpay payment captured and order completed:', payment.orderId);
      return res.status(200).send('ok');
    }

    if (type === 'payment.failed') {
      const paymentEntity = payload.payment.entity;
      const rzpOrderId = paymentEntity.order_id;
      const payment = await Payment.findOne({ razorpay_order_id: rzpOrderId });
      if (payment) {
        payment.status = 'failed';
        await payment.save();
        const order = await Order.findById(payment.orderId);
        if (order) {
          order.status = 'cancelled';
          if (order.payment) order.payment.status = 'failed';
          await order.save();
        }
      }
      console.log('Razorpay payment failed for order:', rzpOrderId);
      return res.status(200).send('ok');
    }

    // Acknowledge other events
    console.log('Unhandled Razorpay event:', type);
    return res.status(200).send('ok');
  } catch (err) {
    console.error('Razorpay webhook error:', err);
    return res.status(500).send('server error');
  }
});

module.exports = router;
