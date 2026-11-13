import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

// CRITICAL: Use the SAME secret as tokenGenerator.js
const JWT_SECRET = process.env.JWT_SECRET || 'IPIMS_Secret_Key_2024_Secure!@#';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: 'Access token required' });
    }

    console.log('🔍 Verifying token...');
    console.log('🔑 Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      console.log('✅ Token decoded:', { email: decoded.email, role: decoded.role });

      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      req.userRole = decoded.role;
      
      // Force superadmin role if email matches
      const isSuperAdminEmail = decoded.email?.toLowerCase() === 'usama.rana.tech@gmail.com';
      
      if (isSuperAdminEmail) {
        req.userRole = 'superadmin';
        console.log('🔥 Super admin detected - role set to superadmin');
        
        // Update user role in database if needed
        User.findById(decoded.userId).then(user => {
          if (user && user.role !== 'superadmin') {
            user.role = 'superadmin';
            user.hasAccess = true;
            user.isVerified = true;
            user.save().then(() => {
              console.log('✅ Super admin role updated in database');
            }).catch(err => {
              console.error('⚠️ Could not update super admin role:', err.message);
            });
          }
        }).catch(err => {
          console.error('⚠️ Error fetching user for role update:', err.message);
        });
      }
      
      console.log(`✅ Authentication successful: ${decoded.email} (${req.userRole})`);
      next();
      
    } catch (verifyErr) {
      console.error('❌ Token verification error:', verifyErr.message);
      
      if (verifyErr.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired. Please login again.',
          error: 'TOKEN_EXPIRED'
        });
      }
      
      if (verifyErr.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          message: 'Invalid token. Please login again.',
          error: 'INVALID_TOKEN'
        });
      }
      
      return res.status(403).json({ 
        message: 'Token verification failed. Please login again.',
        error: verifyErr.message
      });
    }
    
  } catch (err) {
    console.error('❌ Authentication error:', err);
    return res.status(500).json({ 
      message: 'Authentication error', 
      error: err.message 
    });
  }
};

// Middleware to check if user is superadmin only
export const requireSuperAdmin = (req, res, next) => {
  const isSuperAdmin = req.userRole === 'superadmin' || 
                       req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';
  
  if (!isSuperAdmin) {
    console.log('❌ Super admin access denied for:', req.userEmail);
    return res.status(403).json({ message: 'Super admin access required' });
  }
  
  console.log('✅ Super admin access granted');
  req.userRole = 'superadmin';
  next();
};