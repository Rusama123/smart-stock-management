import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// OPTION 1: Direct credentials (if .env not loading)
const EMAIL_USER = process.env.EMAIL_USER || 'urana1293@gmail.com';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'rjhppdtiylidhetd';

console.log('🔧 Email Config Loading...');
console.log('USER:', EMAIL_USER);
console.log('PASS:', EMAIL_PASSWORD ? 'LOADED' : 'MISSING');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD
  }
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email Connection Failed:', error.message);
  } else {
    console.log('✅ Email Server Ready!');
  }
});

export default transporter;