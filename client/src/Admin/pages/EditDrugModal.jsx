import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import axiosInstance from '../../utils/axiosConfig';

const EditDrugModal = ({ show, onHide, item, onSuccess }) => {
  const [formData, setFormData] = useState({
    brandName: '',
    genericName: '',
    dosage: '',
    category: '',
    manufacturer: '',
    supplier: '',
    barcode: '',
    unitPrice: '',
    unitCost: ''
  });

  const [batches, setBatches] = useState([
    { batchNumber: '', quantity: '', expiryDate: '' }
  ]);

  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewManufacturer, setShowNewManufacturer] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  // ── Load item data when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (item && show) {
      setFormData({
        brandName:   item.brandName   || '',
        genericName: item.genericName || '',
        dosage:      item.dosage      || '',
        category:    item.category    || '',
        manufacturer:item.manufacturer|| '',
        supplier:    item.supplier    || '',
        barcode:     item.barcode     || '',
        unitPrice:   item.unitPrice   || '',
        unitCost:    item.unitCost    || ''
      });

      // Load existing batches or default empty batch
      if (item.batches && item.batches.length > 0) {
        setBatches(item.batches.map(b => ({
          batchNumber: b.batchNumber || '',
          quantity:    b.quantity    || '',
          expiryDate:  b.expiryDate  ? b.expiryDate.split('T')[0] : ''
        })));
      } else {
        setBatches([{ batchNumber: '', quantity: '', expiryDate: '' }]);
      }

      fetchCategories();
      fetchManufacturers();
      fetchSuppliers();
      setError('');
      setTouched({});
    }
  }, [item, show]);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get('/api/categories');
      let fetched = [];
      if (Array.isArray(res.data)) {
        fetched = typeof res.data[0] === 'string'
          ? res.data.map(c => ({ name: c }))
          : res.data;
      }
      setCategories(fetched.length > 0 ? fetched : [
        { name: 'Pain Relievers' }, { name: 'Antibiotics' },
        { name: 'Vitamins' },       { name: 'Supplements' },
        { name: 'Cold & Flu' },     { name: 'Antacids' },
        { name: 'Anti-inflammatory' }
      ]);
    } catch {
      setCategories([
        { name: 'Pain Relievers' }, { name: 'Antibiotics' },
        { name: 'Vitamins' },       { name: 'Supplements' },
        { name: 'Cold & Flu' },     { name: 'Antacids' },
        { name: 'Anti-inflammatory' }
      ]);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const res = await axiosInstance.get('/api/manufacturers');
      setManufacturers(res.data || []);
    } catch { setManufacturers([]); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axiosInstance.get('/api/suppliers');
      setSuppliers(res.data || []);
    } catch { setSuppliers([]); }
  };

  // ── Add new category / manufacturer / supplier ────────────────────────────
  const handleAddNewCategory = async () => {
    if (!newCategory.trim()) { setError('Please enter category name'); return; }
    const exists = categories.some(c => c.name.toLowerCase() === newCategory.trim().toLowerCase());
    if (exists) { setError('Category already exists'); return; }
    try {
      const res = await axiosInstance.post('/api/categories', { name: newCategory.trim() });
      const newCat = res.data.category || { name: newCategory.trim() };
      setCategories(prev => [...prev, newCat]);
      setFormData(prev => ({ ...prev, category: newCat.name }));
    } catch {
      const newCat = { name: newCategory.trim() };
      setCategories(prev => [...prev, newCat]);
      setFormData(prev => ({ ...prev, category: newCat.name }));
    }
    setNewCategory(''); setShowNewCategory(false); setError('');
  };

  const handleAddNewManufacturer = async () => {
    if (!newManufacturer.trim()) { setError('Please enter manufacturer name'); return; }
    const exists = manufacturers.some(m => m.name.toLowerCase() === newManufacturer.trim().toLowerCase());
    if (exists) { setError('Manufacturer already exists'); return; }
    try {
      const res = await axiosInstance.post('/api/manufacturers', { name: newManufacturer.trim() });
      const newMfr = res.data.manufacturer;
      setManufacturers(prev => [...prev, newMfr]);
      setFormData(prev => ({ ...prev, manufacturer: newMfr.name }));
      setNewManufacturer(''); setShowNewManufacturer(false); setError('');
    } catch (err) {
      setError('Error adding manufacturer: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddNewSupplier = async () => {
    if (!newSupplier.trim()) { setError('Please enter supplier name'); return; }
    const exists = suppliers.some(s => s.name.toLowerCase() === newSupplier.trim().toLowerCase());
    if (exists) { setError('Supplier already exists'); return; }
    try {
      const res = await axiosInstance.post('/api/suppliers', {
        name: newSupplier.trim(), phone: '0000000000', city: 'N/A', country: 'N/A'
      });
      const newSup = res.data.supplier;
      setSuppliers(prev => [...prev, newSup]);
      setFormData(prev => ({ ...prev, supplier: newSup.name }));
      setNewSupplier(''); setShowNewSupplier(false); setError('');
    } catch (err) {
      setError('Error adding supplier: ' + (err.response?.data?.message || err.message));
    }
  };

  // ── Field handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let updated = { ...prev, [name]: value };
      if (name === 'unitCost' && value) {
        const cost = parseFloat(value);
        if (!isNaN(cost) && cost > 0) {
          updated.unitPrice = (cost * 1.10).toFixed(2);
        }
      }
      return updated;
    });
    setTouched(prev => ({ ...prev, [name]: true }));
    setError('');
  };

  const handleBatchChange = (index, field, value) => {
    const updated = [...batches];
    updated[index][field] = value;
    setBatches(updated);
    setError('');
  };

  const addBatch = () => {
    setBatches(prev => [...prev, { batchNumber: '', quantity: '', expiryDate: '' }]);
  };

  const removeBatch = (index) => {
    if (batches.length === 1) { setError('At least one batch is required'); return; }
    setBatches(prev => prev.filter((_, i) => i !== index));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = () => {
    setError('');
    if (!formData.brandName.trim())    { setError('Brand name is required'); return false; }
    if (formData.brandName.trim().length < 2) { setError('Brand name must be at least 2 characters'); return false; }
    if (!formData.dosage.trim())       { setError('Dosage is required'); return false; }
    if (!formData.category.trim())     { setError('Category is required'); return false; }

    const unitCost  = parseFloat(formData.unitCost);
    const unitPrice = parseFloat(formData.unitPrice);
    if (!formData.unitCost  || isNaN(unitCost)  || unitCost  <= 0) { setError('Unit cost must be a positive number'); return false; }
    if (!formData.unitPrice || isNaN(unitPrice) || unitPrice <= 0) { setError('Retail price must be a positive number'); return false; }
    if (unitPrice < unitCost) {
      const ok = window.confirm(
        `⚠️ Warning: Retail price (Rs ${unitPrice}) is less than unit cost (Rs ${unitCost}).\n\nThis means you'll make a loss on each sale.\n\nDo you want to continue?`
      );
      if (!ok) return false;
    }

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (!b.batchNumber.trim()) { setError(`Batch ${i+1}: Batch number is required`); return false; }
      const qty = parseInt(b.quantity);
      if (!b.quantity || isNaN(qty) || qty <= 0) { setError(`Batch ${i+1}: Quantity must be a positive number`); return false; }
      if (!b.expiryDate) { setError(`Batch ${i+1}: Expiry date is required`); return false; }
      const expiry = new Date(b.expiryDate);
      const today  = new Date(); today.setHours(0,0,0,0);
      if (expiry < today) { setError(`Batch ${i+1}: Expiry date cannot be in the past`); return false; }
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const batchesData = batches.map(b => ({
        batchNumber: b.batchNumber.trim(),
        quantity:    parseInt(b.quantity),
        expiryDate:  b.expiryDate
      }));

      await axiosInstance.put(`/api/inventory/${item._id}`, {
        brandName:    formData.brandName.trim(),
        genericName:  formData.genericName.trim() || formData.brandName.trim(),
        dosage:       formData.dosage.trim(),
        category:     formData.category.trim(),
        manufacturer: formData.manufacturer.trim(),
        supplier:     formData.supplier.trim(),
        barcode:      formData.barcode.trim() || undefined,
        unitPrice:    parseFloat(formData.unitPrice),
        unitCost:     parseFloat(formData.unitCost),
        batches:      batchesData
      });

      onHide();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError('Failed to update drug: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(''); setTouched({});
    onHide();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>✏️ Edit Drug</Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            <strong>⚠️ Validation Error:</strong> {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* ── Row 1: Brand + Generic ── */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Brand Name <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text" name="brandName"
                  value={formData.brandName} onChange={handleChange}
                  placeholder="e.g., Panadol"
                  isInvalid={touched.brandName && !formData.brandName.trim()}
                  required
                />
                <Form.Control.Feedback type="invalid">Brand name is required</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Generic Name (Optional)</Form.Label>
                <Form.Control
                  type="text" name="genericName"
                  value={formData.genericName} onChange={handleChange}
                  placeholder="e.g., Paracetamol"
                />
              </Form.Group>
            </Col>
          </Row>

          {/* ── Row 2: Barcode + Dosage ── */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Barcode (Optional)</Form.Label>
                <Form.Control
                  type="text" name="barcode"
                  value={formData.barcode} onChange={handleChange}
                  placeholder="e.g., 8901234567890"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Dosage <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text" name="dosage"
                  value={formData.dosage} onChange={handleChange}
                  placeholder="e.g., 500 mg"
                  isInvalid={touched.dosage && !formData.dosage.trim()}
                  required
                />
                <Form.Control.Feedback type="invalid">Dosage is required</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* ── Row 3: Manufacturer + Supplier + Category ── */}
          <Row>
            {/* Manufacturer */}
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Manufacturer</Form.Label>
                {!showNewManufacturer ? (
                  <div className="d-flex gap-2">
                    <Form.Select name="manufacturer" value={formData.manufacturer}
                      onChange={handleChange}>
                      <option value="">Select Manufacturer</option>
                      {manufacturers.map((m, i) => <option key={i} value={m.name}>{m.name}</option>)}
                    </Form.Select>
                    <Button variant="outline-primary" size="sm"
                      onClick={() => setShowNewManufacturer(true)}>+</Button>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <Form.Control type="text" placeholder="New manufacturer"
                      value={newManufacturer} onChange={(e) => setNewManufacturer(e.target.value)} />
                    <Button variant="success" size="sm" onClick={handleAddNewManufacturer}>✓</Button>
                    <Button variant="secondary" size="sm"
                      onClick={() => { setShowNewManufacturer(false); setNewManufacturer(''); }}>✕</Button>
                  </div>
                )}
              </Form.Group>
            </Col>

            {/* Supplier */}
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Supplier</Form.Label>
                {!showNewSupplier ? (
                  <div className="d-flex gap-2">
                    <Form.Select name="supplier" value={formData.supplier}
                      onChange={handleChange}>
                      <option value="">Select Supplier</option>
                      {suppliers.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                    </Form.Select>
                    <Button variant="outline-primary" size="sm"
                      onClick={() => setShowNewSupplier(true)}>+</Button>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <Form.Control type="text" placeholder="New supplier"
                      value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
                    <Button variant="success" size="sm" onClick={handleAddNewSupplier}>✓</Button>
                    <Button variant="secondary" size="sm"
                      onClick={() => { setShowNewSupplier(false); setNewSupplier(''); }}>✕</Button>
                  </div>
                )}
              </Form.Group>
            </Col>

            {/* Category */}
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Category <span className="text-danger">*</span></Form.Label>
                {!showNewCategory ? (
                  <div className="d-flex gap-2">
                    <Form.Select name="category" value={formData.category}
                      onChange={handleChange}
                      isInvalid={touched.category && !formData.category} required>
                      <option value="">Select Category</option>
                      {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                    </Form.Select>
                    <Button variant="outline-primary" size="sm"
                      onClick={() => setShowNewCategory(true)}>+</Button>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <Form.Control type="text" placeholder="New category"
                      value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                    <Button variant="success" size="sm" onClick={handleAddNewCategory}>✓</Button>
                    <Button variant="secondary" size="sm"
                      onClick={() => { setShowNewCategory(false); setNewCategory(''); }}>✕</Button>
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          {/* ── Row 4: Unit Cost + Retail Price ── */}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Unit Cost (Rs) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number" step="0.01" min="0.01" name="unitCost"
                  value={formData.unitCost} onChange={handleChange}
                  placeholder="e.g., 4.50"
                  isInvalid={touched.unitCost && (!formData.unitCost || parseFloat(formData.unitCost) <= 0)}
                  required
                />
                <Form.Control.Feedback type="invalid">Valid cost required</Form.Control.Feedback>
                <Form.Text className="text-muted">Purchase cost per unit</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Retail Price (Rs) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number" step="0.01" min="0.01" name="unitPrice"
                  value={formData.unitPrice} onChange={handleChange}
                  placeholder="Selling price per unit"
                  isInvalid={touched.unitPrice && (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0)}
                  required
                />
                <Form.Control.Feedback type="invalid">Valid price required</Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {formData.unitCost && formData.unitPrice ? (
                    <>
                      Margin: Rs {(parseFloat(formData.unitPrice) - parseFloat(formData.unitCost)).toFixed(2)}
                      {' '}({(((parseFloat(formData.unitPrice) - parseFloat(formData.unitCost)) / parseFloat(formData.unitCost)) * 100).toFixed(1)}%)
                    </>
                  ) : 'Selling price per unit'}
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <hr />

          {/* ── Batches ── */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Batch Information</h5>
            <Button variant="secondary" size="sm" onClick={addBatch}>+ Add Batch</Button>
          </div>

          {batches.map((batch, index) => (
            <div key={index} className="border p-3 mb-3 rounded bg-light">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Batch {index + 1}</h6>
                {batches.length > 1 && (
                  <Button variant="danger" size="sm" onClick={() => removeBatch(index)}>Remove</Button>
                )}
              </div>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Batch Number <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      value={batch.batchNumber}
                      onChange={(e) => handleBatchChange(index, 'batchNumber', e.target.value)}
                      placeholder="e.g., BATCH-001"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Quantity <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="number" min="1"
                      value={batch.quantity}
                      onChange={(e) => handleBatchChange(index, 'quantity', e.target.value)}
                      placeholder="e.g., 1500"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Expiry Date <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="date"
                      value={batch.expiryDate}
                      onChange={(e) => handleBatchChange(index, 'expiryDate', e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          ))}

          {/* ── Buttons ── */}
          <div className="d-flex gap-2 justify-content-end mt-4">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Updating...</>
              ) : '✅ Update Drug'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditDrugModal;