import User from "../models/User.js";
import { generateToken } from "../utils/tokenGenerator.js";
import { generateVerificationCode } from "../utils/codeGenerator.js";
import { sendVerificationEmail } from "../utils/emailSender.js";

// Register User
export const register = async (req, res) => {
  try {
    const { name, role, pharmacyName, phone, email, password, city, area, address } = req.body;

    if (!name || name.length < 4) {
      return res.status(400).json({ message: "Name must be at least 4 characters!" });
    }

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: "Role must be either 'admin' or 'user'!" });
    }

    if (role === 'user' && (!pharmacyName || pharmacyName.length < 8)) {
      return res.status(400).json({ message: "Pharmacy name must be at least 8 characters!" });
    }

    if (role === 'user' && (!city || city.trim().length < 2)) {
      return res.status(400).json({ message: "City is required for pharmacy users!" });
    }

    if (role === 'user' && (!area || area.trim().length < 2)) {
      return res.status(400).json({ message: "Area is required for pharmacy users!" });
    }

    if (!phone || phone.length !== 11 || !/^\d+$/.test(phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 11 digits!" });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address!" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with 1 uppercase letter and 1 number!"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email!" });
    }

    // DISALLOW PUBLIC REGISTRATION FOR USER ROLE
    if (role === 'user') {
      return res.status(400).json({ message: "Please contact your admin to create your account." });
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const isSuperAdmin = normalizedEmail === 'usama.rana.tech@gmail.com';

    const newUser = new User({
      name,
      role: isSuperAdmin ? 'superadmin' : role,
      pharmacyName: role === 'user' ? pharmacyName : undefined,
      city: role === 'user' ? city.trim() : undefined,
      area: role === 'user' ? area.trim() : undefined,
      address: role === 'user' && address ? address.trim() : undefined,
      phone,
      email: normalizedEmail,
      password,
      verificationCode,
      verificationCodeExpiry,
      isVerified: isSuperAdmin ? true : false,
      hasAccess: isSuperAdmin ? true : false,
      subscriptionEndDate: isSuperAdmin ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) : undefined
    });

    await newUser.save();

    if (!isSuperAdmin) {
      const emailResult = await sendVerificationEmail(email, verificationCode, name);

      if (!emailResult.success) {
        console.warn(`⚠️ Failed to send verification email to ${email}. Code: ${verificationCode}`);
        if (process.env.NODE_ENV === "development") {
          console.log(`🔧 [DEV MODE] Bypassing email send failure. Verification Code: ${verificationCode}`);
        } else {
          await User.deleteOne({ email });
          return res.status(500).json({
            message: "Failed to send verification email. Please check your email address."
          });
        }
      }
    }

    res.json({
      message: isSuperAdmin 
        ? "Super Admin account created successfully! You can login now."
        : "Please check your email for verification code. Wait for admin approval.",
      userId: newUser._id
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Error registering user", error: err.message });
  }
};

// Verify Email
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified!" });
    }

    if (new Date() > user.verificationCodeExpiry) {
      return res.status(400).json({ message: "Verification code expired! Please request a new one." });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code!" });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiry = undefined;
    await user.save();

    const token = generateToken(user._id, user.email, user.role);

    res.json({
      message: "Email verified successfully! You can now login.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isSuperAdmin: user.role === 'superadmin',
        subscriptionEndDate: user.subscriptionEndDate
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Error verifying email", error: err.message });
  }
};

// Resend Verification Code
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
      return res.status(404).json({ message: "Email not found! Please enter correct email." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified!" });
    }

    const verificationCode = generateVerificationCode();
    const verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpiry = verificationCodeExpiry;
    await user.save();

    const emailResult = await sendVerificationEmail(email, verificationCode, user.name);
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        message: "Failed to send verification email." 
      });
    }

    res.json({ message: "Verification code sent successfully!" });

  } catch (err) {
    res.status(500).json({ message: "Error resending code", error: err.message });
  }
};

