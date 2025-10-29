// services/email/emailService.js
const nodemailer = require('nodemailer');

const {
  GMAIL_REFRESH_TOKEN,
  GOOGLE_REFRESH_TOKEN,
  GMAIL_USER,
  MAIL_FROM,
  SENDER_EMAIL,
  GOOGLE_CLIENT_ID_MAIL,
  GOOGLE_CLIENT_SECRET_MAIL,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
} = process.env;

const EFFECTIVE_USER = GMAIL_USER || SENDER_EMAIL;
const EFFECTIVE_FROM = MAIL_FROM || SENDER_EMAIL;
const EFFECTIVE_REFRESH = GMAIL_REFRESH_TOKEN || GOOGLE_REFRESH_TOKEN;
const EFFECTIVE_CLIENT_ID = GOOGLE_CLIENT_ID_MAIL || GMAIL_CLIENT_ID;
const EFFECTIVE_CLIENT_SECRET = GOOGLE_CLIENT_SECRET_MAIL || GMAIL_CLIENT_SECRET;

if (!EFFECTIVE_CLIENT_ID || !EFFECTIVE_CLIENT_SECRET || !EFFECTIVE_REFRESH || !EFFECTIVE_USER || !EFFECTIVE_FROM) {
  console.warn('[emailService] Missing Gmail OAuth2 env vars. Emails will fail until configured. Expected: (GOOGLE_CLIENT_ID_MAIL|GMAIL_CLIENT_ID), (GOOGLE_CLIENT_SECRET_MAIL|GMAIL_CLIENT_SECRET), (GMAIL_REFRESH_TOKEN|GOOGLE_REFRESH_TOKEN), (GMAIL_USER|SENDER_EMAIL), (MAIL_FROM|SENDER_EMAIL)');
}

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: EFFECTIVE_USER,
        clientId: EFFECTIVE_CLIENT_ID,
        clientSecret: EFFECTIVE_CLIENT_SECRET,
        refreshToken: EFFECTIVE_REFRESH,
      },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  const info = await t.sendMail({
    from: EFFECTIVE_FROM,
    to,
    subject,
    text,
    html,
  });
  return info;
}

module.exports = { sendMail };