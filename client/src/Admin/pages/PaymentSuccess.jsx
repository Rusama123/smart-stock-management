// src/Admin/pages/PaymentSuccess.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const PAYMENT_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const PaymentSuccess = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "failed"
  const [order, setOrder]   = useState(null);
  const [error, setError]   = useState("");
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("failed");
      setError("No session ID found. Please contact support.");
      return;
    }

    fetch(`${PAYMENT_API_BASE_URL}/api/payment/stripe/verify?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setOrder(data.order);

          // ✅ Update localStorage with fresh subscription data
          if (data.user) {
            try {
              const existing = JSON.parse(localStorage.getItem("user") || "{}");
              const updated  = {
                ...existing,
                ...data.user,
                subscriptionEndDate: data.user.subscriptionEndDate,
                hasAccess:           true,
                isVerified:          true,
                planName:            data.user.planName || data.order?.planName || "",
              };
              localStorage.setItem("user", JSON.stringify(updated));
              // Check if they were already logged in so we can show dashboard button
              if (existing.id || existing._id || existing.email) {
                setAlreadyLoggedIn(true);
              }
            } catch (_) {}
          } else {
            // Even without user object, check if there's an existing session
            const existingUser = localStorage.getItem("user");
            if (existingUser) {
              try {
                const u = JSON.parse(existingUser);
                if (u.email && data.order?.customerEmail &&
                    u.email.toLowerCase() === (data.order.customerEmail || "").toLowerCase()) {
                  u.subscriptionEndDate = data.order.subscriptionEndDate;
                  u.hasAccess           = true;
                  u.planName            = data.order.planName;
                  localStorage.setItem("user", JSON.stringify(u));
                  setAlreadyLoggedIn(true);
                }
              } catch (_) {}
            }
          }

          setStatus("success");
        } else {
          setStatus("failed");
          setError(data.message || "Payment verification failed.");
        }
      })
      .catch(() => {
        setStatus("failed");
        setError("Could not verify payment. Please contact support.");
      });
  }, [searchParams]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-PK", {
      day: "numeric", month: "long", year: "numeric"
    });
  };

  const getDashboardPath = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u.role === "superadmin" || u.role === "admin") return "/Admin/control-panel/admin-control";
      if (u.role === "user") return "/admin/pages/dashboard";
    } catch (_) {}
    return "/admin/login";
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* ── LOADING ── */}
        {status === "loading" && (
          <>
            <div style={s.spinner}></div>
            <h2 style={s.heading}>Verifying your payment…</h2>
            <p style={s.sub}>Please wait, do not close this tab.</p>
          </>
        )}

        {/* ── SUCCESS ── */}
        {status === "success" && order && (
          <>
            {/* Animated checkmark */}
            <div style={s.successIcon}>
              <svg viewBox="0 0 52 52" style={{ width: 64, height: 64 }}>
                <circle cx="26" cy="26" r="25" fill="none" stroke="#16a34a" strokeWidth="2"
                  style={{ strokeDasharray: 166, strokeDashoffset: 166, animation: "circleAnim 0.6s ease forwards" }} />
                <path fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  d="M14 27l8 8 16-16"
                  style={{ strokeDasharray: 48, strokeDashoffset: 48, animation: "checkAnim 0.4s ease 0.5s forwards" }} />
              </svg>
            </div>

            <h2 style={{ ...s.heading, color: "#16a34a" }}>Payment Successful!</h2>
            <p style={s.sub}>
              🎉 Your account is now <strong>active</strong>.
              A confirmation email has been sent.
            </p>

            {/* Subscription end date — most important info */}
            {order.subscriptionEndDate && (
              <div style={s.expiryBanner}>
                <span style={s.expiryLabel}>Your subscription is active until</span>
                <span style={s.expiryDate}>{formatDate(order.subscriptionEndDate)}</span>
                <span style={s.expiryNote}>Your pharmacists also have access for the same period.</span>
              </div>
            )}

            {/* Order details */}
            <div style={s.summary}>
              <div style={s.summaryRow}>
                <span>Plan</span>
                <strong>{order.planName}</strong>
              </div>
              <div style={s.summaryRow}>
                <span>Duration</span>
                <strong>{order.duration}</strong>
              </div>
              <div style={s.summaryRow}>
                <span>Amount Paid</span>
                <strong>PKR {Number(order.amount).toLocaleString("en-PK")}</strong>
              </div>
              <div style={{ ...s.summaryRow, borderBottom: "none" }}>
                <span>Transaction ID</span>
                <strong style={{ fontSize: "11px", color: "#888" }}>{order.txnRefNo}</strong>
              </div>
            </div>

            {/* CTA buttons */}
            <div style={s.btnGroup}>
              {alreadyLoggedIn ? (
                <Link to={getDashboardPath()} style={s.btnPrimary}>
                  Go to Dashboard →
                </Link>
              ) : (
                <Link to="/admin/login" style={s.btnPrimary}>
                  Login to Dashboard →
                </Link>
              )}
              <Link to="/pricing" style={s.btnSecondary}>
                View Plans
              </Link>
            </div>
          </>
        )}

        {/* ── FAILED ── */}
        {status === "failed" && (
          <>
            <div style={s.failIcon}>❌</div>
            <h2 style={{ ...s.heading, color: "#dc2626" }}>Payment Failed</h2>
            <p style={s.sub}>{error}</p>
            <div style={s.btnGroup}>
              <Link to="/pricing" style={{ ...s.btnPrimary, background: "#dc2626" }}>
                Back to Pricing
              </Link>
              <a href="mailto:support@medix.com" style={s.btnSecondary}>
                Contact Support
              </a>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes circleAnim {
          to { stroke-dashoffset: 0; }
        }
        @keyframes checkAnim {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f0f7fc 0%, #e8f5e9 100%)",
    padding: "20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "48px 40px",
    maxWidth: "500px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 12px 48px rgba(0,0,0,0.10)",
    animation: "fadeSlideUp 0.4s ease",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #005A8B",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 24px",
  },
  successIcon: {
    marginBottom: "16px",
    display: "flex",
    justifyContent: "center",
  },
  failIcon: {
    fontSize: "56px",
    marginBottom: "16px",
  },
  heading: {
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 0 8px",
    color: "#111",
  },
  sub: {
    color: "#555",
    fontSize: "15px",
    marginBottom: "22px",
    lineHeight: "1.6",
  },
  expiryBanner: {
    background: "linear-gradient(135deg, #005A8B, #0077B6)",
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    color: "#fff",
  },
  expiryLabel: {
    fontSize: "12px",
    opacity: 0.85,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "600",
  },
  expiryDate: {
    fontSize: "22px",
    fontWeight: "800",
    letterSpacing: "-0.3px",
  },
  expiryNote: {
    fontSize: "12px",
    opacity: 0.8,
    marginTop: "2px",
  },
  summary: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "14px 18px",
    marginBottom: "22px",
    textAlign: "left",
    border: "1px solid #e5e7eb",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 0",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "13.5px",
    color: "#444",
  },
  btnGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  btnPrimary: {
    display: "block",
    background: "#005A8B",
    color: "white",
    padding: "13px 24px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: "700",
    fontSize: "15px",
    transition: "background 0.2s",
    border: "none",
    cursor: "pointer",
  },
  btnSecondary: {
    display: "block",
    background: "transparent",
    color: "#005A8B",
    padding: "12px 24px",
    borderRadius: "10px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "14px",
    border: "1.5px solid #005A8B",
    transition: "background 0.2s",
  },
};

export default PaymentSuccess;