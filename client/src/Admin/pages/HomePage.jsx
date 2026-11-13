// src/Admin/pages/HomePage.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "./header";
import Footer from "./footer";
import { reinitPlugins } from "../../hooks/useScripts";

const HomePage = () => {
  useEffect(() => {
    document.body.className = "index-page";
    const t = setTimeout(reinitPlugins, 300);
    return () => {
      clearTimeout(t);
      document.body.className = "";
    };
  }, []);

  return (
    <>
      <Header />

      <main className="main">

        {/* ── Hero Section ── */}
        <section id="hero" className="hero section">
          <div className="container" data-aos="fade-up" data-aos-delay="100">
            <div className="row align-items-center">

              <div className="col-lg-6">
                <div className="hero-content">
                  <div className="trust-badges mb-4" data-aos="fade-right" data-aos-delay="200">
                    <div className="badge-item"><i className="bi bi-shield-check"></i><span>Secure POS</span></div>
                    <div className="badge-item"><i className="bi bi-bell"></i><span>Real-Time Alerts</span></div>
                    <div className="badge-item"><i className="bi bi-star-fill"></i><span>4.9/5 Rating</span></div>
                  </div>

                  <h1 data-aos="fade-right" data-aos-delay="300">
                    Smart <span className="highlight">AI-Powered</span> Pharmacy Stock & POS System
                  </h1>

                  <p className="hero-description" data-aos="fade-right" data-aos-delay="400">
                    Optimize your pharmacy operations with Medix. Manage inventory in real-time, get automated batch-wise expiry alerts, handle staff access, and complete sales with our lightning-fast POS billing system.
                  </p>

                  <div className="hero-stats mb-4" data-aos="fade-right" data-aos-delay="500">
                    <div className="stat-item">
                      <h3>500+</h3>
                      <p>Pharmacies Served</p>
                    </div>
                    <div className="stat-item">
                      <h3>100%</h3>
                      <p>Expiry Accuracy</p>
                    </div>
                    <div className="stat-item">
                      <h3>24/7</h3>
                      <p>Cloud Access</p>
                    </div>
                  </div>
                  <div className="hero-actions" data-aos="fade-right" data-aos-delay="600">
                    <Link to="/pricing" className="btn btn-primary">Get Started Now</Link>
                    <Link to="/pricing" className="btn btn-outline">
                      <i className="bi bi-tags-fill me-2"></i>View Pricing Plans
                    </Link>
                  </div>

                  <div className="emergency-contact" data-aos="fade-right" data-aos-delay="700">
                    <div className="emergency-icon"><i className="bi bi-patch-check-fill"></i></div>
                    <div className="emergency-info">
                      <small>Medix Enterprise</small>
                      <strong>SaaS Billing Software</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="hero-visual" data-aos="fade-left" data-aos-delay="400">
                  <div className="main-image">
                    <img src="assets/img/health/facilities-6.webp" alt="Modern Pharmacy Facility" className="img-fluid" />
                    <div className="floating-card appointment-card">
                      <div className="card-icon"><i className="bi bi-cart-check"></i></div>
                      <div className="card-content">
                        <h6>POS Billing</h6>
                        <p>Instant Receipts</p>
                        <small>Print Thermal Invoices</small>
                      </div>
                    </div>
                    <div className="floating-card rating-card">
                      <div className="card-content">
                        <div className="rating-stars">
                          <i className="bi bi-star-fill"></i>
                          <i className="bi bi-star-fill"></i>
                          <i className="bi bi-star-fill"></i>
                          <i className="bi bi-star-fill"></i>
                          <i className="bi bi-star-fill"></i>
                        </div>
                        <h6>4.9/5</h6>
                        <small>Trusted by Owners</small>
                      </div>
                    </div>
                  </div>
                  <div className="background-elements">
                    <div className="element element-1"></div>
                    <div className="element element-2"></div>
                    <div className="element element-3"></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── AI Inventory Assistant Section ── */}
        <section id="home-about" className="home-about section">
          <div className="container" data-aos="fade-up" data-aos-delay="100">
            <div className="row align-items-center">

              <div className="col-lg-6 mb-5 mb-lg-0" data-aos="fade-right" data-aos-delay="200">
                <div className="about-content">
                  <h2 className="section-heading">Smart Expiry & Reorder Alerts at Your Fingertips</h2>
                  <p className="lead-text">
                    Worried about medicine expiry losses? Simply add your batches with their expiry dates and let Medix handle the rest with automatic visual alerts.
                  </p>
                  <p>
                    Our software keeps track of every single batch's expiry and alerts you exactly 7 days, 3 days, and 1 day before expiration. We also suggest reorders for items running low in stock (less than 10 units) so that you never run out of crucial life-saving medicines.
                  </p>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <div className="stat-number">3 Users</div>
                      <div className="stat-label">Allowed per Admin</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number">100%</div>
                      <div className="stat-label">Visual Control</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-number">0%</div>
                      <div className="stat-label">Expiry Loss Risk</div>
                    </div>
                  </div>
                  <div className="cta-section">
                    <Link to="/pricing" className="btn-primary">Choose Your Plan</Link>
                  </div>
                </div>
              </div>

              <div className="col-lg-6" data-aos="fade-left" data-aos-delay="300">
                <div className="about-visual">
                  <div className="main-image">
                    <img src="assets/img/health/facilities-9.webp" alt="AI Stock Manager" className="img-fluid" />
                  </div>
                  <div className="floating-card">
                    <div className="card-content">
                      <div className="icon"><i className="bi bi-bell-fill"></i></div>
                      <div className="card-text">
                        <h4>Smart Notifications</h4>
                        <p>Get alerted on low stock & expiring medicine batches</p>
                      </div>
                    </div>
                  </div>
                  <div className="experience-badge">
                    <div className="badge-content">
                      <span className="years">100%</span>
                      <span className="text">Secure & Safe</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Featured Modules ── */}
        <section id="featured-departments" className="featured-departments section">
          <div className="container section-title" data-aos="fade-up">
            <h2>Our Core Software Modules</h2>
            <p>Everything you need to run your retail pharmacy operations professionally</p>
          </div>

          <div className="container" data-aos="fade-up" data-aos-delay="100">
            <div className="row g-5">

              <div className="col-lg-6" data-aos="zoom-in" data-aos-delay="100">
                <div className="specialty-card">
                  <div className="specialty-content">
                    <div className="specialty-meta"><span className="specialty-label">POS Billing</span></div>
                    <h3>Point of Sale (POS) Billing</h3>
                    <p>Make sales effortlessly with our retail billing terminal. Search medicines instantly by brand/generic name, calculate total billing with no tax, record checkout payment modes, and print formal invoices.</p>
                    <div className="specialty-features">
                      <span><i className="bi bi-check-circle-fill"></i>Fast Receipt Thermal Printing</span>
                      <span><i className="bi bi-check-circle-fill"></i>Automatic Stock Deduction</span>
                    </div>
                  </div>
                  <div className="specialty-visual">
                    <div className="visual-overlay"><i className="bi bi-cart3"></i></div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6" data-aos="zoom-in" data-aos-delay="200">
                <div className="specialty-card">
                  <div className="specialty-content">
                    <div className="specialty-meta"><span className="specialty-label">Stock Control</span></div>
                    <h3>Batch & Expiry Control</h3>
                    <p>Add medicines with optional barcode fields. Record multiple batch numbers, individual batch quantities, and set respective expiry dates to keep your inventory accurate and organized.</p>
                    <div className="specialty-features">
                      <span><i className="bi bi-check-circle-fill"></i>Prevent Expired Medicine Sales</span>
                      <span><i className="bi bi-check-circle-fill"></i>Dynamic Barcode Scanner Support</span>
                    </div>
                  </div>
                  <div className="specialty-visual">
                    <div className="visual-overlay"><i className="bi bi-box-seam"></i></div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4" data-aos="fade-up" data-aos-delay="100">
                <div className="department-highlight">
                  <div className="highlight-icon"><i className="bi bi-people-fill"></i></div>
                  <h4>Staff & Role Management</h4>
                  <p>As an Admin, invite and manage up to 3 staff pharmacists. Assign specific user accounts to your team so they can process POS sales securely.</p>
                  <ul className="highlight-list">
                    <li>Add Pharmacist accounts</li>
                    <li>Toggle user access status</li>
                    <li>Secure password verification</li>
                  </ul>
                </div>
              </div>

              <div className="col-lg-4" data-aos="fade-up" data-aos-delay="200">
                <div className="department-highlight">
                  <div className="highlight-icon"><i className="bi bi-truck"></i></div>
                  <h4>Supplier Directory</h4>
                  <p>Maintain detailed supplier directories to make inventory purchasing easier. Track contact details, city locations, and delivery history.</p>
                  <ul className="highlight-list">
                    <li>Add & edit supplier records</li>
                    <li>Supplier stock statistics</li>
                    <li>Search by city & phone number</li>
                  </ul>
                </div>
              </div>

              <div className="col-lg-4" data-aos="fade-up" data-aos-delay="300">
                <div className="department-highlight">
                  <div className="highlight-icon"><i className="bi bi-graph-up-arrow"></i></div>
                  <h4>Analytics & Sales Reports</h4>
                  <p>Track business health with real-time graphs showing daily, monthly, and yearly sales patterns. View net profits, top-selling items, and stock value.</p>
                  <ul className="highlight-list">
                    <li>Dynamic charts filtering</li>
                    <li>Total stock value estimation</li>
                    <li>Low-stock status suggestions</li>
                  </ul>
                </div>
              </div>

            </div>

            <div className="emergency-banner" data-aos="fade-up" data-aos-delay="400">
              <div className="row align-items-center">
                <div className="col-lg-8">
                  <div className="emergency-content">
                    <h3>Secure & Compliant Cloud Billing System</h3>
                    <p>Your pharmacy database is securely stored and protected. Our system complies with healthcare standard stock-keeping best practices.</p>
                  </div>
                </div>
                <div className="col-lg-4 text-lg-end">
                  <Link to="/pricing" className="emergency-btn">
                    <i className="bi bi-cash-stack"></i> See Pricing Plans
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="featured-services" className="featured-services section">
          <div className="container section-title" data-aos="fade-up">
            <h2>How It Works</h2>
            <p>Modernize your pharmacy billing and inventory in three simple steps</p>
          </div>

          <div className="container" data-aos="fade-up" data-aos-delay="100">
            <div className="row g-0">
              <div className="col-lg-8" data-aos="fade-right" data-aos-delay="200">
                <div className="featured-service-main">
                  <div className="service-image-wrapper">
                    <img src="assets/img/health/consultation-4.webp" alt="POS Software Demo" className="img-fluid" loading="lazy" />
                    <div className="service-overlay">
                      <div className="service-badge">
                        <i className="bi bi-cart3"></i>
                        <span>Medix Retail POS</span>
                      </div>
                    </div>
                  </div>
                  <div className="service-details">
                    <h2>Complete Control of Your Retail Shop</h2>
                    <p>
                      Register an account, select a pricing plan, and start logging your medicine batches. You can assign accounts to your staff members, register barcode numbers, and bill customers with instant printed receipts in a unified portal.
                    </p>
                    <Link to="/pricing" className="main-cta">Explore Subscription Plans</Link>
                  </div>
                </div>
              </div>

              <div className="col-lg-4" data-aos="fade-left" data-aos-delay="300">
                <div className="services-sidebar">
                  {[
                    { icon: "bi-shield-lock", title: "1. Choose Your Plan", desc: "Select from our Basic, Standard, or Professional SaaS subscription plans to register your admin account.", delay: 400 },
                    { icon: "bi-box-seam", title: "2. Load Your Inventory", desc: "Add medicines, barcodes, and batches with expiry dates. Optional supplier details can be added for seamless stock mapping.", delay: 500 },
                    { icon: "bi-printer", title: "3. Start Billing Customers", desc: "Bill walk-in customers instantly from the Point of Sale panel and print thermal billing receipts in one click.", delay: 600 },
                  ].map((s, i) => (
                    <div key={i} className="service-item" data-aos="fade-up" data-aos-delay={s.delay}>
                      <div className="service-icon-wrapper"><i className={`bi ${s.icon}`}></i></div>
                      <div className="service-info">
                        <h4>{s.title}</h4>
                        <p>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Call To Action ── */}
        <section id="call-to-action" className="call-to-action section light-background">
          <div className="container" data-aos="fade-up" data-aos-delay="100">
            <div className="hero-content">
              <div className="row align-items-center">
                <div className="col-lg-6">
                  <div className="content-wrapper" data-aos="fade-up" data-aos-delay="200">
                    <h1>Modernize Your Pharmacy Business Today</h1>
                    <p>
                      Eliminate manual writing errors, protect your pharmacy from expiry date losses, and speed up billing operations with Medix Pharmacy Management System. Register now to experience seamless stock administration.
                    </p>
                    <div className="cta-wrapper">
                      <Link to="/pricing" className="primary-cta">
                        <span>Get Started Now</span><i className="bi bi-arrow-right"></i>
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="image-container" data-aos="fade-left" data-aos-delay="300">
                    <img src="assets/img/health/facilities-9.webp" alt="Pharmacy Stock SaaS" className="img-fluid" />
                  </div>
                </div>
              </div>
            </div>

            <div className="features-section">
              <div className="row g-0">
                {[
                  { icon: "bi-bell-fill", title: "Automated Expiry Alerts", desc: "Know exactly when batches approach expiration date and prevent billing of expired drugs.", delay: 200 },
                  { icon: "bi-printer-fill", title: "Fast POS Receipts", desc: "Simple customer billing with thermal receipt print layouts to professionalize your customer care.", delay: 300 },
                  { icon: "bi-people-fill", title: "Staff Pharmacists (Max 3)", desc: "Invite up to three pharmacists/staff operators to work concurrently under your pharmacy group.", delay: 400 },
                ].map((f, i) => (
                  <div key={i} className="col-lg-4">
                    <div className="feature-block" data-aos="fade-up" data-aos-delay={f.delay}>
                      <div className="feature-icon"><i className={`bi ${f.icon}`}></i></div>
                      <h3>{f.title}</h3>
                      <p>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <div id="preloader"></div>
    </>
  );
};

export default HomePage;