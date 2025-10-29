const { sendMail } = require('./email/emailService');

class PaymentEmailService {
    async sendPaymentSuccessEmail(user, order, payment) {
        const subject = `Payment Successful - Order #${order._id}`;
        const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%); color: white; padding: 30px; text-align: center;">
                    <h1>Payment Successful!</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Hi ${user.name},</p>
                    <p>Your payment has been successfully processed.</p>
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Order Receipt</h3>
                        <p><strong>Order ID:</strong> #${order._id}</p>
                        <p><strong>Payment ID:</strong> ${payment.stripePaymentIntentId}</p>
                        <p><strong>Payment Method:</strong> ${payment.paymentMethod.toUpperCase()}</p>
                        <p><strong>Amount Paid:</strong> Rs.${payment.amount.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
        try {
            await sendMail({ to: user.email, subject, html, text: `Payment Successful! Order #${order._id}. Amount: Rs.${payment.amount}` });
            console.log(`Payment success email sent to ${user.email}`);
        } catch (error) {
            console.error('Error sending payment success email:', error);
        }
    }

    async sendPaymentFailureEmail(user, order, payment) {
        const subject = `Payment Failed - Order #${order._id}`;
        const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #ff5a52; color: white; padding: 30px; text-align: center;">
                    <h1>Payment Failed</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Hi ${user.name},</p>
                    <p>Unfortunately, your payment for Order #${order._id} could not be processed.</p>
                    <p><strong>Reason:</strong> ${payment.errorMessage || 'Payment declined'}</p>
                </div>
            </div>
        </body>
        </html>
        `;
        try {
            await sendMail({ to: user.email, subject, html });
        } catch (error) {
            console.error('Error sending payment failure email:', error);
        }
    }

    async sendRefundEmail(user, order, payment, refundAmount) {
        const subject = `Refund Processed - Order #${order._id}`;
        const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #4caf50; color: white; padding: 30px; text-align: center;">
                    <h1>Refund Processed</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Hi ${user.name},</p>
                    <p>Your refund has been successfully processed for Order #${order._id}.</p>
                    <p style="font-size: 32px; color: #4caf50; font-weight: bold;">Rs.${refundAmount.toFixed(2)}</p>
                    <p style="color: #666;">The amount will be credited within 5-7 business days.</p>
                </div>
            </div>
        </body>
        </html>
        `;
        try {
            await sendMail({ to: user.email, subject, html });
        } catch (error) {
            console.error('Error sending refund email:', error);
        }
    }
}

module.exports = new PaymentEmailService();