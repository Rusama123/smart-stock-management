import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import '../Admin/Style/login.css';
import '../Admin/media/login-media.css';
import loginImage from '../assets/img-logo2.png';
import axios from 'axios';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [formData, setFormData] = useState({ 
    email: '', 
    code: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateField = (name, value) => {
    let error = '';
    
    switch(name) {
      case 'email':
        if (!value.trim()) {
          error = 'Please fill this field';
        } else {
          const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(value)) {
            error = 'Please enter a valid email address';
          }
        }
        break;
        
      case 'code':
        if (!value.trim()) {
          error = 'Please enter verification code';
        } else if (value.length !== 6) {
          error = 'Code must be 6 digits';
        } else if (!/^\d+$/.test(value)) {
          error = 'Code must contain only numbers';
        }
        break;
        
      case 'newPassword':
        if (!value.trim()) {
          error = 'Please fill this field';
        } else {
          const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
          if (!passwordRegex.test(value)) {
            error = 'Password must be 8+ chars with 1 uppercase & 1 number';
          }
        }
        break;
        
      case 'confirmPassword':
        if (!value.trim()) {
          error = 'Please fill this field';
        } else if (value !== formData.newPassword) {
          error = 'Passwords do not match';
        }
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Only allow numbers for code field
    if (name === 'code' && value && !/^\d*$/.test(value)) {
      return;
    }
    
    setFormData({ ...formData, [name]: value });
    setError('');
    setSuccess('');
    
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

  // Step 1: Send verification code to email
  const handleSendCode = async (e) => {
    e.preventDefault();
    
    // Validate email
    const emailError = validateField('email', formData.email);
    if (emailError) {
      setErrors({ email: emailError });
      setTouched({ email: true });
      setError('Please fix the error above');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/forgot-password`, {
        email: formData.email
      });
      
      setSuccess(res.data.message);
      setStep(2); // Move to code verification step
      
    } catch (err) {
      console.error('Send code error:', err);
      const errorMessage = err.response?.data?.message || 'Error sending verification code!';
      setError(errorMessage);
      
      // Show specific alerts for different error types
      if (err.response?.status === 404) {
        alert('❌ User not found with this email address!');
      } else if (err.response?.status === 500) {
        alert('⚠️ Email service error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    const codeError = validateField('code', formData.code);
    if (codeError) {
      setErrors({ code: codeError });
      setTouched({ code: true });
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/verify-reset-code`, {
        email: formData.email,
        code: formData.code
      });
      
      setSuccess(res.data.message);
      setStep(3); // Move to password reset step
      
    } catch (err) {
      console.error('Verify code error:', err);
      const errorMessage = err.response?.data?.message || 'Error verifying code!';
      setError(errorMessage);
      
      if (err.response?.status === 400) {
        if (errorMessage.includes('expired')) {
          alert('⚠️ Code expired! Please request a new one.');
        } else {
          alert('❌ Invalid code! Please check and try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    const passwordError = validateField('newPassword', formData.newPassword);
    const confirmError = validateField('confirmPassword', formData.confirmPassword);
    
    if (passwordError || confirmError) {
      setErrors({
        newPassword: passwordError,
        confirmPassword: confirmError
      });
      setTouched({
        newPassword: true,
        confirmPassword: true
      });
      setError('Please fix the errors above');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/reset-password`, {
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword
      });
      
      setSuccess(res.data.message);
      
      // Show success alert and redirect
      
      
      // Redirect to login after successful password reset
      setTimeout(() => {
        navigate('/admin/login');
      }, 2000);
      
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMessage = err.response?.data?.message || 'Error resetting password!';
      setError(errorMessage);
      
      if (err.response?.status === 400) {
        if (errorMessage.includes('expired')) {
          alert('⚠️ Session expired! Please start the reset process again.');
        } else if (errorMessage.includes('Invalid')) {
          alert('❌ Invalid session! Please start over.');
        } else if (errorMessage.includes('Password')) {
          alert('❌ Password does not meet requirements!');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/forgot-password`, {
        email: formData.email
      });
      
      setSuccess('✅ Verification code sent successfully!');
      
    } catch (err) {
      console.error('Resend code error:', err);
      const errorMessage = err.response?.data?.message || 'Error resending code!';
      setError(errorMessage);
      
      if (err.response?.status === 404) {
        alert('❌ User not found with this email address!');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case 1: return 'Reset Your Password';
      case 2: return 'Enter Verification Code';
      case 3: return 'Create New Password';
      default: return 'Reset Password';
    }
  };

  const getStepDescription = () => {
    switch(step) {
      case 1: return 'Enter your email address to receive a verification code.';
      case 2: return `We sent a 6-digit code to ${formData.email}`;
      case 3: return 'Enter your new password below.';
      default: return '';
    }
  };

  return (
    <div className='auth-main'>
      <div className="container-login d-flex">
        <div className="text-center login pt-4">
         
          <h2>
            {getStepTitle()}
          </h2>
          <p className='p-credentials'>{getStepDescription()}</p>
          <div className="login-box p-4 rounded bg-white">
            
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                {success}
              </Alert>
            )}

            <Form onSubmit={
              step === 1 ? handleSendCode : 
              step === 2 ? handleVerifyCode : 
              handleResetPassword
            }>

              {/* Step 1: Email Input */}
              {step === 1 && (
                <Form.Group className="mb-3 input" controlId="formEmail">
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.email && !!errors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              {/* Step 2: Code Verification */}
              {step === 2 && (
                <>
                  <Form.Group className="mb-3 input" controlId="formCode">
                    <Form.Control
                      type="text"
                      name="code"
                      placeholder="Enter 6-digit code"
                      value={formData.code}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength="6"
                      isInvalid={touched.code && !!errors.code}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.code}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Enter the 6-digit code sent to your email
                    </Form.Text>
                  </Form.Group>
                  
                  <div className="text-center mb-3">
                    <Button 
                      variant="link" 
                      onClick={handleResendCode}
                      disabled={loading}
                      className="text-success text-decoration-none"
                    >
                      {loading ? 'Sending...' : 'Resend Code'}
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <>
                  <Form.Group className="mb-3 input" controlId="formNewPassword">
                    <Form.Control
                      type="password"
                      name="newPassword"
                      placeholder="New Password (8+ chars, 1 uppercase, 1 number)"
                      value={formData.newPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.newPassword && !!errors.newPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.newPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3 input" controlId="formConfirmPassword">
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm New Password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.confirmPassword && !!errors.confirmPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                  </Form.Group>
                </>
              )}

              <Button 
                type="submit" 
                className="btn-login btn-success w-100 fw-semibold"
                disabled={loading}
              >
                {loading ? 'Processing...' : 
                 step === 1 ? 'Send Verification Code' : 
                 step === 2 ? 'Verify Code' : 
                 'Reset Password'}
              </Button>

              <div className="text-center mt-3">
                <p className="mb-0">
                 {' '}
                  <a href="/admin/login" className="text-success text-decoration-none">
                    Back to Login
                  </a>
                </p>
                
                {step > 1 && (
                  <Button 
                    variant="link" 
                    onClick={() => setStep(step - 1)}
                    className="text-decoration-none mt-2"
                    disabled={loading}
                  >
                    ← Go Back
                  </Button>
                )}
              </div>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;