import User from "../models/User.js";
import { generateVerificationCode } from "../utils/codeGenerator.js";
import { sendPasswordResetEmail } from "../utils/emailSender.js";

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required!" });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address!" });
    }

    let user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (!user) {
      return res.status(404).json({ 
        message: "User not found with this email address!" 
      });
    }

    const resetCode = generateVerificationCode();
    const resetCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCode = resetCode;
    user.verificationCodeExpiry = resetCodeExpiry;
    await user.save();

    const emailResult = await sendPasswordResetEmail(user.email, resetCode, user.name);

    if (!emailResult.success) {
      return res.status(500).json({
        message: "Failed to send reset email. Please try again later."
      });
    }
    
    res.json({ 
      message: "Password reset code sent to your email!",
      email: user.email
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ 
      message: "Server error. Please try again later."
    });
  }
};

export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required!" });
    }

    let user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (!user.verificationCode) {
      return res.status(400).json({ message: "No reset code found. Please request a new one." });
    }

    if (new Date() > user.verificationCodeExpiry) {
      user.verificationCode = undefined;
      user.verificationCodeExpiry = undefined;
      await user.save();
      
      return res.status(400).json({ message: "Reset code has expired! Please request a new one." });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code!" });
    }

    res.json({ 
      message: "Code verified successfully! You can now reset your password.",
      email: user.email
    });

  } catch (err) {
    console.error("Verify code error:", err);
    res.status(500).json({ 
      message: "Error verifying code. Please try again."
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    let user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (!user.verificationCode || user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid or expired reset code!" });
    }

    if (new Date() > user.verificationCodeExpiry) {
      user.verificationCode = undefined;
      user.verificationCodeExpiry = undefined;
      await user.save();
      
      return res.status(400).json({ message: "Reset code has expired! Please start over." });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with 1 uppercase letter and 1 number!"
      });
    }

    user.password = newPassword;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

    console.log(`✅ Password reset successful for: ${user.email}`);

    res.json({ 
      message: "Password reset successfully! You can now login with your new password." 
    });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ 
      message: "Error resetting password. Please try again."
    });
  }
};