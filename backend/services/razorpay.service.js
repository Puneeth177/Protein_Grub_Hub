const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn('Razorpay keys are not set. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    this.instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  /**
   * Create a Razorpay order
   * @param {{amount:number,currency?:string,receipt:string,notes?:any}} params
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    // Razorpay expects amount in the smallest currency unit
    const options = {
      amount: Math.round(amount * 100),
      currency: currency.toUpperCase(),
      receipt,
      notes
    };
    return await this.instance.orders.create(options);
  }

  /**
   * Verify webhook signature
   * @param {Buffer} rawBody
   * @param {string} signature Header X-Razorpay-Signature
   * @returns {boolean}
   */
  verifyWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
  }

  /**
   * Verify payment signature from checkout success (optional)
   * @param {{razorpay_order_id:string, razorpay_payment_id:string, razorpay_signature:string}} payload
   */
  verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    return expected === razorpay_signature;
  }
}

module.exports = new RazorpayService();
