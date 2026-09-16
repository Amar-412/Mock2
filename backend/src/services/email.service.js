import nodemailer from 'nodemailer';
import config from '../config/config.js';

let transporter = null;

// Initialize transport only if Google OAuth credentials exist
if (
  config.GOOGLE_USER &&
  config.GOOGLE_CLIENT_ID &&
  config.GOOGLE_CLIENT_SECRET &&
  config.GOOGLE_REFRESH_TOKEN
) {
  try {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        type: 'OAuth2',
        user: config.GOOGLE_USER,
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN,
      },
    });

    transporter.verify().then(() => {
      if (config.NODE_ENV !== 'test') {
        console.log('📧 Email server ready (Gmail OAuth2)');
      }
    }).catch((err) => {
      console.warn('⚠️  Email server connection warning:', err.message);
    });
  } catch (err) {
    console.warn('⚠️  Could not initialize email transporter:', err.message);
  }
}

/**
 * Send transactional email with console fallback in development.
 */
export const sendEmail = async (to, subject, text, html) => {
  if (!transporter || process.env.NODE_ENV === 'test') {
    if (process.env.NODE_ENV !== 'test' && config.NODE_ENV !== 'test') {
      console.log(`\n📨 [DEV EMAIL FALLBACK] To: ${to} | Subject: ${subject}`);
      console.log(`📨 Message: ${text}\n`);
    }
    return { messageId: 'mock-dev-id' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"YUWA Ecolympics" <${config.GOOGLE_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return null;
  }
};

export default { sendEmail };
