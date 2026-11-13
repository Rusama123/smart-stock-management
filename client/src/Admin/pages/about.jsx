// src/Admin/pages/about.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "./header";
import Footer from "./footer";
import { reinitPlugins } from "../../hooks/useScripts";

const About = () => {
  useEffect(() => {
    document.body.className = "about-page";
    const t = setTimeout(reinitPlugins, 300);
    return () => { clearTimeout(t); document.body.className = ""; };
  }, []);

  return (
    <>
      <Header />
      <main className="main">

        <div className="page-title">
          <div className="heading">
            <div className="container">
              <div className="row d-flex justify-content-center text-center">
                <div className="col-lg-8">
                  <h1 className="heading-title">About Us</h1>
                  <p className="mb-0">
                    We are a pharmacy technology company on a mission to build clean, fast, and intelligent billing and inventory systems for pharmacies and retail healthcare shops.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <nav className="breadcrumbs">
            <div className="container">
              <ol>
                <li><Link to="/">Home</Link></li>
                <li className="current">About</li>
              </ol>
            </div>
          </nav>
        </div>

        <section id="about" className="about section">
          <div className="container" data-aos="fade-up" data-aos-delay="100">

            {/* ── Who We Are ── */}
            <div className="row align-items-center">
              <div className="col-lg-6" data-aos="fade-right" data-aos-delay="100">
                <div className="about-content">
                  <h2>Smarter Pharmacy Management, Powered by Intelligent Cloud Software</h2>
                  <p className="lead">
                    Medix is dedicated to transforming how retail pharmacy shops manage their stock, inventory, and point-of-sale transactions. We combine simple billing processes with robust batch-wise expiry monitoring.
                  </p>
                  <p>
                    Our platform allows pharmacy owners (Admins) to track stock counts in real-time, get visual alerts before medicines expire, manage supplier profiles, and invite up to 3 staff pharmacists to run their POS billing terminal concurrently. We help eliminate manual ledger logging, prevent expiry losses, and ensure fast customer checkout.
                  </p>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-number">500+</span>
                      <span className="stat-label">Pharmacies Served</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">30%</span>
                      <span className="stat-label">Stock Waste Reduction</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">99.9%</span>
                      <span className="stat-label">Billing Uptime</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-6" data-aos="fade-left" data-aos-delay="200">
                <div className="image-wrapper">
                  <img src="assets/img/health/facilities-6.webp" className="img-fluid main-image" alt="Healthcare facility" />
                  <div className="floating-image" data-aos="zoom-in" data-aos-delay="400">
                    <img src="assets/img/health/staff-8.webp" className="img-fluid" alt="Medical team" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── What We Offer ── */}
            <div className="values-section" data-aos="fade-up" data-aos-delay="200">
              <div className="row">
                <div className="col-lg-12 text-center">
                  <h3>What We Offer</h3>
                  <p className="section-description">A complete SaaS solution built for modern, efficient pharmacy operations</p>
                </div>
              </div>
              <div className="row">
                {[
                  {
                    icon: "bi-cart3",
                    title: "Point of Sale (POS) Terminal",
                    desc: "An intuitive POS interface that lets staff search medicines dynamically by generic or brand name, apply no-tax pricing calculations, and print invoice receipts.",
                    delay: 100
                  },
                  {
                    icon: "bi-bell",
                    title: "Automated Expiry Alerts",
                    desc: "Our server evaluates batches and warns you exactly 7 days, 3 days, and 1 day before expiration. Expired medicines are blocked from sales automatically.",
                    delay: 200
                  },
                  {
                    icon: "bi-box-seam",
                    title: "Inventory Control",
                    desc: "Add items with unique brand names, generic formulations, categories, manufacturers, barcode registrations, and multiple batch quantities with ease.",
                    delay: 300
                  },
                  {
                    icon: "bi-people",
                    title: "Multi-User Access",
                    desc: "Invite up to 3 pharmacists/operators under one pharmacy subscription. Admins retain full privilege controls and access management.",
                    delay: 400
                  },
                ].map((v, i) => (
                  <div key={i} className="col-lg-3 col-md-6" data-aos="fade-up" data-aos-delay={v.delay}>
                    <div className="value-item">
                      <div className="value-icon"><i className={`bi ${v.icon}`}></i></div>
                      <h4>{v.title}</h4>
                      <p>{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Our Core Values ── */}
            <div className="values-section" data-aos="fade-up" data-aos-delay="300">
              <div className="row">
                <div className="col-lg-12 text-center">
                  <h3>Our Core Values</h3>
                  <p className="section-description">These principles guide our product engineering and customer support teams</p>
                </div>
              </div>
              <div className="row">
                {[
                  {
                    icon: "bi-shield-check",
                    title: "Reliability & Accuracy",
                    desc: "We ensure inventory records match transaction ledgers exactly. Every sale auto-deducts the correct stock counts dynamically.",
                    delay: 100
                  },
                  {
                    icon: "bi-lightning-charge",
                    title: "Speed of Checkout",
                    desc: "We minimize customer waiting times by offering quick-search, barcode scan, and receipt print pipelines directly from the billing tab.",
                    delay: 200
                  },
                  {
                    icon: "bi-graph-up",
                    title: "Business Growth",
                    desc: "We help pharmacy owners evaluate their business performance using analytical daily, monthly, and yearly sales statistics.",
                    delay: 300
                  },
                  {
                    icon: "bi-lock",
                    title: "Data Security",
                    desc: "We encrypt your trade transactions, inventory ledgers, and staff logs using industry-standard secure socket layers on the cloud.",
                    delay: 400
                  },
                ].map((v, i) => (
                  <div key={i} className="col-lg-3 col-md-6" data-aos="fade-up" data-aos-delay={v.delay}>
                    <div className="value-item">
                      <div className="value-icon"><i className={`bi ${v.icon}`}></i></div>
                      <h4>{v.title}</h4>
                      <p>{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Pharmacy Software Highlight ── */}
            <div className="certifications-section" data-aos="fade-up" data-aos-delay="300">
              <div className="row align-items-center">
                <div className="col-lg-6" data-aos="fade-right" data-aos-delay="200">
                  <h3>SaaS Stock Management — Built for Pakistan</h3>
                  <p>
                    Managing a pharmacy's inventory manually is costly and prone to medicine leakage. Medix is specifically designed for the local pharmacy standards, providing absolute oversight on shelf stocks.
                  </p>
                  <ul className="highlight-list mt-3">
                    <li><i className="bi bi-check-circle-fill me-2"></i>Real-time stock tracking</li>
                    <li><i className="bi bi-check-circle-fill me-2"></i>Automated low-stock and batch expiry alerts</li>
                    <li><i className="bi bi-check-circle-fill me-2"></i>Sales & purchase analytical reporting</li>
                    <li><i className="bi bi-check-circle-fill me-2"></i>Thermal recipe layout printing</li>
                    <li><i className="bi bi-check-circle-fill me-2"></i>Staff privilege toggle keys</li>
                    <li><i className="bi bi-check-circle-fill me-2"></i>Cloud database - no local files backup required</li>
                  </ul>
                  <div className="mt-4">
                    <Link to="/pricing" className="btn-primary me-3">View Pricing Plans</Link>
                  </div>
                </div>
                <div className="col-lg-6" data-aos="fade-left" data-aos-delay="300">
                  <div className="row g-3 justify-content-center">
                    {[
                      { num: "500+", label: "Pharmacies Using Our Software" },
                      { num: "99.9%", label: "System Uptime Guaranteed" },
                      { num: "30%", label: "Reduction in Expiry Wastage" },
                      { num: "5★", label: "Average Customer Rating" },
                    ].map((s, i) => (
                      <div key={i} className="col-6">
                        <div className="stat-item text-center p-4" style={{ background: "var(--surface-color, #f8f9fa)", borderRadius: "12px" }}>
                          <h3 style={{ color: "var(--accent-color, #0ea2bd)", fontSize: "2rem", fontWeight: 700 }}>{s.num}</h3>
                          <p className="mb-0 small">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Accreditations ── */}
            <div className="certifications-section" data-aos="fade-up" data-aos-delay="400">
              <div className="row">
                <div className="col-lg-12 text-center">
                  <h3>Partners & Certifications</h3>
                  <p className="section-description">We collaborate with verified medical suppliers and software security groups to ensure quality service</p>
                </div>
              </div>
              <div className="row justify-content-center">
                {[1,2,3,4,5].map((n, i) => (
                  <div key={n} className="col-lg-2 col-md-3 col-sm-4 col-6" data-aos="zoom-in" data-aos-delay={`${(i+1)*100}`}>
                    <div className="certification-item">
                      <img src={`assets/img/clients/clients-${n}.webp`} className="img-fluid" alt={`Certification ${n}`} />
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

export default About;