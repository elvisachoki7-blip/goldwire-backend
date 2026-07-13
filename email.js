const nodemailer = require('nodemailer');

// Configure via .env — works with Gmail SMTP, Resend SMTP, SendGrid SMTP,
// or any standard SMTP provider. See .env.example.
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, html }) {
  const transport = getTransport();
  if (!transport) {
    console.log('[email:skipped — no SMTP configured]', { to, subject });
    return { skipped: true };
  }
  return transport.sendMail({
    from: process.env.SMTP_FROM || '"GOLDWIRE Signals" <signals@goldwire.example>',
    to,
    subject,
    html,
  });
}

function signalEmailHtml(signal) {
  const dir = signal.direction.toUpperCase();
  const color = dir === 'BUY' ? '#0f9d58' : '#e63946';
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
    <div style="background:#14110f; padding: 20px 24px; border-radius: 12px 12px 0 0;">
      <span style="color:#e8a317; font-family: monospace; font-size: 12px; letter-spacing: 1px;">GOLDWIRE SIGNAL</span>
    </div>
    <div style="border: 2px solid #14110f; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
      <h2 style="margin: 0 0 4px; font-size: 22px;">
        ${signal.instrument} <span style="color:${color};">${dir}</span>
      </h2>
      <table style="width:100%; margin-top: 16px; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding:6px 0; color:#666;">Entry</td><td style="padding:6px 0; text-align:right; font-family:monospace;">${signal.entry}</td></tr>
        <tr><td style="padding:6px 0; color:#666;">Stop loss</td><td style="padding:6px 0; text-align:right; font-family:monospace; color:#e63946;">${signal.stop_loss}</td></tr>
        <tr><td style="padding:6px 0; color:#666;">Take profit</td><td style="padding:6px 0; text-align:right; font-family:monospace; color:#0f9d58;">${signal.take_profit}</td></tr>
      </table>
      ${signal.note ? `<p style="margin-top:16px; font-size:13.5px; color:#444;">${signal.note}</p>` : ''}
      <p style="margin-top:20px; font-size:11.5px; color:#999; line-height:1.5;">
        Not financial advice. Trading gold and index CFDs carries a high level of risk. Only trade with capital you can afford to lose.
      </p>
    </div>
  </div>`;
}

module.exports = { sendMail, signalEmailHtml };
