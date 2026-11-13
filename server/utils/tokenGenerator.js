import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// CRITICAL: Use the SAME secret everywhere
const JWT_SECRET = process.env.JWT_SECRET || 'IPIMS_Secret_Key_2024_Secure!@#';

export const generateToken = (userId, email, role) => {
  try {
    const payload = {
      userId,
      email,
      role
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '30d'
    });

    console.log('✅ Token generated for:', email, 'Role:', role);
    console.log('🔑 Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
    
    return token;
  } catch (err) {
    console.error('❌ Error generating token:', err);
    throw err;
  }
};

export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    throw err;
  }
};

export const getJWTSecret = () => JWT_SECRET;