// src/Admin/pages/PricingPage.jsx  — Clean 2-step flow: Account → Payment
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "./header";
import Footer from "./footer";
import "../Style/pricing.css";
import { reinitPlugins } from "../../hooks/useScripts";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

// ─── Plans ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "basic", name: "Basic", durationLabel: "6 Months", durationKey: "sixMonths",
    subtitle: "Ideal for individual pharmacies starting out", isPopular: false, amount: 1999,
    features: [
      "Full Admin Control Panel",
      "Add up to 3 Pharmacists/Staff",
      "Point of Sale (POS) Billing",
      "Inventory & Batch Expiry Tracking",
      "Expiry & Low-Stock Alerts",
      "Daily Sales & Analytical Reports"
    ],
  },
  {
    id: "standard", name: "Standard", durationLabel: "1 Year", durationKey: "oneYear",
    subtitle: "Complete access with a 12% Discount", isPopular: true, amount: 3499,
    features: [
      "Everything in Basic",
      "Add up to 3 Pharmacists/Staff",
      "12-Month Continuous Service",
      "Save over 12% vs. 6-Month plan",
      "Full Expiry & Reorder Alerts",
      "POS Receipt Printing"
    ],
  },
  {
    id: "professional", name: "Professional", durationLabel: "3 Years", durationKey: "threeYears",
    subtitle: "Long-term access with a 25% Discount", isPopular: false, amount: 8999,
    features: [
      "Everything in Standard",
      "Add up to 3 Pharmacists/Staff",
      "36-Month Long-term Service",
      "Save over 25% vs. 6-Month plan",
      "POS & Receipt Printing",
      "Best Value for Enterprises"
    ],
  },
];

const fmt = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStoredUser() {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
}
function isLoggedIn()    { return !!localStorage.getItem("token"); }
function isSuperAdmin()  { const u = getStoredUser(); return u.role === "superadmin" || u.isSuperAdmin; }

// ─── Field validators ─────────────────────────────────────────────────────────
function vReg(name, val, form) {
  if (!val?.trim()) return "Required";
  if (name === "name"            && val.trim().length < 4)        return "Min 4 characters";
  if (name === "phone"           && !/^\d{11}$/.test(val))        return "Must be exactly 11 digits";
  if (name === "email"           && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email";
  if (name === "password"        && !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(val)) return "8+ chars, 1 uppercase, 1 number";
  if (name === "confirmPassword" && val !== form.password)        return "Passwords do not match";
  return "";
}
function vLogin(name, val) {
  if (!val?.trim()) return "Required";
  if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email";
  return "";
}

// ─── Eye icons ───────────────────────────────────────────────────────────────
const EyeOn = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);
const EyeOff = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
  </svg>
);

// ════════════════════════════════════════════════════════════════
const PricingPage = () => {
  const [plan,      setPlan]      = useState(null);
  const [show,      setShow]      = useState(false);
  // "account" | "payment" | "superadmin"
  const [step,      setStep]      = useState("account");
  // "new" | "existing"
  const [tab,       setTab]       = useState("new");

  const [regForm,   setRegForm]   = useState({ name:"", phone:"", email:"", password:"", confirmPassword:"" });
  const [regErr,    setRegErr]    = useState({});
  const [regTch,    setRegTch]    = useState({});
  const [showPwd,   setShowPwd]   = useState(false);
  const [showCPwd,  setShowCPwd]  = useState(false);
  const [regBusy,   setRegBusy]   = useState(false);
  const [regMsg,    setRegMsg]    = useState({ text:"", type:"" });

  const [lgForm,    setLgForm]    = useState({ email:"", password:"" });
  const [lgErr,     setLgErr]     = useState({});
  const [lgTch,     setLgTch]     = useState({});
  const [showLgPwd, setShowLgPwd] = useState(false);
  const [lgBusy,    setLgBusy]    = useState(false);
  const [lgMsg,     setLgMsg]     = useState({ text:"", type:"" });

  const [payBusy,   setPayBusy]   = useState(false);
  const [payMsg,    setPayMsg]    = useState("");
  const [payUser,   setPayUser]   = useState(null); // { name, email }

  useEffect(() => {
    document.body.className = "pricing-page";
    const t = setTimeout(reinitPlugins, 300);
    return () => { clearTimeout(t); document.body.className = ""; };
  }, []);

  // ── Open modal ───────────────────────────────────────────────
  const open = (p) => {
    setPlan(p);
    setRegMsg({ text:"", type:"" }); setLgMsg({ text:"", type:"" }); setPayMsg("");
    setRegBusy(false); setLgBusy(false); setPayBusy(false);
    setRegForm({ name:"", phone:"", email:"", password:"", confirmPassword:"" });
    setLgForm({ email:"", password:"" });
    setRegErr({}); setRegTch({}); setLgErr({}); setLgTch({});
    setShowPwd(false); setShowCPwd(false); setShowLgPwd(false);

    if (isLoggedIn()) {
      const u = getStoredUser();
      if (isSuperAdmin()) { setPayUser(u); setStep("superadmin"); setShow(true); return; }
      setPayUser(u); setStep("payment"); setShow(true); return;
    }
    setTab("new"); setStep("account"); setShow(true);
  };

  const close = () => { if (regBusy || lgBusy || payBusy) return; setShow(false); };

  // ── Register field change ────────────────────────────────────
  const onReg = (e) => {
    const { name, value } = e.target;
    if (name === "phone" && (value.length > 11 || (value && !/^\d*$/.test(value)))) return;
    const upd = { ...regForm, [name]: value };
    setRegForm(upd);
    setRegTch(p => ({ ...p, [name]: true }));
    setRegErr(p => ({ ...p, [name]: vReg(name, value, upd) }));
  };
  const onRegBlur = (e) => {
    const { name } = e.target;
    setRegTch(p => ({ ...p, [name]: true }));
    setRegErr(p => ({ ...p, [name]: vReg(name, regForm[name], regForm) }));
  };

  // ── Login field change ───────────────────────────────────────
  const onLg = (e) => {
    const { name, value } = e.target;
    setLgForm(p => ({ ...p, [name]: value }));
    setLgTch(p => ({ ...p, [name]: true }));
    setLgErr(p => ({ ...p, [name]: vLogin(name, value) }));
  };
  const onLgBlur = (e) => {
    const { name } = e.target;
    setLgTch(p => ({ ...p, [name]: true }));
    setLgErr(p => ({ ...p, [name]: vLogin(name, lgForm[name]) }));
  };

  // ── REGISTER SUBMIT ──────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegMsg({ text:"", type:"" });
    const fields = ["name", "phone", "email", "password", "confirmPassword"];
    const tch = {}; const errs = {};
    fields.forEach(k => { tch[k] = true; errs[k] = vReg(k, regForm[k], regForm); });
    setRegTch(tch); setRegErr(errs);
    if (Object.values(errs).some(Boolean)) return;

    setRegBusy(true);
    try {
      const res  = await fetch(`${API}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regForm.name.trim(), phone: regForm.phone.trim(),
          email: regForm.email.trim(), password: regForm.password, role: "admin" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = (data.message || "").toLowerCase();

        // ── Already exists → auto-login with same credentials ──
        if (msg.includes("already") || msg.includes("exists")) {
          const lr = await fetch(`${API}/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "admin", email: regForm.email.trim(), password: regForm.password }),
          });
          const ld = await lr.json().catch(() => ({}));

          if (lr.ok && ld.token) {
            localStorage.setItem("token", ld.token);
            localStorage.setItem("user", JSON.stringify(ld.user || {}));
            setPayUser(ld.user || {});
            setStep("payment");
            return;
          }

          const lm = (ld.message || "").toLowerCase();
          if (lm.includes("expired") || lm.includes("no active")) {
            // Expired subscription — bypass login block, go to payment
            setPayUser({ email: regForm.email.trim(), name: regForm.name.trim() || regForm.email.split("@")[0] });
            setStep("payment");
            return;
          }

          setRegMsg({
            text: "This email is already registered. Please switch to 'Already Registered' tab and enter your correct password.",
            type: "warn",
          });
          return;
        }
        throw new Error(data.message || "Registration failed.");
      }

      // ✅ Registered — send verify code in background, go straight to payment
      // (account will be fully activated after payment anyway)
      setPayUser({ name: regForm.name.trim(), email: regForm.email.trim() });
      setRegMsg({ text: "Account created! A verification email has been sent.", type: "success" });
      // Short delay so user sees the message, then proceed
      setTimeout(() => setStep("payment"), 1000);
    } catch (err) {
      setRegMsg({ text: err.message, type: "error" });
    } finally {
      setRegBusy(false);
    }
  };

  // ── LOGIN SUBMIT ─────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLgMsg({ text:"", type:"" });
    const tch = { email: true, password: true };
    const errs = { email: vLogin("email", lgForm.email), password: vLogin("password", lgForm.password) };
    setLgTch(tch); setLgErr(errs);
    if (Object.values(errs).some(Boolean)) return;

    setLgBusy(true);
    try {
      const res  = await fetch(`${API}/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", email: lgForm.email.trim(), password: lgForm.password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = (data.message || "").toLowerCase();
        // Expired subscription → still allow payment (to renew)
        if (msg.includes("expired") || msg.includes("no active")) {
          setPayUser({ email: lgForm.email.trim(), name: lgForm.email.split("@")[0] });
          setStep("payment");
          return;
        }
        throw new Error(data.message || "Incorrect email or password.");
      }

      // ✅ Login success
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user || {}));
      setPayUser(data.user || {});
      setStep("payment");
    } catch (err) {
      setLgMsg({ text: err.message, type: "error" });
    } finally {
      setLgBusy(false);
    }
  };

  // ── STRIPE CHECKOUT ──────────────────────────────────────────
  const handlePay = async (e) => {
    e.preventDefault();
    if (!plan) return;
    setPayBusy(true); setPayMsg("");

    const stored = getStoredUser();
    const email  = stored.email || payUser?.email || "";
    const name   = stored.name  || payUser?.name  || email.split("@")[0];
    const token  = localStorage.getItem("token") || "";

    if (!email) { setPayMsg("Could not find your email. Please go back and try again."); setPayBusy(false); return; }

    try {
      const res  = await fetch(`${API}/api/payment/stripe/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          planId: plan.id, planName: plan.name, planType: "individual",
          amount: plan.amount, duration: plan.durationLabel, durationKey: plan.durationKey,
          teamSize: 1, customerName: name, customerEmail: email,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Payment initiation failed.");
      if (data.redirectUrl) window.location.assign(data.redirectUrl);
      else throw new Error("No redirect URL from server.");
    } catch (err) {
      setPayMsg(err.message || "Unable to start payment. Try again.");
      setPayBusy(false);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────
  const busy = regBusy || lgBusy || payBusy;

  return (
    <>
      <Header />
      <main className="main">
        {/* Page title */}
        <div className="page-title">
          <div className="heading">
            <div className="container">
              <div className="row d-flex justify-content-center text-center">
                <div className="col-lg-8">
                  <h1 className="heading-title">Pricing</h1>
                  <p className="mb-0">Simple, transparent pricing for every pharmacy.</p>
                </div>
              </div>
            </div>
          </div>
          <nav className="breadcrumbs">
            <div className="container">
              <ol>
                <li><Link to="/">Home</Link></li>
                <li className="current">Pricing</li>
              </ol>
            </div>
          </nav>
        </div>

        {/* Plans */}
        <section className="pricing-modern section">
          <div className="container">
            <div className="pricing-heading text-center">
              <h2>Plans that grow with you</h2>
              <p>Choose the plan that fits your pharmacy. Secure payment via Stripe.</p>
            </div>
            <div className="row g-4 mt-1">
              {PLANS.map(p => (
                <div className="col-lg-4 col-md-6" key={p.id}>
                  <article className={`pricing-plan-card ${p.isPopular ? "popular" : ""}`}>
                    {p.isPopular && <span className="popular-badge">Most Popular</span>}
                    <h3>{p.name}</h3>
                    <p className="plan-subtitle">{p.subtitle}</p>
                    <div className="plan-price">{fmt(p.amount)}<span>/ {p.durationLabel}</span></div>
                    <ul className="plan-feature-list">
                      {p.features.map(f => (
                        <li key={f}><i className="bi bi-check2"></i><span>{f}</span></li>
                      ))}
                    </ul>
                    <div className="plan-actions">
                      <button type="button" className="plan-pay-btn" onClick={() => open(p)}>
                        Buy Now
                      </button>
                    </div>
                  </article>
                </div>
              ))}
            </div>
            <p className="pricing-bottom-note">All amounts in PKR. Secure payment via Stripe.</p>
          </div>
        </section>
      </main>
      <Footer />
      <div id="preloader"></div>

      {/* ══════════ MODAL ══════════ */}
      {show && plan && (
        <div className="pricing-payment-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="pricing-payment-modal">

            {/* ── Modal header ── */}
            <div className="payment-modal-header">
              <div>
                <h4>
                  {step === "account"    && (tab === "new" ? "Create Account" : "Login to Your Account")}
                  {step === "payment"    && "Confirm & Pay"}
                  {step === "superadmin" && "Access Information"}
                </h4>
                {step !== "superadmin" && (
                  <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>
                    {plan.name} &bull; {plan.durationLabel} &bull; {fmt(plan.amount)}
                  </p>
                )}
              </div>
              <button type="button" onClick={close} disabled={busy} style={styles.closeBtn}>&times;</button>
            </div>

            {/* ── Step bar (only for account & payment steps) ── */}
            {step !== "superadmin" && (
              <div className="payment-steps" style={{ marginBottom: "18px" }}>
                <div className={`step-item ${step === "account" ? "active" : "done"}`}>
                  <span className="step-dot">{step === "payment" ? "✓" : "1"}</span>
                  <span>Account</span>
                </div>
                <div className="step-line"></div>
                <div className={`step-item ${step === "payment" ? "active" : ""}`}>
                  <span className="step-dot">2</span>
                  <span>Payment</span>
                </div>
              </div>
            )}

            {/* ════ STEP 1: ACCOUNT ════ */}
            {step === "account" && (
              <>
                {/* Tab switcher */}
                <div className="pm-auth-tabs" style={{ marginBottom: "20px" }}>
                  <button type="button"
                    className={`pm-tab-btn ${tab === "new" ? "active" : ""}`}
                    onClick={() => { setTab("new"); setRegMsg({ text:"", type:"" }); setLgMsg({ text:"", type:"" }); }}>
                    New Account
                  </button>
                  <button type="button"
                    className={`pm-tab-btn ${tab === "existing" ? "active" : ""}`}
                    onClick={() => { setTab("existing"); setRegMsg({ text:"", type:"" }); setLgMsg({ text:"", type:"" }); }}>
                    Already Registered
                  </button>
                </div>

                {/* ── New Account form ── */}
                {tab === "new" && (
                  <form onSubmit={handleRegister} noValidate>
                    {[
                      { name:"name",            label:"Full Name",        type:"text",     ph:"Muhammad Ali (min 4 chars)" },
                      { name:"phone",           label:"Phone Number",     type:"tel",      ph:"03XXXXXXXXX (11 digits)", maxLen:11 },
                      { name:"email",           label:"Email Address",    type:"email",    ph:"ali@example.com" },
                    ].map(f => (
                      <div className="pm-field" key={f.name}>
                        <label>{f.label}</label>
                        <input type={f.type} name={f.name} placeholder={f.ph} maxLength={f.maxLen}
                          value={regForm[f.name]} onChange={onReg} onBlur={onRegBlur} disabled={regBusy}
                          className={regTch[f.name] && regErr[f.name] ? "pm-input-error" : ""} />
                        {regTch[f.name] && regErr[f.name] && <span className="pm-err">{regErr[f.name]}</span>}
                      </div>
                    ))}
                    {/* Password */}
                    <div className="pm-field">
                      <label>Password</label>
                      <div className="pm-pwd-wrap">
                        <input type={showPwd ? "text" : "password"} name="password"
                          placeholder="8+ chars, 1 uppercase, 1 number"
                          value={regForm.password} onChange={onReg} onBlur={onRegBlur} disabled={regBusy}
                          className={regTch.password && regErr.password ? "pm-input-error" : ""} />
                        <span className="pm-eye" onClick={() => setShowPwd(v => !v)}>{showPwd ? <EyeOn/> : <EyeOff/>}</span>
                      </div>
                      {regTch.password && regErr.password && <span className="pm-err">{regErr.password}</span>}
                    </div>
                    {/* Confirm password */}
                    <div className="pm-field">
                      <label>Confirm Password</label>
                      <div className="pm-pwd-wrap">
                        <input type={showCPwd ? "text" : "password"} name="confirmPassword"
                          placeholder="Repeat password"
                          value={regForm.confirmPassword} onChange={onReg} onBlur={onRegBlur} disabled={regBusy}
                          className={regTch.confirmPassword && regErr.confirmPassword ? "pm-input-error" : ""} />
                        <span className="pm-eye" onClick={() => setShowCPwd(v => !v)}>{showCPwd ? <EyeOn/> : <EyeOff/>}</span>
                      </div>
                      {regTch.confirmPassword && regErr.confirmPassword && <span className="pm-err">{regErr.confirmPassword}</span>}
                    </div>

                    {regMsg.text && <MsgBox msg={regMsg} />}

                    <button type="submit" className="payment-submit-btn" disabled={regBusy}>
                      {regBusy ? "Creating account…" : "Register & Continue →"}
                    </button>
                  </form>
                )}

                {/* ── Already Registered form ── */}
                {tab === "existing" && (
                  <form onSubmit={handleLogin} noValidate>
                    <div style={styles.loginInfo}>
                      <i className="bi bi-person-check-fill" style={{ fontSize: "18px" }}></i>
                      <span>Login to your existing Medix account to proceed to payment.</span>
                    </div>

                    <div className="pm-field">
                      <label>Email Address</label>
                      <input type="email" name="email" placeholder="your@email.com"
                        value={lgForm.email} onChange={onLg} onBlur={onLgBlur} disabled={lgBusy}
                        className={lgTch.email && lgErr.email ? "pm-input-error" : ""} />
                      {lgTch.email && lgErr.email && <span className="pm-err">{lgErr.email}</span>}
                    </div>

                    <div className="pm-field">
                      <label>Password</label>
                      <div className="pm-pwd-wrap">
                        <input type={showLgPwd ? "text" : "password"} name="password"
                          placeholder="Your password"
                          value={lgForm.password} onChange={onLg} onBlur={onLgBlur} disabled={lgBusy}
                          className={lgTch.password && lgErr.password ? "pm-input-error" : ""} />
                        <span className="pm-eye" onClick={() => setShowLgPwd(v => !v)}>{showLgPwd ? <EyeOn/> : <EyeOff/>}</span>
                      </div>
                      {lgTch.password && lgErr.password && <span className="pm-err">{lgErr.password}</span>}
                    </div>

                    {lgMsg.text && <MsgBox msg={lgMsg} />}

                    <button type="submit" className="payment-submit-btn" disabled={lgBusy}>
                      {lgBusy ? "Logging in…" : "Login & Continue →"}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ════ STEP 2: PAYMENT ════ */}
            {step === "payment" && (
              <form onSubmit={handlePay}>
                {/* Logged-in user card */}
                {(payUser?.email || payUser?.name) && (
                  <div style={styles.userCard}>
                    <i className="bi bi-person-circle" style={{ fontSize: "28px", color: "#16a34a" }}></i>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>{payUser?.name || "Account"}</div>
                      <div style={{ color: "#6b7280", fontSize: "12px" }}>{payUser?.email || ""}</div>
                    </div>
                  </div>
                )}

                <div className="payment-card-note" style={{ marginBottom: "16px" }}>
                  <i className="bi bi-shield-lock"></i>
                  You&apos;ll be redirected to Stripe&apos;s secure checkout. Card / Debit accepted.
                </div>

                {/* Summary */}
                <div className="payment-summary">
                  <div><span>Plan</span><strong>{plan.name}</strong></div>
                  <div><span>Duration</span><strong>{plan.durationLabel}</strong></div>
                  <div><span>Payment</span><strong>Stripe (Card / Debit)</strong></div>
                  <div><span>Sub-users included</span><strong>Up to 3 pharmacists</strong></div>
                  <div className="summary-total"><span>Total</span><strong>{fmt(plan.amount)}</strong></div>
                </div>

                {payMsg && <p style={{ color: "#dc2626", fontSize: "13px", textAlign: "center", margin: "0 0 12px" }}>{payMsg}</p>}

                <button type="submit" className="payment-submit-btn" disabled={payBusy}>
                  {payBusy ? "Redirecting…" : "Proceed to Secure Payment →"}
                </button>

                <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "12px", marginTop: "10px" }}>
                  <i className="bi bi-lock"></i> Powered by Stripe. Card details never stored on our servers.
                </p>
              </form>
            )}

            {/* ════ SUPER ADMIN BLOCKED ════ */}
            {step === "superadmin" && (
              <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                <div style={{ fontSize: "52px", marginBottom: "12px" }}>🛡️</div>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#005A8B", margin: "0 0 10px" }}>
                  You have Unlimited Access
                </h3>
                <p style={{ color: "#555", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
                  As <strong>Super Admin</strong>, you have permanent unlimited access to all features.
                  You do not need to purchase any plan.
                </p>
                <div style={styles.saInfo}>
                  <Row label="Account" value={payUser?.email || ""} />
                  <Row label="Role" value="Super Admin" color="#005A8B" />
                  <Row label="Access" value="✓ Unlimited & Permanent" color="#16a34a" last />
                </div>
                <button type="button" onClick={close} className="payment-submit-btn">
                  Got it — Close
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Styles are in pricing.css */}
    </>
  );
};

// ─── Small helpers ────────────────────────────────────────────────────────────
const styles = {
  closeBtn: { background:"none", border:"none", fontSize:"22px", color:"#6b7280", cursor:"pointer", lineHeight:1, padding:"0 4px" },
  loginInfo: { display:"flex", alignItems:"flex-start", gap:"8px", background:"#f0f7fc",
                border:"1px solid #c3dafe", color:"#1e40af", borderRadius:"8px",
                padding:"10px 14px", fontSize:"13px", marginBottom:"16px" },
  userCard: { display:"flex", alignItems:"center", gap:"10px", background:"#f0fdf4",
               border:"1px solid #86efac", borderRadius:"8px", padding:"10px 14px", marginBottom:"14px" },
  saInfo: { background:"#f0f7fc", border:"1px solid #c3dafe", borderRadius:"10px",
             padding:"14px 16px", marginBottom:"20px", textAlign:"left" },
};

const MsgBox = ({ msg }) => {
  const cfg = {
    warn:    { bg:"#fffbeb", border:"#fde68a", color:"#92400e", icon:"bi-exclamation-triangle-fill", ic:"#d97706" },
    error:   { bg:"#fff8f8", border:"#fca5a5", color:"#991b1b", icon:"bi-x-circle-fill",             ic:"#dc2626" },
    success: { bg:"#f0fdf4", border:"#86efac", color:"#14532d", icon:"bi-check-circle-fill",          ic:"#16a34a" },
  };
  const c = cfg[msg.type] || cfg.error;
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:"8px", background:c.bg,
                  border:`1px solid ${c.border}`, color:c.color, borderRadius:"8px",
                  padding:"10px 14px", fontSize:"13px", marginBottom:"14px", lineHeight:"1.5" }}>
      <i className={`bi ${c.icon}`} style={{ color:c.ic, flexShrink:0, marginTop:"2px" }}></i>
      <span>{msg.text}</span>
    </div>
  );
};

const Row = ({ label, value, color, last }) => (
  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13.5px",
                padding:"5px 0", borderBottom: last ? "none" : "1px solid #e5e7eb" }}>
    <span>{label}</span>
    <strong style={color ? { color } : {}}>{value}</strong>
  </div>
);

export default PricingPage;