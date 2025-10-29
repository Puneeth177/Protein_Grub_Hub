// services/email/templates.js
function replaceVars(str, vars) {
  return str.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

const otp = {
  subject: 'Verify your login – Protein Grub Hub',
  html: (vars) => replaceVars(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  </head>
  <body style="font-family:Inter,system-ui,Arial,Helvetica,sans-serif;margin:0;padding:0;background:#f6f8fb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
            <tr><td style="padding:20px 28px 0 28px;"><h1 style="margin:0;font-size:20px;color:#111;font-weight:600;">Protein Grub Hub</h1></td></tr>
            <tr><td style="padding:18px 28px 8px 28px;"><p style="margin:0;color:#374151;font-size:15px;line-height:1.5;">Hi <strong>{{firstName}}</strong>,</p></td></tr>
            <tr>
              <td style="padding:12px 28px;">
                <p style="margin:0 0 18px 0;color:#4b5563;font-size:15px;line-height:1.6;">Use the code below to sign in to your Protein Grub Hub account. This code expires in <strong>{{otpExpiryMinutes}} minutes</strong>.</p>
                <div style="max-width:360px;margin:10px 0;padding:18px;border-radius:8px;background:#f3f4f6;border:1px solid #e6e9ef;text-align:center;">
                  <span style="font-size:24px;letter-spacing:3px;font-weight:700;color:#111;">{{otpCode}}</span>
                </div>
                <p style="margin:12px 0 0 0;color:#6b7280;font-size:13px;line-height:1.5;">If you didn't request this, ignore this email — no changes were made to your account.</p>
              </td>
            </tr>
            <tr><td style="padding:18px 28px 28px 28px;color:#9ca3af;font-size:12px;"><p style="margin:0;">Protein Grub Hub Support<br/>support@proteingrubhub.com</p></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`, vars),
  text: (vars) => replaceVars(`Protein Grub Hub

Hi {{firstName}},

Use the code below to sign in to your Protein Grub Hub account. This code expires in {{otpExpiryMinutes}} minutes.

{{otpCode}}

If you didn't request this, ignore this email — no changes were made to your account.

Protein Grub Hub Support
support@proteingrubhub.com`, vars),
};

const welcome = {
  subject: 'Welcome to Protein Grub Hub — You\'re all set!',
  html: (vars) => replaceVars(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  </head>
  <body style="font-family:Inter,system-ui,Arial,Helvetica,sans-serif;margin:0;padding:0;background:#f6f8fb;">
    <table role="presentation" width="100%"><tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:20px 28px 0 28px;"><h1 style="margin:0;font-size:20px;color:#111;font-weight:600;">Protein Grub Hub</h1></td></tr>
        <tr><td style="padding:18px 28px 6px 28px;"><p style="margin:0;color:#374151;font-size:15px;line-height:1.5;">Hi <strong>{{firstName}}</strong>,</p></td></tr>
        <tr><td style="padding:12px 28px;">
          <p style="margin:0 0 18px 0;color:#4b5563;font-size:15px;line-height:1.6;">Welcome to Protein Grub Hub — we’re thrilled to have you. Your account is ready and you can now access personalised meal recommendations, order protein-rich meals, and track your nutrition.</p>
          <p style="margin:0 0 18px 0;color:#4b5563;font-size:15px;line-height:1.6;">Here are some quick links to get started:</p>
          <ul style="margin:0 0 16px 18px;color:#4b5563;font-size:15px;">
            <li>Complete your profile to get personalised suggestions</li>
            <li>Explore meals curated for your protein goals</li>
            <li>Check your orders anytime from the account page</li>
          </ul>
          <div style="margin-top:8px;"><a href="{{loginUrl}}" style="display:inline-block;padding:10px 16px;border-radius:8px;text-decoration:none;background:#111;color:#fff;font-weight:600;">Go to your account</a></div>
        </td></tr>
        <tr><td style="padding:18px 28px 28px 28px;color:#9ca3af;font-size:12px;"><p style="margin:0;">If you have any questions, reply to this email — we’re here to help.</p><p style="margin:8px 0 0 0;">Protein Grub Hub Support<br/>support@proteingrubhub.com</p></td></tr>
      </table>
    </td></tr></table>
  </body>
</html>`, vars),
  text: (vars) => replaceVars(`Protein Grub Hub

Hi {{firstName}},

Welcome to Protein Grub Hub — we’re thrilled to have you. Your account is ready and you can now access personalised meal recommendations, order protein-rich meals, and track your nutrition.

Quick start:
- Complete your profile to get personalised suggestions
- Explore meals curated for your protein goals
- Check your orders anytime from the account page

Open your account: {{loginUrl}}

If you have any questions, reply to this email — we’re here to help.

Protein Grub Hub Support
support@proteingrubhub.com`, vars),
};

function renderOrderItemsHtml(items) {
  return items.map(i => `
<tr>
  <td style="padding:8px 0;color:#111;font-size:14px;">${i.name}</td>
  <td align="right" style="padding:8px 0;color:#111;font-size:14px;">${i.qty}</td>
  <td align="right" style="padding:8px 0;color:#111;font-size:14px;">${i.price}</td>
</tr>`).join('');
}
function renderOrderItemsText(items) {
  return items.map(i => `- ${i.name} x${i.qty} : ${i.price}`).join('\n');
}

const orderConfirmation = {
  subject: (vars) => replaceVars('Order Confirmed — Protein Grub Hub (Order #{{orderId}})', vars),
  html: (vars) => {
    const rows = renderOrderItemsHtml(vars.items || []);
    const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:Inter,system-ui,Arial,Helvetica,sans-serif;margin:0;padding:0;background:#f6f8fb;">
<table role="presentation" width="100%"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
    <tr><td style="padding:20px 28px 0 28px;"><h1 style="margin:0;font-size:20px;color:#111;font-weight:600;">Protein Grub Hub</h1></td></tr>
    <tr><td style="padding:18px 28px 6px 28px;"><p style="margin:0;color:#374151;font-size:15px;line-height:1.5;">Hi <strong>{{firstName}}</strong>,</p></td></tr>
    <tr><td style="padding:12px 28px;">
      <p style="margin:0 0 12px 0;color:#4b5563;font-size:15px;line-height:1.6;">Thanks — we’ve confirmed your order <strong>#{{orderId}}</strong>. Here are the details:</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:12px;">
        <thead><tr>
          <th align="left" style="padding:8px 0;color:#6b7280;font-size:13px;">Item</th>
          <th align="right" style="padding:8px 0;color:#6b7280;font-size:13px;">Qty</th>
          <th align="right" style="padding:8px 0;color:#6b7280;font-size:13px;">Price</th>
        </tr></thead>
        <tbody>
          ${rows}
          <tr><td style="padding:10px 0;border-top:1px solid #eef2f6;"></td><td style="padding:10px 0;border-top:1px solid #eef2f6;"></td><td style="padding:10px 0;border-top:1px solid #eef2f6;"></td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#111;font-size:14px;">Total</td><td></td><td align="right" style="font-weight:600;color:#111;font-size:14px;">{{total}}</td></tr>
        </tbody>
      </table>
      <p style="margin:0 0 8px 0;color:#4b5563;font-size:14px;">Delivery estimate: <strong>{{deliveryDate}}</strong></p>
      <p style="margin:0 0 12px 0;color:#4b5563;font-size:14px;">You can view your order anytime: <a href="{{orderUrl}}">View order details</a></p>
      <p style="margin:0;color:#6b7280;font-size:13px;">If you need to change or cancel your order, reply to this email within the next {{cancelWindowHours}} hours.</p>
    </td></tr>
    <tr><td style="padding:18px 28px 28px 28px;color:#9ca3af;font-size:12px;"><p style="margin:0;">Protein Grub Hub Support<br/>support@proteingrubhub.com</p></td></tr>
  </table>
</td></tr></table>
</body></html>`;
    return replaceVars(html, vars);
  },
  text: (vars) => {
    const rows = renderOrderItemsText(vars.items || []);
    return replaceVars(`Protein Grub Hub

Hi {{firstName}},

Thanks — we’ve confirmed your order #{{orderId}}. Here are the details:

${rows}

Total: {{total}}
Delivery estimate: {{deliveryDate}}

View order details: {{orderUrl}}

If you need to change or cancel your order, reply to this email within the next {{cancelWindowHours}} hours.

Protein Grub Hub Support
support@proteingrubhub.com`, vars);
  },
};

const verifyEmail = {
  subject: 'Verify your email – Protein Grub Hub',
  html: (vars) => replaceVars(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="font-family:Inter,system-ui,Arial,Helvetica,sans-serif;margin:0;padding:0;background:#f6f8fb;">
<table role="presentation" width="100%"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">
    <tr><td style="padding:20px 28px 0 28px;"><h1 style="margin:0;font-size:20px;color:#111;font-weight:600;">Protein Grub Hub</h1></td></tr>
    <tr><td style="padding:18px 28px 6px 28px;"><p style="margin:0;color:#374151;font-size:15px;line-height:1.5;">Hi <strong>{{firstName}}</strong>,</p></td></tr>
    <tr><td style="padding:12px 28px;">
      <p style="margin:0 0 12px 0;color:#4b5563;font-size:15px;line-height:1.6;">Confirm your email address to activate your account.</p>
      <div style="margin-top:8px;"><a href="{{verifyUrl}}" style="display:inline-block;padding:10px 16px;border-radius:8px;text-decoration:none;background:#111;color:#fff;font-weight:600;">Verify email</a></div>
      <p style="margin:12px 0 0 0;color:#6b7280;font-size:13px;line-height:1.5;">This link expires in {{expiresInHours}} hours.</p>
    </td></tr>
    <tr><td style="padding:18px 28px 28px 28px;color:#9ca3af;font-size:12px;"><p style="margin:0;">Protein Grub Hub Support<br/>support@proteingrubhub.com</p></td></tr>
  </table>
</td></tr></table>
</body></html>`, vars),
  text: (vars) => replaceVars(`Protein Grub Hub

Hi {{firstName}},

Confirm your email address to activate your account.

Verify: {{verifyUrl}}

This link expires in {{expiresInHours}} hours.`, vars)
};

module.exports = { otp, welcome, orderConfirmation, verifyEmail };