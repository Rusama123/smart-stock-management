// src/Admin/pages/footer.jsx
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer id="footer" className="footer-16 footer position-relative">
      <div className="container">
        <div className="footer-main" data-aos="fade-up" data-aos-delay="100">
          <div className="row align-items-start">

            {/* Brand Section */}
            <div className="col-lg-6">
              <div className="brand-section">
                <Link to="/" className="logo d-flex align-items-center mb-4">
                  <img
                    src="/medix.png"
                    alt="Medix Logo"
                    style={{ height: "38px", width: "auto", objectFit: "contain" }}
                  />
                </Link>
                <p className="brand-description">
                  Providing exceptional healthcare services with compassion, innovation, and excellence. 
                  Your health is our highest priority.
                </p>
                
              </div>
            </div>

            {/* Footer Nav */}
            <div className="col-lg-6">
              <div className="footer-nav-wrapper">
                <div className="row">

                  <div className="col-6 col-lg-5">
                    <div className="nav-column">
                      <h6>Pages</h6>
                      <nav className="footer-nav">
                        <Link to="/">Home</Link>
                        <Link to="/about">About Us</Link>
                        <Link to="/pricing">Pricing</Link>
                        <Link to="/contact">Contact</Link>
                           <Link to="/appointment">Book Appointment</Link>
                      </nav>
                    </div>
                  </div>
                  
                  <div className="col-6 col-lg-7">
                    <div className="nav-column">
                      <h6>contact us</h6>
                      <nav className="footer-nav">
                        <a href="mailto:"> <i className="bi bi-geo-alt p-1"></i>
                          <span>The University of Lahore Defence Road</span></a>
                        <a href="tell:">  <i className="bi bi-telephone p-1"></i>
                          <span>03261342366</span></a>
                        <a href="mailto:"> <i className="bi bi-envelope p-1"></i>
                          <span>contact@medix.com</span></a>
                        
                        <div className="social-links mt-3 d-flex gap-2">
                          <a href="#!" className="twitter"><i className="bi bi-twitter-x"></i></a>
                          <a href="#!" className="facebook"><i className="bi bi-facebook"></i></a>
                          <a href="#!" className="instagram"><i className="bi bi-instagram"></i></a>
                          <a href="#!" className="linkedin"><i className="bi bi-linkedin"></i></a>
                        </div>
                      </nav>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="container">
          <div className="bottom-content" data-aos="fade-up" data-aos-delay="300">
            <div className="row align-items-center">
              <div className="col-lg-6">
                <div className="copyright">
                  <p>© <span className="sitename">Medix</span>. All rights reserved.</p>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="legal-links">
                  <a href="#!">Privacy Policy</a>
                  <a href="#!">Terms of Service</a>
                  <a href="#!">Cookie Policy</a>
                  <div className="credits">
                    Designed by <a href="https://bootstrapmade.com/">BootstrapMade</a>. Distributed by{" "}
                    <a href="https://themewagon.com" target="_blank" rel="noreferrer">ThemeWagon</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;