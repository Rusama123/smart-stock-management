// src/Admin/pages/contact.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "./header";
import Footer from "./footer";
import { reinitPlugins } from "../../hooks/useScripts";

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  useEffect(() => {
    document.body.className = "contact-page";
    const t = setTimeout(reinitPlugins, 300);
    return () => { clearTimeout(t); document.body.className = ""; };
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("http://localhost:5000/api/email/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        console.error("Server error:", data.message);
        setStatus("error");
      }
    } catch (err) {
      console.error("Network error:", err);
      setStatus("error");
    }
  };

  return (
    <>
      <Header />
      <main className="main">

        <div className="page-title">
          <div className="heading">
            <div className="container">
              <div className="row d-flex justify-content-center text-center">
                <div className="col-lg-8">
                  <h1 className="heading-title">Contact Support & Sales</h1>
                  <p className="mb-0">
                    Have questions about Medix Pharmacy Software? Reach out to our product support or sales department for assistances regarding subscriptions, custom setups, or technical support.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <nav className="breadcrumbs">
            <div className="container">
              <ol>
                <li><Link to="/">Home</Link></li>
                <li className="current">Contact</li>
              </ol>
            </div>
          </nav>
        </div>

        <section id="contact" className="contact section">
          <div className="container" data-aos="fade-up" data-aos-delay="100">
            <div className="row g-5">

              <div className="col-lg-5">
                <div className="contact-info-wrapper">
                  <div className="contact-info-item" data-aos="fade-up" data-aos-delay="100">
                    <div className="info-icon"><i className="bi bi-geo-alt"></i></div>
                    <div className="info-content">
                      <h3>Our Address</h3>
                      <p>The University of Lahore, Defence Road, Lahore, Pakistan</p>
                    </div>
                  </div>
                  <div className="contact-info-item" data-aos="fade-up" data-aos-delay="200">
                    <div className="info-icon"><i className="bi bi-envelope"></i></div>
                    <div className="info-content">
                      <h3>Email Address</h3>
                      <p>support@medix.com</p>
                      <p>sales@medix.com</p>
                    </div>
                  </div>
                  <div className="contact-info-item" data-aos="fade-up" data-aos-delay="300">
                    <div className="info-icon"><i className="bi bi-headset"></i></div>
                    <div className="info-content">
                      <h3>Hours of Operation</h3>
                      <p>Monday - Saturday: 9 AM - 6 PM</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-7">
                <div className="contact-form-card" data-aos="fade-up" data-aos-delay="200">
                  <h2>Send us a Message</h2>
                  <p className="mb-4">Fill out the form below and our customer success representatives will respond to your inquiry within 24 hours.</p>
                  <form onSubmit={handleSubmit}>
                    <div className="row g-4">
                      <div className="col-md-6">
                        <input type="text" className="form-control" name="name" placeholder="Your Name"
                          value={formData.name} onChange={handleChange} required />
                      </div>
                      <div className="col-md-6">
                        <input type="email" className="form-control" name="email" placeholder="Your Email"
                          value={formData.email} onChange={handleChange} required />
                      </div>
                      <div className="col-12">
                        <input type="text" className="form-control" name="subject" placeholder="Subject"
                          value={formData.subject} onChange={handleChange} required />
                      </div>
                      <div className="col-12">
                        <textarea className="form-control" name="message" placeholder="Your Message"
                          rows={6} value={formData.message} onChange={handleChange} required></textarea>
                      </div>
                      <div className="col-12">
                        {status === "loading" && <div className="loading">Sending...</div>}
                        {status === "error"   && <div className="error-message">Something went wrong. Please try again.</div>}
                        {status === "success" && <div className="sent-message">Your message has been sent. Thank you!</div>}
                      </div>
                      <div className="col-12">
                        <button type="submit" className="btn btn-submit" disabled={status === "loading"}>
                          {status === "loading" ? "Sending..." : "Send Message"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          </div>

          <div className="container-fluid map-container" data-aos="fade-up" data-aos-delay="200">
            <div className="map-overlay"></div>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3405.811802905391!2d74.23891461159828!3d31.391740953181827!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3919018a8ea548c1%3A0x4a0fe12f14a9ca95!2sThe%20University%20of%20Lahore!5e0!3m2!1sen!2spk!4v1680000000000!5m2!1sen!2spk"
              width="100%" height="500" style={{ border: 0 }}
              allowFullScreen="" loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Medix Location"
            ></iframe>
          </div>
        </section>
      </main>

      <Footer />
      <div id="preloader"></div>
    </>
  );
};

export default Contact;