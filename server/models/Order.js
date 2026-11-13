// models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    txnRefNo: { type: String, required: true, unique: true },
    planId: { type: String, default: "" },
    planName: { type: String, required: true },
    planType: { type: String, enum: ["individual", "team"], default: "individual" },
    amount: { type: Number, required: true }, // stored in PKR
    duration: { type: String },
    billingType: { type: String },
    teamSize: { type: Number, default: 1 },
    paymentMethod: { type: String, default: "stripe" },
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },
    paidAt: { type: Date },
    txnDetails: { type: mongoose.Schema.Types.Mixed },
    // Stripe-specific
    stripeSessionId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);