// Login - WITH ADMIN SUBSCRIPTION CHECK
export const login = async (req, res) => {
  try {
    const { role, hospitalName, email, password } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    console.log("Login attempt:", { role, email: normalizedEmail, hospitalName });

    const isSuperAdminEmail = normalizedEmail === 'usama.rana.tech@gmail.com';

    if (role === 'admin') {
      let adminUser = await User.findOne({ email: normalizedEmail });

      // Auto-create super admin if doesn't exist
      if (!adminUser && isSuperAdminEmail) {
        console.log("🔥 Creating super admin account...");
        adminUser = new User({
          name: 'Super Admin',
          role: 'superadmin',
          phone: '12345678901',
          email: 'usama.rana.tech@gmail.com',
          password: 'Rana4455',
          isVerified: true,
          hasAccess: true,
          subscriptionEndDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
        });
        await adminUser.save();
        console.log("✅ Super admin account created successfully");
      }

      if (!adminUser) {
        return res.status(404).json({ message: "Admin not found! Please check your email." });
      }

      const isSuperAdmin = adminUser.email.toLowerCase() === 'usama.rana.tech@gmail.com' || 
                          adminUser.role === 'superadmin';

      if (adminUser.role !== 'admin' && adminUser.role !== 'superadmin') {
        return res.status(403).json({ message: "This account is not an admin account!" });
      }

      // SUPER ADMIN: Bypass ALL checks
      if (isSuperAdmin) {
        console.log("🔥 Super admin login detected - bypassing ALL checks");
        
        let needsSave = false;
        if (adminUser.role !== 'superadmin') {
          adminUser.role = 'superadmin';
          needsSave = true;
        }
        if (!adminUser.isVerified) {
          adminUser.isVerified = true;
          needsSave = true;
        }
        if (!adminUser.hasAccess) {
          adminUser.hasAccess = true;
          needsSave = true;
        }
        // ✅ FIXED: Only set default subscriptionEndDate if truly null/missing
        // Do NOT override a recently-set date (e.g., from a plan purchase)
        if (!adminUser.subscriptionEndDate) {
          adminUser.subscriptionEndDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
          needsSave = true;
        }
        
        if (needsSave) {
          await adminUser.save();
          console.log("✅ Super admin settings updated");
        }

        if (adminUser.password !== password) {
          return res.status(401).json({ message: "Invalid super admin password!" });
        }

        const token = generateToken(adminUser._id, adminUser.email, 'superadmin');

        console.log(`✅ SUPER ADMIN LOGIN SUCCESSFUL:`, adminUser.email);

        return res.status(200).json({
          message: "Super Admin login successful!",
          token,
          user: {
            id: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
            phone: adminUser.phone,
            role: 'superadmin',
            isSuperAdmin: true,
            subscriptionEndDate: adminUser.subscriptionEndDate
          }
        });
      }

      // REGULAR ADMIN: Apply all checks
      if (!adminUser.isVerified) {
        return res.status(403).json({
          message: "Email not verified! Please verify your email before logging in."
        });
      }

      if (!adminUser.hasAccess) {
        return res.status(403).json({
          message: "Access denied! Please wait for super admin approval."
        });
      }

      if (adminUser.subscriptionEndDate) {
        const today = new Date();
        if (today > new Date(adminUser.subscriptionEndDate)) {
          return res.status(403).json({
            message: "Your subscription has expired! Please contact super admin."
          });
        }
      }

      if (adminUser.password !== password) {
        return res.status(401).json({ message: "Invalid admin credentials!" });
      }

      const token = generateToken(adminUser._id, adminUser.email, adminUser.role);

      console.log(`✅ Admin login successful:`, adminUser.email);

      return res.status(200).json({
        message: "Admin login successful!",
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          role: 'admin',
          isSuperAdmin: false,
          subscriptionEndDate: adminUser.subscriptionEndDate
        }
      });
    }

    // USER LOGIN - WITH ADMIN SUBSCRIPTION CHECK
    if (role === 'user') {
      const user = await User.findOne({ email: normalizedEmail, role: 'user' });

      if (!user) {
        return res.status(404).json({ message: "User not found! Please check your email." });
      }

      if (!user.isVerified) {
        return res.status(403).json({
          message: "Email not verified! Please verify your email before logging in."
        });
      }

      if (!user.hasAccess) {
        return res.status(403).json({
          message: "Access denied! Please wait for admin approval to access the system."
        });
      }

      // ✅ CHECK: User's subscription
      if (user.subscriptionEndDate) {
        const today = new Date();
        if (today > new Date(user.subscriptionEndDate)) {
          return res.status(403).json({
            message: "Your subscription has expired! Please contact admin to renew."
          });
        }
      } else {
        return res.status(403).json({
          message: "No active subscription! Please contact admin to activate your account."
        });
      }

      // ✅ NEW CHECK: Verify admin's subscription is also active
      let admin = null;
      
      // Try to find admin by adminId first
      if (user.adminId) {
        admin = await User.findById(user.adminId);
      }
      
      // If not found, try to find admin by phone
      if (!admin) {
        admin = await User.findOne({ role: 'admin', phone: user.phone });
        
        // Update adminId if found
        if (admin) {
          user.adminId = admin._id;
          await user.save();
        }
      }

      // Check if admin exists and has access
      if (admin) {
        if (!admin.hasAccess) {
          return res.status(403).json({
            message: "Your admin's access has been disabled! Please contact your admin or super admin."
          });
        }

        // Check admin's subscription
        if (admin.subscriptionEndDate) {
          const today = new Date();
          if (today > new Date(admin.subscriptionEndDate)) {
            return res.status(403).json({
              message: "Your admin's subscription has expired! Please contact your admin to renew their subscription."
            });
          }
        } else {
          return res.status(403).json({
            message: "Your admin has no active subscription! Please contact your admin or super admin."
          });
        }
      } else {
        console.warn(`⚠️ User ${user.email} has no admin assigned. Allowing login anyway.`);
      }

      const uPharmacy = user.pharmacyName ? user.pharmacyName.trim().toLowerCase() : '';
      const hName = hospitalName ? hospitalName.trim().toLowerCase() : '';

      if (uPharmacy !== hName) {
        return res.status(401).json({ message: "Hospital name does not match!" });
      }

      if (user.password !== password) {
        return res.status(401).json({ message: "Incorrect password!" });
      }

      const token = generateToken(user._id, user.email, user.role);

      console.log("✅ User login successful:", user.email);

      return res.status(200).json({
        message: "User login successful!",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: 'user',
          pharmacyName: user.pharmacyName,
          city: user.city,
          area: user.area,
          isSuperAdmin: false,
          subscriptionEndDate: user.subscriptionEndDate,
          adminName: admin?.name || 'No Admin',
          adminEmail: admin?.email || 'N/A'
        }
      });
    }

    return res.status(400).json({ message: "Invalid role specified!" });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
};