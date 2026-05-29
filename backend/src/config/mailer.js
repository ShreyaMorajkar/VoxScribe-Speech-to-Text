const nodemailer = require('nodemailer');
const axios = require('axios');

let transporter = null;
let isEthereal = false;

// Create SMTP Transporter or Ethereal test account dynamically on-the-fly
async function getTransporter() {
  if (transporter) return { transporter, isEthereal };

  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT) || 465;

  if (smtpUser && smtpPass) {
    console.log('📬 [Mailer] Initializing Production SMTP Transporter for:', smtpUser);
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    isEthereal = false;
  } else {
    console.log('ℹ️ [Mailer] No SMTP credentials in .env. Bootstrapping dynamic Ethereal Mail sandbox on-the-fly...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      isEthereal = true;
      console.log('📁 [Mailer] Ethereal Sandbox created successfully. Credentials:');
      console.log(`   👉 User: ${testAccount.user}`);
      console.log(`   👉 Pass: ${testAccount.pass}`);
    } catch (err) {
      console.error('❌ Failed to initialize Ethereal test account:', err.message);
      throw err;
    }
  }

  return { transporter, isEthereal };
}

// Send beautiful HTML OTP email
async function sendOTPEmail(email, name, otpCode) {
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 24px; color: #f1f5f9; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%); margin-bottom: 20px;">
        <span style="font-size: 22px; color: white; line-height: 44px; font-weight: bold; display: block; text-align: center;">V</span>
      </div>
      <h2 style="font-size: 24px; font-weight: 800; color: white; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.5px;">Verify Your Email</h2>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">Hello <strong>${name}</strong>,<br>Thank you for registering at VoxScribe. Use the 6-digit verification code below to activate your account:</p>
      
      <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; padding: 18px 24px; background-color: #080b11; border: 1px solid rgba(6, 182, 212, 0.15); border-radius: 16px; color: #06b6d4; display: inline-block; margin-bottom: 24px; font-family: monospace;">
        ${otpCode}
      </div>
      
      <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 24px;">This code is valid for <strong>10 minutes</strong>. If you did not create a VoxScribe account, you can safely ignore this email.</p>
      
      <div style="border-top: 1px solid #1e293b; padding-top: 20px; font-size: 11px; color: #475569; margin-top: 20px;">
        &copy; ${new Date().getFullYear()} VoxScribe Sandbox. All rights reserved.
      </div>
    </div>
  `;

  // 1. Check if Resend API is configured
  if (process.env.RESEND_API_KEY) {
    console.log('⚡ [Mailer] Delivering real email via Resend REST API to:', email);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'VoxScribe <onboarding@resend.dev>';
    try {
      const response = await axios.post('https://api.resend.com/emails', {
        from: fromEmail,
        to: email,
        subject: `[VoxScribe] Verify your email address (OTP: ${otpCode})`,
        html: htmlContent
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📬 [Resend Sent] -> Email sent successfully to ${email}. ID: ${response.data.id}`);
      return { success: true };
    } catch (err) {
      console.error('❌ Resend API delivery error:', err.response?.data || err.message);
      // Fallback to Nodemon sandbox if Resend fails due to unverified recipient domain issues
      console.warn('⚠️ Resend failed. Falling back to Nodemail Sandbox transport...');
    }
  }

  // 2. Fallback to Nodemailer SMTP/Ethereal
  try {
    const { transporter, isEthereal } = await getTransporter();
    const smtpSender = process.env.SMTP_USER || process.env.EMAIL_USER || 'voxscribe-sandbox@ethereal.email';

    const mailOptions = {
      from: `"VoxScribe Secure" <${smtpSender}>`,
      to: email,
      subject: `[VoxScribe] Verify your email address (OTP: ${otpCode})`,
      text: `Hello ${name},\n\nThank you for registering at VoxScribe. Your 6-digit One-Time Password (OTP) is:\n\n${otpCode}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.\n\nBest regards,\nThe VoxScribe Team`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);

    if (isEthereal) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`\n========================================================================`);
      console.log(`📩 [Sandbox Email Sent] -> To: ${email}`);
      console.log(`🔑 Verification OTP: [ ${otpCode} ]`);
      console.log(`🔗 Click here to view actual sent HTML email in browser:`);
      console.log(`   👉 ${previewUrl}`);
      console.log(`========================================================================\n`);
      return { success: true, previewUrl };
    } else {
      console.log(`📬 [SMTP Email Sent] -> To: ${email} | MessageID: ${info.messageId}`);
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Mailer error sending email:', error.message);
    throw error;
  }
}

module.exports = {
  sendOTPEmail
};
