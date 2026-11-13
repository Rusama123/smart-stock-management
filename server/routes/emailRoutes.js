// backend/routes/emailRoutes.js
import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

// ─── Nodemailer Transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ─── POST /api/email/contact ──────────────────────────────────────────────────
router.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    await transporter.sendMail({
      from: `"Medix Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background: #2563eb; padding: 24px; text-align: center;">
            <h2 style="color: #fff; margin: 0;">New Contact Message</h2>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px; color: #555;">Name:</td>
                <td style="padding: 8px 0; color: #111;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0; color: #111;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Subject:</td>
                <td style="padding: 8px 0; color: #111;">${subject}</td>
              </tr>
            </table>
            <hr style="margin: 16px 0; border: none; border-top: 1px solid #e0e0e0;" />
            <h4 style="color: #555; margin-bottom: 8px;">Message:</h4>
            <p style="color: #111; line-height: 1.6; background: #f9f9f9; padding: 12px; border-radius: 6px;">${message}</p>
          </div>
          <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #888;">
            Sent via Medix Contact Form
          </div>
        </div>
      `,
    });

    res.status(200).json({ message: "Message sent successfully." });
  } catch (error) {
    console.error("Contact email error:", error);
    res.status(500).json({ message: "Failed to send message. Please try again." });
  }
});

// ─── POST /api/email/appointment ─────────────────────────────────────────────
router.post("/appointment", async (req, res) => {
  const { fullName, email, phone, date, department, message } = req.body;

  if (!fullName || !email || !phone || !date || !department) {
    return res.status(400).json({ message: "Required fields are missing." });
  }

  // Format date nicely
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format department: "general-medicine" → "General Medicine"
  const departmentFormatted = department
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  try {
    // ── 1. Admin notification email ──────────────────────────────────────────
    await transporter.sendMail({
      from: `"Medix Appointments" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `[Appointment] ${fullName} — ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background: #16a34a; padding: 24px; text-align: center;">
            <h2 style="color: #fff; margin: 0;">New Appointment Request</h2>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 140px; color: #555;">Full Name:</td>
                <td style="padding: 8px 0; color: #111;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0; color: #111;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Phone:</td>
                <td style="padding: 8px 0; color: #111;">${phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Date:</td>
                <td style="padding: 8px 0; color: #111;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Department:</td>
                <td style="padding: 8px 0; color: #111;">${departmentFormatted}</td>
              </tr>
            </table>
            ${
              message
                ? `
              <hr style="margin: 16px 0; border: none; border-top: 1px solid #e0e0e0;" />
              <h4 style="color: #555; margin-bottom: 8px;">Additional Notes:</h4>
              <p style="color: #111; line-height: 1.6; background: #f9f9f9; padding: 12px; border-radius: 6px;">${message}</p>
            `
                : ""
            }
          </div>
          <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #888;">
            Sent via Medix Appointment Booking
          </div>
        </div>
      `,
    });

    // ── 2. User confirmation email ───────────────────────────────────────────
    await transporter.sendMail({
      from: `"Medix Healthcare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Appointment Confirmation — ${formattedDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background: #16a34a; padding: 24px; text-align: center;">
            <h2 style="color: #fff; margin: 0;">✅ Appointment Confirmed</h2>
          </div>
          <div style="padding: 24px;">
            <p style="color: #111; font-size: 15px;">Dear <strong>${fullName}</strong>,</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Thank you for booking an appointment with <strong>Medix Healthcare</strong>.
              Your appointment request has been received and confirmed. Here are your booking details:
            </p>
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; width: 140px; color: #555;">Date:</td>
                  <td style="padding: 6px 0; color: #111;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #555;">Department:</td>
                  <td style="padding: 6px 0; color: #111;">${departmentFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; color: #555;">Phone:</td>
                  <td style="padding: 6px 0; color: #111;">${phone}</td>
                </tr>
              </table>
            </div>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Our team will reach out to you shortly with further details including your assigned doctor and exact time slot.
            </p>
            <p style="color: #555; font-size: 14px;">
              For any queries or emergencies, please contact us at:<br/>
              📞 <strong>+92 300 0000000</strong>
            </p>
            <p style="color: #111; font-size: 14px; margin-top: 24px;">
              Warm regards,<br/>
              <strong>Medix Healthcare Team</strong>
            </p>
          </div>
          <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 12px; color: #888;">
            © Medix Healthcare — This is an automated confirmation email.
          </div>
        </div>
      `,
    });

    res.status(200).json({ message: "Appointment request sent successfully." });
  } catch (error) {
    console.error("Appointment email error:", error);
    res.status(500).json({ message: "Failed to submit appointment. Please try again." });
  }
});

export default router;