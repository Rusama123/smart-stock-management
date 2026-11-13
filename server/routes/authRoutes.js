import express from "express";
import { register, verifyEmail, resendVerification, login } from "../controllers/authController.js";
import { forgotPassword, verifyResetCode, resetPassword } from "../controllers/passwordController.js";

const router = express.Router();

// Authentication Routes
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", login);

// Password Reset Routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

export default router;