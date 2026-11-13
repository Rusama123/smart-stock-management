// src/Admin/pages/header.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { to: "/",            label: "Home" },
  { to: "/about",       label: "About" },
  { to: "/pricing",     label: "Pricing" },
  { to: "/appointment", label: "Appointment" },
  { to: "/contact",     label: "Contact" },
];

const Header = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <style>{`
        /* ─── PUBLIC HEADER ─────────────────────────────────── */
        .pub-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1050;
          background: #ffffff;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          height: 64px;
          display: flex;
          align-items: center;
        }

        .pub-header-inner {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        /* Logo */
        .pub-logo {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        .pub-logo img {
          height: 38px;
          width: auto;
          object-fit: contain;
        }

        /* Desktop Nav */
        .pub-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .pub-nav li a {
          display: block;
          padding: 8px 14px;
          font-size: 14.5px;
          font-weight: 500;
          color: #333;
          text-decoration: none;
          border-radius: 6px;
          transition: background 0.18s, color 0.18s;
          white-space: nowrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .pub-nav li a:hover,
        .pub-nav li a.active {
          background: #f0f7fc;
          color: #005A8B;
        }

        /* Auth Buttons */
        .pub-auth-btns {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .pub-btn-login {
          padding: 7px 16px;
          font-size: 13.5px;
          font-weight: 500;
          color: #005A8B;
          background: transparent;
          border: 1.5px solid #005A8B;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.18s, color 0.18s;
          white-space: nowrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .pub-btn-login:hover {
          background: #005A8B;
          color: #fff;
        }
        .pub-btn-register {
          padding: 7px 16px;
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
          background: #005A8B;
          border: 1.5px solid #005A8B;
          border-radius: 6px;
          cursor: pointer;
          text-decoration: none;
          transition: opacity 0.18s;
          white-space: nowrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .pub-btn-register:hover {
          opacity: 0.85;
          color: #fff;
        }

        /* Hamburger button */
        .pub-hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 38px;
          height: 38px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          flex-shrink: 0;
          transition: background 0.18s;
        }
        .pub-hamburger:hover {
          background: #f0f7fc;
        }
        .pub-hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: #333;
          border-radius: 2px;
          transition: all 0.28s ease;
          transform-origin: center;
        }
        /* Animate to X when open */
        .pub-hamburger.open span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .pub-hamburger.open span:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .pub-hamburger.open span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* Mobile overlay */
        .pub-nav-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 1049;
          animation: fadeInOverlay 0.2s ease;
        }
        .pub-nav-overlay.visible {
          display: block;
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Mobile drawer */
        .pub-mobile-drawer {
          display: none;
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          background: #ffffff;
          z-index: 1050;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          border-top: 1px solid #f0f0f0;
          padding: 12px 16px 20px;
          animation: slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pub-mobile-drawer.open {
          display: block;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .pub-mobile-nav {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pub-mobile-nav li a {
          display: block;
          padding: 12px 16px;
          font-size: 15px;
          font-weight: 500;
          color: #222;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .pub-mobile-nav li a:hover,
        .pub-mobile-nav li a.active {
          background: #f0f7fc;
          color: #005A8B;
        }

        .pub-mobile-auth {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #f0f0f0;
        }
        .pub-mobile-auth a {
          flex: 1;
          text-align: center;
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          text-decoration: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          transition: opacity 0.18s;
        }
        .pub-mobile-auth a.mob-login {
          color: #005A8B;
          border: 1.5px solid #005A8B;
          background: transparent;
        }
        .pub-mobile-auth a.mob-register {
          color: #fff;
          background: #005A8B;
          border: 1.5px solid #005A8B;
        }
        .pub-mobile-auth a:hover {
          opacity: 0.82;
        }

        /* Body offset for fixed header */
        body {
          padding-top: 64px;
        }

        /* ─── RESPONSIVE ──────────────────────────────────────── */
        @media (max-width: 991px) {
          .pub-desktop-nav,
          .pub-auth-btns {
            display: none !important;
          }
          .pub-hamburger {
            display: flex;
          }
        }

        @media (min-width: 992px) {
          .pub-hamburger {
            display: none !important;
          }
          .pub-mobile-drawer {
            display: none !important;
          }
          .pub-nav-overlay {
            display: none !important;
          }
        }
      `}</style>

      {/* Overlay (mobile) */}
      <div
        className={`pub-nav-overlay ${menuOpen ? "visible" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <header id="header" className="pub-header">
        <div className="pub-header-inner" ref={navRef}>

          {/* Logo */}
          <Link to="/" className="pub-logo">
            <img src="/medix.png" alt="Medix Logo" />
          </Link>

          {/* Desktop Nav */}
          <ul className="pub-nav pub-desktop-nav">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={isActive(link.to) ? "active" : ""}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop Auth Buttons */}
          <div className="pub-auth-btns">
            <Link to="/admin/login" className="pub-btn-login">Login</Link>
            <Link to="/admin/register" className="pub-btn-register">Register</Link>
          </div>

          {/* Hamburger (mobile) */}
          <button
            className={`pub-hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`pub-mobile-drawer ${menuOpen ? "open" : ""}`}>
        <ul className="pub-mobile-nav">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={isActive(link.to) ? "active" : ""}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="pub-mobile-auth">
          <Link to="/admin/login" className="mob-login" onClick={() => setMenuOpen(false)}>
            Login
          </Link>
          <Link to="/admin/register" className="mob-register" onClick={() => setMenuOpen(false)}>
            Register
          </Link>
        </div>
      </div>
    </>
  );
};

export default Header;