import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import '../Admin/Style/login.css';
import '../Admin/media/login-media.css';
import axios from 'axios';

const Login = () => {
  const [role, setRole] = useState('user');
  const [formData, setFormData] = useState({ hospitalName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setFormData({ hospitalName: '', email: '', password: '' });
    setError('');
    setErrors({});
    setTouched({});
  };

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'hospitalName':
        if (role === 'user') {
          if (!value.trim()) error = 'Please fill this field';
          else if (value.length < 8) error = 'Hospital name must be at least 8 characters';
        }
        break;
      case 'email':
        if (!value.trim()) error = 'Please fill this field';
        else {
          const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(value)) error = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (!value.trim()) error = 'Please fill this field';
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    setTouched({ ...touched, [name]: true });
    const fieldError = validateField(name, value);
    setErrors({ ...errors, [name]: fieldError });
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched({ ...touched, [name]: true });
    const fieldError = validateField(name, formData[name]);
    setErrors({ ...errors, [name]: fieldError });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = {};
    Object.keys(formData).forEach(key => {
      if (role === 'user' || key !== 'hospitalName') allTouched[key] = true;
    });
    setTouched(allTouched);

    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (role === 'user' || key !== 'hospitalName') {
        const fieldError = validateField(key, formData[key]);
        if (fieldError) newErrors[key] = fieldError;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please fill all required fields correctly!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = role === 'admin'
        ? { role: 'admin', email: formData.email, password: formData.password }
        : { role: 'user', hospitalName: formData.hospitalName, email: formData.email, password: formData.password };

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/login`, payload);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;

      if (role === 'admin') {
        if (res.data.user.role === 'superadmin' || res.data.user.isSuperAdmin === true) {
          navigate('/Admin/control-panel/admin-control');
        } else if (res.data.user.role === 'admin') {
          navigate('/Admin/control-panel/admin-control');
        }
      } else {
        navigate('/admin/pages/dashboard');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Error logging in!';
      setError(errorMessage);
      if (
        !errorMessage.includes('not verified') &&
        !errorMessage.includes('Access denied') &&
        !errorMessage.includes('User not found') &&
        !errorMessage.includes('Admin not found') &&
        !errorMessage.includes('Hospital name does not match') &&
        !errorMessage.includes('Incorrect password') &&
        !errorMessage.includes('Invalid') &&
        !errorMessage.includes('credentials') &&
        !errorMessage.includes('subscription has expired')
      ) {
        alert('❌ ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-main'>
      <div className="container-login d-flex">
        <div className="text-center login">
          <h2 className='f-heading  mt-5'>
            Welcome to{' '}
            <span className="ip">Medix</span>
          
          </h2>
          <p className='p-credentials m-0'>Enter your credentials to access the system.</p>
          <div className="login-box p-4 rounded bg-white">

            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Form onSubmit={handleSubmit}>
              {/* Role Selector */}
              <Form.Group className="mb-3 input">
                <Form.Label></Form.Label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
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

              {/* Password — FIXED eye icon centering */}
              <Form.Group className="mb-3 input" controlId="formPassword">
                {/* Outer wrapper: positions icon relative to input row only */}
                <div style={{ position: 'relative' }}>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.password && !!errors.password}
                    style={{
                      paddingRight: touched.password && errors.password ? '70px' : '45px',
                    }}
                  />
                  {/* Eye icon — always vertically centered to the input height */}
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      top: '0',
                      bottom: touched.password && errors.password ? 'auto' : '0',
                      height: '43px',          /* matches Bootstrap input height */
                      right: touched.password && errors.password ? '32px' : '12px',
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: '#6c757d',
                      userSelect: 'none',
                      zIndex: 10,
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                      </svg>
                    )}
                  </span>
                  <Form.Control.Feedback type="invalid" style={{ textAlign: 'left' }}>
                    {errors.password}
                  </Form.Control.Feedback>
                </div>
              </Form.Group>

              <Button
                type="submit"
                className="btn-login btn-success w-100 fw-semibold"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </Button>

              <div className="justify-content-between align-items-center input">
                <div className="forget">
                  <a href="/admin/forgot-password" className="text-decoration-none text-success">
                    Forgot your password?
                  </a>
                </div>
              </div>

              {role === 'user' && (
                <p className="text-center mt-3 mb-0">
                  Don't have an account?{' '}
                  <a href="/admin/register" className="text-success text-decoration-none">Sign up</a>
                </p>
              )}
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;