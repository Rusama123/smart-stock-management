// routes/paymentRoutes.js
import express from "express";
import Stripe from "stripe";
import Order from "../models/Order.js";
import User from "../models/User.js";
import nodemailer from "nodemailer";

const router = express.Router();

// ✅ Lazy-init Stripe
let _stripe = null;
function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// ─── Helper: durationKey → months ────────────────────────────────────────────
function getMonthsFromDurationKey(durationKey, durationLabel) {
  if (durationKey) {
    const key = durationKey.toLowerCase();
    if (key === "sixmonths"  || key === "six_months"  || key === "6months")  return 6;
    if (key === "oneyear"    || key === "one_year"    || key === "1year")     return 12;
    if (key === "threeyears" || key === "three_years" || key === "3years")    return 36;
  }
  if (durationLabel) {
    const label = durationLabel.toLowerCase();
    if (label.includes("6 month") || label.includes("six month")) return 6;
    if (label.includes("1 year")  || label.includes("one year"))  return 12;
    if (label.includes("3 year")  || label.includes("three year")) return 36;
  }
  return 12;
}

// ─── Email Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendPaymentSuccessEmail(
  customerEmail, customerName, planName, duration, txnRefNo, subscriptionEndDate
) {
  const endDateStr = subscriptionEndDate
    ? new Date(subscriptionEndDate).toLocaleDateString("en-PK")
    : "N/A";

  const mailOptions = {
    from: `"Medix Team" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: "✅ Payment Successful – Medix Access Granted",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
                  background: #f9f9f9; padding: 30px; border-radius: 10px;">
        <div style="background: #005A8B; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Confirmed!</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Dear <strong>${customerName}</strong>,</p>
          <p style="color: #555;">Your payment has been successfully processed. Here are your order details:</p>
          <div style="background: #f0f7ff; border-left: 4px solid #005A8B; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${duration}</p>
            <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${txnRefNo}</p>
            <p style="margin: 5px 0;"><strong>Access valid until:</strong> ${endDateStr}</p>
          </div>
          <div style="background: #e8f5e9; border: 1px solid #4caf50; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #2e7d32; font-weight: bold; margin: 0;">🎉 Your account is now active!</p>
            <p style="color: #555; margin: 10px 0 0;">
              You can now login to Medix and access all features of your ${planName} plan until <strong>${endDateStr}</strong>.
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/admin/login"
               style="background: #005A8B; color: white; padding: 14px 30px;
                      text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
              Login to Dashboard →
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 13px; text-align: center;">
            Medix – Smart AI Stock Management<br>
            If you have any questions, reply to this email.
          </p>
        </div>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
}

// ─── Core: Activate admin + cascade to all their pharmacists ──────────────────
async function activateAdminAndCascade(meta, subscriptionEndDate) {
  const email = (meta.customerEmail || "").trim().toLowerCase();
  if (!email) return null;

  const planUpdate = {
    planId:              meta.planId   || "",
    planName:            meta.planName || "",
    planType:            meta.planType || "individual",
    planDuration:        meta.duration || "",
    planActivatedAt:     new Date(),
    hasAccess:           true,
    isVerified:          true,
    subscriptionEndDate: subscriptionEndDate,
  };

  // 1. Update the admin user
  const adminUser = await User.findOneAndUpdate(
    { email },
    planUpdate,
    { new: true }
  );

  if (!adminUser) {
    console.error(`❌ Admin user not found for email: ${email}`);
    return null;
  }

  console.log(`✅ Admin ${email} activated — expires ${subscriptionEndDate.toLocaleDateString()}`);
  console.log(`   Plan: ${meta.planName} | Duration: ${meta.duration}`);

  // 2. Cascade subscription to all pharmacists (role=user) under this admin
  //    Match by phone number OR by adminId
  const pharmacistUpdate = {
    hasAccess:           true,
    isVerified:          true,
    subscriptionEndDate: subscriptionEndDate,
    planName:            meta.planName || "",
    planActivatedAt:     new Date(),
  };

  // Find pharmacists by phone (same phone as admin) OR by adminId
  const phoneFilter   = { role: "user", phone: adminUser.phone };
  const adminIdFilter = { role: "user", adminId: adminUser._id };

  // Use $or to catch both cases
  const cascadeResult = await User.updateMany(
    { $or: [phoneFilter, adminIdFilter] },
    { $set: pharmacistUpdate }
  );

  if (cascadeResult.modifiedCount > 0) {
    console.log(`✅ Cascaded subscription to ${cascadeResult.modifiedCount} pharmacist(s) under admin ${email}`);
  } else {
    console.log(`ℹ️  No pharmacists found under admin ${email} to cascade subscription`);
  }

  return adminUser;
}

// ─── Create Stripe Checkout Session ──────────────────────────────────────────
router.post("/payment/stripe/create-session", async (req, res) => {
  try {
    const {
      planId, planName, planType, amount, duration,
      durationKey, teamSize, customerName, customerEmail,
    } = req.body;

    if (!planName || !amount || !customerName || !customerEmail) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const normalizedEmail = customerEmail.trim().toLowerCase();
    const txnRefNo        = `MEDIX-${Date.now()}`;
    const amountInPaisa   = Math.round(Number(amount) * 100);

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: normalizedEmail,
      metadata: {
        txnRefNo,
        planId:            planId || "",
        planName,
        planType:          planType || "individual",
        duration,
        durationKey:       durationKey || "",
        teamSize:          String(teamSize || 1),
        customerName,
        customerEmail:     normalizedEmail,
        originalAmountPKR: String(amount),
      },
      line_items: [
        {
          price_data: {
            currency: "pkr",
            product_data: {
              name: `Medix ${planName} Plan`,
              description: `${duration} – Pharmacy Management Subscription`,
            },
            unit_amount: amountInPaisa,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/cancel`,
    });

    await Order.create({
      txnRefNo,
      planId:          planId || "",
      planName,
      planType:        planType || "individual",
      amount:          Number(amount),
      duration,
      billingType:     durationKey || "",
      teamSize:        teamSize || 1,
      paymentMethod:   "stripe",
      customerName,
      customerEmail:   normalizedEmail,
      customerPhone:   "",
      status:          "pending",
      stripeSessionId: session.id,
    });

    return res.json({ redirectUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe session error:", err);
    return res.status(500).json({ message: "Payment initiation failed. " + err.message });
  }
});

// ─── Verify Payment & AUTO-ACTIVATE Subscription ─────────────────────────────
router.get("/payment/stripe/verify", async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, message: "Session ID missing." });
    }

    const session = await getStripe().checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.json({ success: false, message: "Payment not completed." });
    }

    const meta = session.metadata;

    // ── Calculate subscription end date ──────────────────────────────────────
    const months = getMonthsFromDurationKey(meta.durationKey, meta.duration);
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + months);

    console.log(`\n💳 Payment verified for: ${meta.customerEmail}`);
    console.log(`📦 Plan: ${meta.planName} | Duration: ${meta.duration} | Months: ${months}`);
    console.log(`📅 Subscription ends: ${subscriptionEndDate.toLocaleDateString()}\n`);

    // ── Mark order paid ───────────────────────────────────────────────────────
    const order = await Order.findOneAndUpdate(
      { stripeSessionId: session_id },
      {
        status:     "paid",
        paidAt:     new Date(),
        txnDetails: { stripeSessionId: session_id, paymentStatus: session.payment_status },
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    // ── Activate admin + cascade subscription to pharmacists ─────────────────
    const adminUser = await activateAdminAndCascade(meta, subscriptionEndDate);

    // ── Send confirmation email (non-blocking) ────────────────────────────────
    if (meta.customerEmail) {
      try {
        await sendPaymentSuccessEmail(
          meta.customerEmail, meta.customerName, meta.planName,
          meta.duration, order.txnRefNo, subscriptionEndDate
        );
        console.log(`📧 Confirmation email sent to ${meta.customerEmail}`);
      } catch (emailErr) {
        console.error("Email send failed:", emailErr.message);
      }
    }

    return res.json({
      success: true,
      order: {
        planName:            order.planName,
        duration:            order.duration,
        amount:              order.amount,
        txnRefNo:            order.txnRefNo,
        customerName:        meta.customerName,
        customerEmail:       meta.customerEmail,
        subscriptionEndDate: subscriptionEndDate,
      },
      // Return updated user info so frontend can update localStorage
      user: adminUser ? {
        id:                  adminUser._id,
        name:                adminUser.name,
        email:               adminUser.email,
        phone:               adminUser.phone,
        role:                adminUser.role,
        hasAccess:           true,
        isVerified:          true,
        subscriptionEndDate: subscriptionEndDate,
        planName:            meta.planName,
      } : null,
    });
  } catch (err) {
    console.error("Stripe verify error:", err);
    return res.status(500).json({ success: false, message: "Verification failed. " + err.message });
  }
});

// ─── Stripe Webhook (backup) ──────────────────────────────────────────────────
router.post(
  "/payment/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = getStripe().webhooks.constructEvent(
        req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const meta    = session.metadata;

      // Calculate subscription end date
      const months = getMonthsFromDurationKey(meta?.durationKey, meta?.duration);
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + months);

      if (session.payment_status === "paid") {
        // Mark order paid
        await Order.findOneAndUpdate(
          { stripeSessionId: session.id },
          {
            status:     "paid",
            paidAt:     new Date(),
            txnDetails: { stripeSessionId: session.id, paymentStatus: session.payment_status },
          },
          { new: true }
        );

        if (meta && meta.customerEmail) {
          // Activate admin + cascade to pharmacists
          const adminUser = await activateAdminAndCascade(meta, subscriptionEndDate);

          // Send confirmation email
          if (adminUser) {
            try {
              await sendPaymentSuccessEmail(
                meta.customerEmail, meta.customerName, meta.planName,
                meta.duration, `MEDIX-${Date.now()}`, subscriptionEndDate
              );
              console.log(`📧 Webhook: Confirmation email sent to ${meta.customerEmail}`);
            } catch (emailErr) {
              console.error("Webhook email send failed:", emailErr.message);
            }
          }
        }
      }
    }
    res.json({ received: true });
  }
);

export default router;