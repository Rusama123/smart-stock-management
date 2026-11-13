import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import '../Admin/Style/login.css';
import '../Admin/media/login-media.css';
import axios from 'axios';

const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);

const EyeSlash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
  </svg>
);

/* FIXED: eye icon style — always centered to the input height, never offset by error below */
const eyeStyle = (hasError) => ({
  position: 'absolute',
  top: '0',
  right: hasError ? '32px' : '12px',
  height: '43px',        /* matches Bootstrap default input height */
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  color: '#6c757d',
  userSelect: 'none',
  zIndex: 10,
});

const Register = () => {
  const [role, setRole] = useState('admin');
  const [formData, setFormData] = useState({
    name: '',
    hospitalName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setFormData({ ...formData, hospitalName: '' });
    if (selectedRole === 'user') {
      setErrors({ role: "Please contact your admin to create your account." });
    } else {
      setErrors({});
    }
    setTouched({});
  };

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Please fill this field';
        else if (value.length < 4) error = 'Name must be at least 4 characters';
        break;
      case 'hospitalName':
        if (role === 'user') {
          if (!value.trim()) error = 'Please fill this field';
          else if (value.length < 8) error = 'Hospital name must be at least 8 characters';
        }
        break;
      case 'phone':
        if (!value.trim()) error = 'Please fill this field';
        else if (!/^\d+$/.test(value)) error = 'Phone number must contain only digits';
        else if (value.length !== 11) error = 'Phone number must be exactly 11 digits';
        break;
      case 'email':
        if (!value.trim()) error = 'Please fill this field';
        else {
          const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(value)) error = 'Please enter a valid email address (e.g., example@gmail.com)';
        }
        break;
      case 'password':
        if (!value.trim()) error = 'Please fill this field';
        else {
          const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
          if (!passwordRegex.test(value)) error = 'Password must be 8+ characters with 1 uppercase & 1 number';
        }
        break;
      case 'confirmPassword':
        if (!value.trim()) error = 'Please fill this field';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      if (value.length > 11) return;
      if (value && !/^\d*$/.test(value)) return;
    }
    setFormData({ ...formData, [name]: value });
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, value);
    setErrors({ ...errors, [name]: error });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched({ ...touched, [name]: true });
    const error = validateField(name, formData[name]);
    setErrors({ ...errors, [name]: error });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (role === 'user') {
      setErrors({ role: "Please contact your admin to create your account." });
      return;
    }

    const allTouched = {};
    Object.keys(formData).forEach(key => {
      if (role === 'user' || key !== 'hospitalName') allTouched[key] = true;
    });
    setTouched(allTouched);

    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (role === 'user' || key !== 'hospitalName') {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (formData.password !== formData.confirmPassword) return;

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        role: role
      };
      if (role === 'user') payload.pharmacyName = formData.hospitalName;

      const res = await axios.post('http://localhost:5000/register', payload);
      alert(res.data.message);
      setShowVerificationModal(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error registering user!');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (verificationCode.length !== 6) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/verify-email', {
        email: formData.email,
        code: verificationCode
      });
      alert(res.data.message);
      setShowVerificationModal(false);
      setTimeout(() => navigate('/admin/login'), 1000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error verifying email!');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/resend-verification', { email: formData.email });
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Error resending code!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-main'>
      <div className="container-login d-flex">
        <div className="text-center login mt-3">
          <h2 className='mt-5 '>
            Register to{' '}
            <span className="ip">Medix</span>
          </h2>
          <p className='p-credentials pb-1'>Enter your details to create an account.</p>
          <div className="login-box rounded bg-white">
            <Form onSubmit={handleSubmit}>



              {/* Name */}
              <Form.Group className="mb-3 input" controlId="formName">
                <Form.Control
                  type="text"
                  name="name"
                  placeholder="Enter Name (min 4 characters)"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  isInvalid={touched.name && !!errors.name}
                />
                <Form.Control.Feedback type="invalid" style={{ textAlign: 'left' }}>
                  {errors.name}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Hospital Name — User only */}
              {role === 'user' && (
                <Form.Group className="mb-3 input" controlId="formHospitalName">
                  <Form.Control
                    type="text"
                    name="hospitalName"
                    placeholder="Hospital Name (min 8 characters)"
                    value={formData.hospitalName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.hospitalName && !!errors.hospitalName}
                  />
                  <Form.Control.Feedback type="invalid" style={{ textAlign: 'left' }}>
                    {errors.hospitalName}
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              {/* Phone */}
              <Form.Group className="mb-3 input" controlId="formPhoneNumber">
                <Form.Control
                  type="tel"
                  name="phone"
                  placeholder="Phone Number (11 digits)"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength="11"
                  isInvalid={touched.phone && !!errors.phone}
                />
                <Form.Control.Feedback type="invalid" style={{ textAlign: 'left' }}>
                  {errors.phone}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Email */}
              <Form.Group className="mb-3 input" controlId="formEmail">
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  isInvalid={touched.email && !!errors.email}
                />
                <Form.Control.Feedback type="invalid" style={{ textAlign: 'left' }}>
                  {errors.email}
                </Form.Control.Feedback>
              </Form.Group>

              {/* Password — FIXED eye icon */}
              <Form.Group className="mb-3 input" controlId="formPassword">
                <div style={{ position: 'relative' }}>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password (8+ chars, 1 uppercase, 1 number)"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.password && !!errors.password}
                    style={{ paddingRight: touched.password && errors.password ? '70px' : '45px' }}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={eyeStyle(touched.password && !!errors.password)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOpen /> : <EyeSlash />}
                  </span>
                  <Form.Control.Feedback type="invalid" style={{ textAlign: 'left' }}>
                    {errors.password}
                  </Form.Control.Feedback>
                </div>
              </Form.Group>

              {/* Confirm Password — FIXED eye icon */}
              <Form.Group className="mb-3 input" controlId="formConfirmPassword">
                <div style={{ position: 'relative' }}>
                  <Form.Control
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.confirmPassword && !!errors.confirmPassword}
                    style={{ paddingRight: touched.confirmPassword && errors.confirmPassword ? '70px' : '45px' }}
                  />
                  <span
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={eyeStyle(touched.confirmPassword && !!errors.confirmPassword)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOpen /> : <EyeSlash />}
                  </span>
                  <Form.Control.Feedback type="invalid" style={{ textAlign: 'left' }}>
                    {errors.confirmPassword}
                  </Form.Control.Feedback>
                </div>
              </Form.Group>

              <Button
                type="submit"
                className="btn-login btn-success w-100 fw-semibold"
                disabled={loading || role === 'user'}
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>

              <p className="text-center mt-3 mb-0">
                You have an account?{' '}
                <a href="/admin/login" className="text-success text-decoration-none">Log in</a>
              </p>
            </Form>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <Modal show={showVerificationModal} onHide={() => setShowVerificationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Email Verification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>We've sent a 6-digit verification code to <strong>{formData.email}</strong></p>
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength="6"
            />
          </Form.Group>
          <Button variant="success" className="w-100 mb-2" onClick={handleVerification} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>
          <Button variant="link" className="w-100" onClick={handleResendCode} disabled={loading}>
            Resend Code
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Register;