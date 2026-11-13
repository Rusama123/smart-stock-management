// src/Admin/pages/PaymentCancel.jsx
import { Link } from "react-router-dom";

const PaymentCancel = () => (
  <div style={styles.page}>
    <div style={styles.card}>
      <div style={styles.icon}>🚫</div>
      <h2 style={styles.heading}>Payment Cancelled</h2>
      <p style={styles.sub}>
        Your payment was cancelled. No amount has been charged. You can go back
        and try again anytime.
      </p>
      <Link to="/pricing" style={styles.btn}>
        Back to Pricing
      </Link>
    </div>
  </div>
);

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #fff5f5 0%, #fff 100%)",
    padding: "20px",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "48px 40px",
    maxWidth: "440px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
  },
  icon: { fontSize: "52px", marginBottom: "16px" },
  heading: { fontSize: "22px", fontWeight: "700", color: "#dc2626", margin: "0 0 8px" },
  sub: { color: "#666", fontSize: "15px", marginBottom: "28px" },
  btn: {
    display: "inline-block",
    background: "#1a73e8",
    color: "white",
    padding: "13px 32px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "15px",
  },
};

export default PaymentCancel;