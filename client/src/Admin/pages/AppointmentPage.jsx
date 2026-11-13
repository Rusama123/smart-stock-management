// src/Admin/pages/appointment.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "./header";
import Footer from "./footer";
import { reinitPlugins } from "../../hooks/useScripts";

const INITIAL_FORM = {
  fullName: "",
  email: "",
  phone: "",
  date: "",
  department: "",
  message: "",
};

const AppointmentPage = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    document.body.className = "appointment-page";
    const t = setTimeout(reinitPlugins, 300);
    return () => {
      clearTimeout(t);
      document.body.className = "";
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("http://localhost:5000/api/email/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setFormData(INITIAL_FORM);
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
                  <h1 className="heading-title">Appointment</h1>
                  <p className="mb-0">
                    Schedule your consultation with our healthcare team in a few simple steps.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <nav className="breadcrumbs">
            <div className="container">
              <ol>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li className="current">Appointment</li>
              </ol>
            </div>
          </nav>
        </div>

        <section id="appointment" className="appointmnet section">
          <div className="container" data-aos="fade-up" data-aos-delay="100">
            <div className="booking-wrapper">
              <div className="booking-header text-center" data-aos="fade-up" data-aos-delay="150">
                <h2>Book Your Appointment</h2>
                <p>
                  Choose your department, preferred doctor and date — our team will confirm your booking quickly.
                </p>
              </div>

              <div className="booking-steps">
                <div className="step">
                  <div className="step-icon">
                    <i className="bi bi-person"></i>
                  </div>
                  <div className="step-content">
                    <h4>Fill Details</h4>
                    <p>Share your basic contact details</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-icon">
                    <i className="bi bi-calendar-check"></i>
                  </div>
                  <div className="step-content">
                    <h4>Select Slot</h4>
                    <p>Appointment date</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-icon">
                    <i className="bi bi-check2-circle"></i>
                  </div>
                  <div className="step-content">
                    <h4>Get Confirmation</h4>
                    <p>Receive confirmation from our team</p>
                  </div>
                </div>
              </div>

              <div className="appointment-form">
                <form className="php-email-form" onSubmit={handleSubmit}>
                  <div className="row gy-3">
                    <div className="col-md-6">
                      <input
                        type="text"
                        name="fullName"
                        className="form-control"
                        placeholder="Full Name"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        type="tel"
                        name="phone"
                        className="form-control"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        type="date"
                        name="date"
                        className="form-control"
                        value={formData.date}
                        onChange={handleChange}
                        min={today}
                        required
                      />
                    </div>
                    <div className="col-md-12">
                      <select
                        name="department"
                        className="form-select"
                        value={formData.department}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Department</option>
                        <option value="general-medicine">General Medicine</option>
                        <option value="cardiology">Cardiology</option>
                        <option value="neurology">Neurology</option>
                        <option value="orthopedics">Orthopedics</option>
                        <option value="pediatrics">Pediatrics</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <textarea
                        name="message"
                        rows="5"
                        className="form-control"
                        placeholder="Any additional notes"
                        value={formData.message}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                    <div className="col-12">
                      {status === "loading" && (
                        <div className="appointment-status loading">Submitting your appointment request...</div>
                      )}
                      {status === "success" && (
                        <div className="appointment-status success">
                          Appointment request submitted successfully. We will contact you shortly.
                        </div>
                      )}
                      {status === "error" && (
                        <div className="appointment-status error">
                          Something went wrong. Please try again.
                        </div>
                      )}
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn-book" disabled={status === "loading"}>
                        {status === "loading" ? "Submitting..." : "Book Appointment"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="emergency-info">
                <p>
                  <i className="bi bi-telephone-fill"></i>
                  Emergency Support: <strong>+92 300 0000000</strong>
                </p>
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

export default AppointmentPage;