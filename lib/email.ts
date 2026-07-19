import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Sending from a Resend-verified domain (sammystorelogs.com) is required for
// production - until that's set up, Resend's sandbox will only deliver to
// the email address you signed up with.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'Sammy\'s Store <noreply@sammystorelogs.com>';

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured - skipping email send');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
    return { success: true, result };
  } catch (error: any) {
    console.error('Failed to send email:', error?.message || error);
    return { success: false, error: error?.message || 'Email send failed' };
  }
}

function wrapTemplate(title: string, bodyHtml: string) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 22px; font-weight: 800;">
        <span style="color: #1f2937;">SAMMY</span><span style="color: #f97316;">STORE</span>
      </span>
    </div>
    <h2 style="font-size: 18px; margin-bottom: 16px;">${title}</h2>
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">
      This is an automated message from Sammy's Store. If you didn't expect this email, you can ignore it.
    </p>
  </div>`;
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  productName: string;
  quantity: number;
  amount: number;
  orderId: string;
}) {
  const { to, productName, quantity, amount, orderId } = params;
  const html = wrapTemplate('Order Confirmed', `
    <p>Your purchase was successful.</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
      <tr><td style="padding: 6px 0; color: #6b7280;">Order ID</td><td style="padding: 6px 0; text-align: right;">${orderId}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Product</td><td style="padding: 6px 0; text-align: right;">${productName}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Quantity</td><td style="padding: 6px 0; text-align: right;">${quantity}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">Amount</td><td style="padding: 6px 0; text-align: right;">₦${amount.toLocaleString()}</td></tr>
    </table>
    <p style="margin-top: 16px;">You can view full order details in your <a href="https://sammystorelogs.com/orders">order history</a>.</p>
  `);
  return sendEmail(to, `Order Confirmed - ${productName}`, html);
}

export async function sendWalletFundedEmail(params: {
  to: string;
  amount: number;
  newBalance: number;
}) {
  const { to, amount, newBalance } = params;
  const html = wrapTemplate('Wallet Funded', `
    <p>Your wallet has been credited.</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
      <tr><td style="padding: 6px 0; color: #6b7280;">Amount Added</td><td style="padding: 6px 0; text-align: right;">₦${amount.toLocaleString()}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b7280;">New Balance</td><td style="padding: 6px 0; text-align: right;">₦${newBalance.toLocaleString()}</td></tr>
    </table>
  `);
  return sendEmail(to, 'Wallet Funded Successfully', html);
}

export async function sendTicketReplyEmail(params: {
  to: string;
  subject: string;
  message: string;
}) {
  const { to, subject, message } = params;
  const html = wrapTemplate('Support Reply', `
    <p>You have a new reply on your support ticket: <strong>${subject}</strong></p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 12px; margin-top: 12px; white-space: pre-wrap;">${message}</div>
    <p style="margin-top: 16px;">View the full conversation in your <a href="https://sammystorelogs.com/support">support ticket</a>.</p>
  `);
  return sendEmail(to, `New reply: ${subject}`, html);
}
