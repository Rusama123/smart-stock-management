import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const pages = [
    { name: 'Dashboard', path: '/admin/pages/dashboard', icon: '⊟' },
    { name: 'Inventory', path: '/admin/pages/inventory', icon: '⊞' },
    { name: 'Alerts', path: '/admin/pages/alerts', icon: '⊛' },
    { name: 'Suppliers', path: '/admin/pages/suppliers', icon: '⊕' },
    { name: 'PharmacyPOS', path: '/admin/pages/PharmacyPOS', icon: '⊗' },
  ];

  return (
    <footer style={styles.footer}>
      {/* Top accent line */}
      <div style={styles.accentLine} />

      <div style={styles.container}>
        {/* Main Grid */}
        <div style={styles.grid}>

          {/* Brand Column */}
          <div style={styles.brandCol}>
            {/* Logo */}
            <div style={styles.logoWrapper}>
              <img src="/medix.png" alt="Medix Logo" style={styles.logo} />
            </div>
            <p style={styles.tagline}>
              Intelligent Pharmacy Management System — streamlining inventory, alerts, and POS for modern healthcare.
            </p>

            {/* Social Icons */}
            <div style={styles.socialRow}>
              <a
                href="https://linkedin.com/in/usama.rana"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.socialBtn}
                title="LinkedIn"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="mailto:usama.rana.tech@gmail.com"
                style={styles.socialBtn}
                title="Email"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              </a>
              <a
                href="tel:03261342366"
                style={styles.socialBtn}
                title="Phone"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Pages Column */}
          <div style={styles.col}>
            <h3 style={styles.colTitle}>
              <span style={styles.colTitleBar} />
              Quick Links
            </h3>
            <ul style={styles.linkList}>
              {pages.map((item) => (
                <li key={item.name} style={styles.linkItem}>
                  <a href={item.path} style={styles.link}>
                    <span style={styles.linkDot} />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div style={styles.col}>
            <h3 style={styles.colTitle}>
              <span style={styles.colTitleBar} />
              Contact Us
            </h3>

            <div style={styles.contactList}>
              <ContactItem
                icon={
                  <svg width="16" height="16" fill="#1289C8" viewBox="0 0 20 20">
                    <path d="M10 2C6.13 2 3 5.13 3 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                }
                text="1-KM Defence Road, Bhobatian Chowk, Lahore"
              />
              <ContactItem
                icon={
                  <svg width="16" height="16" fill="#1289C8" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                }
                text="usama.rana.tech@gmail.com"
                href="mailto:usama.rana.tech@gmail.com"
              />
              <ContactItem
                icon={
                  <svg width="16" height="16" fill="#1289C8" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                }
                text="03261342366"
                href="tel:03261342366"
              />
              <ContactItem
                icon={
                  <svg width="16" height="16" fill="#1289C8" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                }
                text="linkedin.com/in/usama.rana"
                href="https://linkedin.com/in/usama.rana"
                external
              />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={styles.bottomBar}>
          <p style={styles.copyright}>
            © {currentYear} Health Care IPMS — Intelligent Pharmacy Management System. All rights reserved.
          </p>
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            System Active
          </div>
        </div>
      </div>

      {/* Responsive styles injected */}
      <style>{responsiveCSS}</style>
    </footer>
  );
};

const ContactItem = ({ icon, text, href, external }) => {
  const content = (
    <div style={contactStyles.item}>
      <span style={contactStyles.iconWrap}>{icon}</span>
      <span style={contactStyles.text}>{text}</span>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        style={contactStyles.link}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return content;
};

const contactStyles = {
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '14px',
  },
  iconWrap: {
    flexShrink: 0,
    marginTop: '2px',
  },
  text: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    transition: 'color 0.3s',
  },
  link: {
    textDecoration: 'none',
    display: 'block',
    color: 'inherit',
  },
};

const styles = {
  footer: {
    backgroundColor: '#002B42',
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    marginTop: '80px',
    position: 'relative',
    overflow: 'hidden',
  },
  accentLine: {
    height: '3px',
    background: 'linear-gradient(90deg, #1289C8 0%, #00c6ff 50%, #1289C8 100%)',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '56px 24px 32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr 1.2fr',
    gap: '48px',
    marginBottom: '48px',
  },
  brandCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  logoWrapper: {
    marginBottom: '20px',
  },
  logo: {
    height: '42px',
    objectFit: 'contain',
    filter: 'brightness(0) invert(1)',
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.875rem',
    lineHeight: '1.7',
    marginBottom: '24px',
    maxWidth: '320px',
  },
  socialRow: {
    display: 'flex',
    gap: '10px',
  },
  socialBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(18,137,200,0.15)',
    color: '#1289C8',
    border: '1px solid rgba(18,137,200,0.3)',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
  },
  colTitle: {
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: '600',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  colTitleBar: {
    display: 'inline-block',
    width: '3px',
    height: '18px',
    borderRadius: '2px',
    backgroundColor: '#1289C8',
    flexShrink: 0,
  },
  linkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  linkItem: {
    marginBottom: '10px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    transition: 'color 0.3s ease',
    padding: '2px 0',
  },
  linkDot: {
    display: 'inline-block',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: '#1289C8',
    flexShrink: 0,
  },
  contactList: {
    display: 'flex',
    flexDirection: 'column',
  },
  bottomBar: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  copyright: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    margin: 0,
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
  },
  badgeDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
  },
};

const responsiveCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

  footer a:hover span[style] {
    color: #1289C8 !important;
  }

  @media (max-width: 900px) {
    footer > div > div:first-of-type {
      grid-template-columns: 1fr 1fr !important;
    }
    footer > div > div:first-of-type > div:first-child {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 580px) {
    footer > div > div:first-of-type {
      grid-template-columns: 1fr !important;
      gap: 32px !important;
    }
    footer > div {
      padding: 40px 16px 24px !important;
    }
    footer > div > div:last-child {
      flex-direction: column !important;
      text-align: center;
    }
  }
`;

export default Footer;