const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

function anonymizeEmail(email) {
  if (!email || !email.includes('@')) return email || 'unknown';
  const [local, domain] = email.split('@');
  const safeLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : local[0] + '***';
  return `${safeLocal}@${domain}`;
}

async function getTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  // Check if real SMTP credentials are set
  if (!emailUser || emailUser === 'mock_user@ethereal.email' || !emailPass || emailPass === 'mock_password' || emailPass.includes('YOUR_GMAIL_APP_PASSWORD')) {
    const errMsg = 'Real SMTP credentials are missing in backend/.env. Please set EMAIL_SERVICE=gmail, EMAIL_USER, and EMAIL_PASS (Gmail App Password).';
    console.error(`[SMTP ERROR] ${errMsg}`);
    throw new Error(errMsg);
  }

  const service = process.env.EMAIL_SERVICE || (emailUser.endsWith('@gmail.com') ? 'gmail' : undefined);
  const host = process.env.EMAIL_HOST || (service ? undefined : 'smtp.gmail.com');
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const isSecure = process.env.EMAIL_SECURE === 'true' || port === 465;

  const transportConfig = {
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  if (service) {
    transportConfig.service = service;
  } else {
    transportConfig.host = host;
    transportConfig.port = port;
    transportConfig.secure = isSecure;
  }

  transporter = nodemailer.createTransport(transportConfig);
  return transporter;
}

async function verifySmtp() {
  const emailUser = process.env.EMAIL_USER;
  const service = process.env.EMAIL_SERVICE || (emailUser && emailUser.endsWith('@gmail.com') ? 'Gmail' : 'SMTP');
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';

  console.log('---------------------------------------------------------');
  console.log(`SMTP provider: ${service}`);
  console.log(`SMTP host: ${host}`);
  console.log(`SMTP user: ${anonymizeEmail(emailUser)}`);

  try {
    const client = await getTransporter();
    await client.verify();
    console.log('SMTP verification: SUCCESS');
    console.log('---------------------------------------------------------');
    return true;
  } catch (err) {
    console.error(`SMTP verification: FAILED (${err.message})`);
    console.log('---------------------------------------------------------');
    return false;
  }
}

async function sendResetMail(email, token) {
  try {
    const client = await getTransporter();
    const service = process.env.EMAIL_SERVICE || (process.env.EMAIL_USER && process.env.EMAIL_USER.endsWith('@gmail.com') ? 'Gmail' : 'SMTP');
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
    const fromAddress = process.env.EMAIL_FROM || `"Customer Feedback Support" <${process.env.EMAIL_USER}>`;
    
    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click this link to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested a password reset for your Customer Feedback Management System account.</p>
          <p>Please click the button below to reset your password. This link is valid for 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${resetUrl}" style="color: #3b82f6;">${resetUrl}</a></p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    console.log(`Reset email requested for: ${anonymizeEmail(email)}`);
    console.log(`SMTP provider: ${service}`);
    const info = await client.sendMail(mailOptions);
    console.log('SMTP send status: SUCCESS');
    console.log('Message ID:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('SMTP send status: FAILED');
    console.error('Error occurred in sendResetMail:', err.message);
    throw err;
  }
}

async function sendOtpMail(email, otp) {
  try {
    const client = await getTransporter();
    const service = process.env.EMAIL_SERVICE || (process.env.EMAIL_USER && process.env.EMAIL_USER.endsWith('@gmail.com') ? 'Gmail' : 'SMTP');
    const fromAddress = process.env.EMAIL_FROM || `"Customer Feedback Support" <${process.env.EMAIL_USER}>`;

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: 'Your Password Reset OTP',
      text: `Your one-time password (OTP) for resetting your CFMS account password is: ${otp}\n\nThis code is valid for 10 minutes. Do not share it with anyone.\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #333;">Password Reset OTP</h2>
          <p>You requested a password reset for your Customer Feedback Management System account.</p>
          <p>Your one-time password (OTP) is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="background-color: #3b82f6; color: white; padding: 16px 32px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">${otp}</span>
          </div>
          <p style="color: #555;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">If you did not request this, please ignore this email. Your password will not change.</p>
        </div>
      `,
    };

    console.log(`OTP email requested for: ${anonymizeEmail(email)}`);
    console.log(`SMTP provider: ${service}`);
    const info = await client.sendMail(mailOptions);
    console.log('SMTP send status: SUCCESS');
    console.log('Message ID:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('SMTP send status: FAILED');
    console.error('Error occurred in sendOtpMail:', err.message);
    throw err;
  }
}

module.exports = {
  verifySmtp,
  sendResetMail,
  sendOtpMail
};

