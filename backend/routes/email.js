// routes/email.js
const express = require('express');
const router = express.Router();
const { sendMail } = require('../services/email/emailService');
const templates = require('../services/email/templates');

// Example: POST /api/email/test-order
// body: { to, firstName, orderId, items:[{name,qty,price}], total, deliveryDate, orderUrl, cancelWindowHours }
router.post('/test-order', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: 'to is required' });

    const vars = {
      firstName: req.body.firstName || 'there',
      orderId: req.body.orderId || '12345',
      items: req.body.items || [{ name: 'Grilled Chicken Bowl', qty: 1, price: '$9.99' }],
      total: req.body.total || '$9.99',
      deliveryDate: req.body.deliveryDate || 'Tomorrow',
      orderUrl: req.body.orderUrl || 'http://localhost:4200/orders/12345',
      cancelWindowHours: req.body.cancelWindowHours || 2,
    };

    const subject = templates.orderConfirmation.subject(vars);
    const html = templates.orderConfirmation.html(vars);
    const text = templates.orderConfirmation.text(vars);

    const info = await sendMail({ to, subject, html, text });
    res.json({ message: 'Email sent', id: info.messageId, preview: info.previewUrl });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
});

// Example: POST /api/email/otp  body: { to, firstName, otpCode, otpExpiryMinutes }
router.post('/otp', async (req, res) => {
  try {
    const { to, firstName, otpCode, otpExpiryMinutes } = req.body;
    if (!to || !otpCode) return res.status(400).json({ message: 'to and otpCode required' });

    const vars = { firstName: firstName || 'there', otpCode, otpExpiryMinutes: otpExpiryMinutes || 10 };
    const subject = templates.otp.subject;
    const html = templates.otp.html(vars);
    const text = templates.otp.text(vars);
    const info = await sendMail({ to, subject, html, text });
    res.json({ message: 'OTP email sent', id: info.messageId });
  } catch (err) {
    console.error('OTP email error:', err);
    res.status(500).json({ message: 'Failed to send OTP email', error: err.message });
  }
});

// Example: POST /api/email/welcome  body: { to, firstName, loginUrl }
router.post('/welcome', async (req, res) => {
  try {
    const { to, firstName, loginUrl } = req.body;
    if (!to || !loginUrl) return res.status(400).json({ message: 'to and loginUrl required' });

    const vars = { firstName: firstName || 'there', loginUrl };
    const subject = templates.welcome.subject;
    const html = templates.welcome.html(vars);
    const text = templates.welcome.text(vars);
    const info = await sendMail({ to, subject, html, text });
    res.json({ message: 'Welcome email sent', id: info.messageId });
  } catch (err) {
    console.error('Welcome email error:', err);
    res.status(500).json({ message: 'Failed to send welcome email', error: err.message });
  }
});

module.exports = router;