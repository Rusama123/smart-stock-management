import transporter from "../config/email.js";

const EMAIL_USER = 'urana1293@gmail.com';

export const sendVerificationEmail = async (email, code, name) => {
  const mailOptions = {
    from: {
      name: 'IPIMS System',
      address: EMAIL_USER
    },
    to: email,
    subject: 'Email Verification - IPIMS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745; text-align: center;">Welcome to IPIMS, ${name}!</h2>
        <p>Your verification code is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 5px; padding: 10px 20px; border: 2px dashed #28a745; border-radius: 5px;">
            ${code}
          </span>
        </div>
        <p><strong>This code will expire in 10 minutes.</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email error:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendPasswordResetEmail = async (email, code, name) => {
  const mailOptions = {
    from: {
      name: 'IPIMS System',
      address: EMAIL_USER
    },
    to: email,
    subject: 'Password Reset Code - IPIMS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745; text-align: center;">Password Reset Request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>You requested to reset your password for your IPIMS account.</p>
        <p>Your password reset code is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 5px; padding: 10px 20px; border: 2px dashed #28a745; border-radius: 5px;">
            ${code}
          </span>
        </div>
        <p><strong>This code will expire in 10 minutes.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Password reset email error:", error.message);
    return { success: false, error: error.message };
  }
};