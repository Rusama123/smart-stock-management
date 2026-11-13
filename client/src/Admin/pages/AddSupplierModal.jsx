import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import axiosInstance from '../../utils/axiosConfig';

const AddSupplierModal = ({ show, onHide, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const validateForm = () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Supplier name is required');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }

    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number');
      return false;
    }

    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const supplierData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim()
      };

      console.log('Sending supplier data:', supplierData);

      const response = await axiosInstance.post('/api/suppliers', supplierData);
      console.log('Supplier added response:', response.data);

      // Reset form
      setFormData({ name: '', phone: '', city: '' });
      onHide();

      // Refresh parent list
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('Error adding supplier:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(msg);
      alert('❌ Error adding supplier: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', phone: '', city: '' });
    setError('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-truck me-2"></i>Add New Supplier
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Supplier Name */}
          <Form.Group className="mb-3">
            <Form.Label>Supplier Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., ABC Pharmaceuticals"
              required
              disabled={loading}
            />
          </Form.Group>

          {/* Phone + City side by side */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Phone <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., 03001234567"
                  required
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>City <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g., Lahore"
                  required
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2 justify-content-end mt-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Adding...
                </>
              ) : (
                '✅ Add Supplier'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddSupplierModal;