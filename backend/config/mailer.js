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
    const verifyPromise = client.verify().catch(err => {
      // Ignore background rejection after timeout
    });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SMTP connection timed out after 5000ms')), 5000)
    );
    await Promise.race([verifyPromise, timeoutPromise]);
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

async function sendEscalationEmail(details) {
  try {
    const client = await getTransporter();
    const service = process.env.EMAIL_SERVICE || (process.env.EMAIL_USER && process.env.EMAIL_USER.endsWith('@gmail.com') ? 'Gmail' : 'SMTP');
    const fromAddress = process.env.EMAIL_FROM || `"Customer Feedback Support" <${process.env.EMAIL_USER}>`;

    const { email, managerName, complaintNumber, salesExecutiveName, customerCode, invoiceNumber, complaintType, complaintSubtype } = details;
    const typeDisplay = complaintSubtype ? `${complaintType} (${complaintSubtype})` : complaintType;

    const recipients = Array.isArray(email) ? email.filter(e => e && e.includes('@')) : [email];
    const anonymizedLog = recipients.map(anonymizeEmail).join(', ');

    if (recipients.length === 0) {
      console.warn(`[MAIL WARN] sendEscalationEmail skipped for ${complaintNumber}: No valid recipient emails.`);
      return { success: false, message: 'No recipients' };
    }

    const mailOptions = {
      from: fromAddress,
      to: recipients,
      subject: `Complaint Escalated - ${complaintNumber}`,
      text: `Hello ${managerName || 'Warehouse Manager'},\n\nA complaint has been escalated and requires your attention.\n\nComplaint Number: ${complaintNumber}\nSales Executive: ${salesExecutiveName || 'N/A'}\nCustomer Code: ${customerCode}\nInvoice Number: ${invoiceNumber}\nComplaint Type: ${typeDisplay}\nStatus: Escalated to Manager\n\nPlease log in to your dashboard to review and take action.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #dc2626;">Complaint Escalated - Attention Required</h2>
          <p>Hello ${managerName || 'Warehouse Manager'},</p>
          <p>The following complaint has been escalated and requires your urgent review:</p>
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><strong>Complaint Number:</strong> ${complaintNumber}</p>
            <p style="margin: 4px 0;"><strong>Raised By (Sales Exec):</strong> ${salesExecutiveName || 'N/A'}</p>
            <p style="margin: 4px 0;"><strong>Customer Code:</strong> ${customerCode}</p>
            <p style="margin: 4px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p style="margin: 4px 0;"><strong>Complaint Type:</strong> ${typeDisplay}</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">Escalated to Manager</span></p>
          </div>
          <p>Please log in to your Customer Feedback Management System dashboard to review details and take action.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated notification from the Customer Feedback Management System.</p>
        </div>
      `,
    };

    console.log(`Escalation email requested for Manager(s): ${anonymizedLog} (Complaint: ${complaintNumber})`);
    console.log(`SMTP provider: ${service}`);
    const info = await client.sendMail(mailOptions);
    console.log('SMTP send status: SUCCESS');
    console.log('Message ID:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('SMTP send status: FAILED');
    console.error('Error occurred in sendEscalationEmail:', err.message);
    throw err;
  }
}

async function sendResolutionEmail(details) {
  try {
    const client = await getTransporter();
    const service = process.env.EMAIL_SERVICE || (process.env.EMAIL_USER && process.env.EMAIL_USER.endsWith('@gmail.com') ? 'Gmail' : 'SMTP');
    const fromAddress = process.env.EMAIL_FROM || `"Customer Feedback Support" <${process.env.EMAIL_USER}>`;

    const { email, salesExecutiveName, complaintNumber, customerCode, invoiceNumber, warehouseName, complaintType, complaintSubtype } = details;
    const typeDisplay = complaintSubtype ? `${complaintType} (${complaintSubtype})` : complaintType;

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: `Your Complaint Has Been Resolved - ${complaintNumber}`,
      text: `Hello ${salesExecutiveName || 'Sales Executive'},\n\nYour complaint has been resolved.\n\nComplaint Number: ${complaintNumber}\nCustomer Code: ${customerCode}\nInvoice Number: ${invoiceNumber}\nWarehouse: ${warehouseName}\nComplaint Type: ${typeDisplay}\nStatus: Resolved / Completed\n\nThank you for using the Customer Feedback Management System.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #16a34a;">Your Complaint Has Been Resolved</h2>
          <p>Hello ${salesExecutiveName || 'Sales Executive'},</p>
          <p>Your complaint has been marked as resolved:</p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><strong>Complaint Number:</strong> ${complaintNumber}</p>
            <p style="margin: 4px 0;"><strong>Customer Code:</strong> ${customerCode}</p>
            <p style="margin: 4px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p style="margin: 4px 0;"><strong>Warehouse:</strong> ${warehouseName}</p>
            <p style="margin: 4px 0;"><strong>Complaint Type:</strong> ${typeDisplay}</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">Resolved</span></p>
          </div>
          <p>You can view the full details in your Customer Feedback Management System dashboard.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">This is an automated notification from the Customer Feedback Management System.</p>
        </div>
      `,
    };

    console.log(`Resolution email requested for Sales Executive: ${anonymizeEmail(email)} (Complaint: ${complaintNumber})`);
    console.log(`SMTP provider: ${service}`);
    const info = await client.sendMail(mailOptions);
    console.log('SMTP send status: SUCCESS');
    console.log('Message ID:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('SMTP send status: FAILED');
    console.error('Error occurred in sendResolutionEmail:', err.message);
    throw err;
  }
}

module.exports = {
  verifySmtp,
  sendResetMail,
  sendOtpMail,
  sendEscalationEmail,
  sendResolutionEmail
};


