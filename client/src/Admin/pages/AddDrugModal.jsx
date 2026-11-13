import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import axiosInstance from '../../utils/axiosConfig';

const AddDrugModal = ({ show, onHide, onSuccess }) => {
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

  useEffect(() => {
    if (show) {
      fetchCategories();
      fetchManufacturers();
      fetchSuppliers();
      // Generate batch number for first batch
      generateBatchNumber(0);
    }
  }, [show]);

  // Auto-calculate unit price if not provided
  useEffect(() => {
    if (formData.unitCost && !formData.unitPrice) {
      const cost = parseFloat(formData.unitCost);
      if (!isNaN(cost) && cost > 0) {
        // Add 10% margin automatically
        const suggestedPrice = (cost * 1.10).toFixed(2);
        setFormData(prev => ({ ...prev, unitPrice: suggestedPrice }));
      }
    }
  }, [formData.unitCost]);

  // Generate batch number automatically
  const generateBatchNumber = (index) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-4);
    const batchNum = `BATCH-${year}${month}${day}-${timestamp}-${index + 1}`;
    
    const newBatches = [...batches];
    if (newBatches[index]) {
      newBatches[index].batchNumber = batchNum;
      setBatches(newBatches);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get('/api/categories');
      console.log('Categories API response:', res.data);
      
      // Handle different response formats
      let fetchedCategories = [];
      
      if (Array.isArray(res.data)) {
        // If response is array of strings: ["Pain Relievers", "Antibiotics"]
        if (typeof res.data[0] === 'string') {
          fetchedCategories = res.data.map(cat => ({ name: cat }));
        } 
        // If response is array of objects: [{name: "Pain Relievers"}, ...]
        else if (res.data[0] && res.data[0].name) {
          fetchedCategories = res.data;
        }
      }
      
      console.log('Processed categories:', fetchedCategories);
      
      if (fetchedCategories.length > 0) {
        setCategories(fetchedCategories);
      } else {
        // Set default categories if API returns empty
        setCategories([
          { name: 'Pain Relievers' },
          { name: 'Antibiotics' },
          { name: 'Vitamins' },
          { name: 'Supplements' },
          { name: 'Cold & Flu' },
          { name: 'Antacids' },
          { name: 'Anti-inflammatory' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Set default categories if API fails
      setCategories([
        { name: 'Pain Relievers' },
        { name: 'Antibiotics' },
        { name: 'Vitamins' },
        { name: 'Supplements' },
        { name: 'Cold & Flu' },
        { name: 'Antacids' },
        { name: 'Anti-inflammatory' }
      ]);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const res = await axiosInstance.get('/api/manufacturers');
      console.log('Manufacturers response:', res.data);
      setManufacturers(res.data || []);
    } catch (err) {
      console.error('Error fetching manufacturers:', err);
      setManufacturers([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axiosInstance.get('/api/suppliers');
      console.log('Suppliers response:', res.data);
      setSuppliers(res.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setSuppliers([]);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategory.trim()) {
      setError('Please enter category name');
      return;
    }
    
    // Check if category already exists
    const exists = categories.some(cat => 
      cat.name.toLowerCase() === newCategory.trim().toLowerCase()
    );
    
    if (exists) {
      setError('Category already exists');
      return;
    }
    
    try {
      // Try to save to backend
      const res = await axiosInstance.post('/api/categories', {
        name: newCategory.trim()
      });
      
      console.log('Category added response:', res.data);
      
      const newCat = res.data.category || { name: newCategory.trim() };
      setCategories(prev => [...prev, newCat]);
      setFormData({ ...formData, category: newCat.name });
      setNewCategory('');
      setShowNewCategory(false);
      setError('');
      // alert('✅ Category added successfully!');
    } catch (err) {
      console.error('Error adding category:', err);
      
      // Even if backend fails, add to local list
      const newCat = { name: newCategory.trim() };
      setCategories(prev => [...prev, newCat]);
      setFormData({ ...formData, category: newCat.name });
      setNewCategory('');
      setShowNewCategory(false);
      setError('');
      // alert('✅ Category added successfully!');
    }
  };

  const handleAddNewManufacturer = async () => {
    if (!newManufacturer.trim()) {
      setError('Please enter manufacturer name');
      return;
    }
    
    // Check if manufacturer already exists
    const exists = manufacturers.some(mfr => 
      mfr.name.toLowerCase() === newManufacturer.trim().toLowerCase()
    );
    
    if (exists) {
      setError('Manufacturer already exists');
      return;
    }
    
    try {
      const res = await axiosInstance.post('/api/manufacturers', {
        name: newManufacturer.trim()
      });
      
      const newMfr = res.data.manufacturer;
      setManufacturers(prev => [...prev, newMfr]);
      setFormData({ ...formData, manufacturer: newMfr.name });
      setNewManufacturer('');
      setShowNewManufacturer(false);
      setError('');
      // alert('✅ Manufacturer added successfully!');
    } catch (err) {
      console.error('Error adding manufacturer:', err);
      setError('Error adding manufacturer: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAddNewSupplier = async () => {
    if (!newSupplier.trim()) {
      setError('Please enter supplier name');
      return;
    }
    
    // Check if supplier already exists
    const exists = suppliers.some(sup => 
      sup.name.toLowerCase() === newSupplier.trim().toLowerCase()
    );
    
    if (exists) {
      setError('Supplier already exists');
      return;
    }
    
    try {
      const res = await axiosInstance.post('/api/suppliers', {
        name: newSupplier.trim(),
        phone: '0000000000',
        city: 'N/A',
        country: 'N/A'
      });
      
      const newSup = res.data.supplier;
      setSuppliers(prev => [...prev, newSup]);
      setFormData({ ...formData, supplier: newSup.name });
      setNewSupplier('');
      setShowNewSupplier(false);
      setError('');
      // alert('✅ Supplier added successfully!');
    } catch (err) {
      console.error('Error adding supplier:', err);
      setError('Error adding supplier: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'unitCost') {
      const cost = parseFloat(value);
      if (!isNaN(cost) && cost > 0) {
        const suggestedPrice = (cost * 1.10).toFixed(2);
        setFormData(prev => ({
          ...prev,
          unitCost: value,
          unitPrice: suggestedPrice
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setTouched({ ...touched, [name]: true });
    setError('');
  };

  const handleBatchChange = (index, field, value) => {
    const newBatches = [...batches];
    newBatches[index][field] = value;
    setBatches(newBatches);
    setError('');
  };

  const addBatch = () => {
    const newIndex = batches.length;
    const newBatch = { batchNumber: '', quantity: '', expiryDate: '' };
    setBatches([...batches, newBatch]);
    setTimeout(() => generateBatchNumber(newIndex), 100);
  };

  const removeBatch = (index) => {
    if (batches.length === 1) {
      setError('At least one batch is required');
      return;
    }
    const newBatches = batches.filter((_, i) => i !== index);
    setBatches(newBatches);
  };

  const validateForm = () => {
    setError('');

    if (!formData.brandName.trim()) {
      setError('Brand name is required');
      return false;
    }
    if (formData.brandName.trim().length < 2) {
      setError('Brand name must be at least 2 characters');
      return false;
    }

    if (!formData.dosage.trim()) {
      setError('Dosage is required');
      return false;
    }

    if (!formData.category.trim()) {
      setError('Category is required');
      return false;
    }

    if (!formData.manufacturer.trim()) {
      setError('Manufacturer is required');
      return false;
    }

    if (!formData.supplier.trim()) {
      setError('Supplier is required');
      return false;
    }

    const unitCost = parseFloat(formData.unitCost);
    if (!formData.unitCost || isNaN(unitCost) || unitCost <= 0) {
      setError('Unit cost must be a positive number');
      return false;
    }

    const unitPrice = parseFloat(formData.unitPrice);
    if (!formData.unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
      setError('Retail price must be a positive number');
      return false;
    }

    if (unitPrice < unitCost) {
      const confirm = window.confirm(
        `⚠️ Warning: Retail price (Rs ${unitPrice}) is less than unit cost (Rs ${unitCost}).\n\nThis means you'll make a loss on each sale.\n\nDo you want to continue?`
      );
      if (!confirm) return false;
    }

    if (batches.length === 0) {
      setError('At least one batch is required');
      return false;
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      if (!batch.batchNumber.trim()) {
        setError(`Batch ${i + 1}: Batch number is required`);
        return false;
      }

      const qty = parseInt(batch.quantity);
      if (!batch.quantity || isNaN(qty) || qty <= 0) {
        setError(`Batch ${i + 1}: Quantity must be a positive number`);
        return false;
      }

      if (!batch.expiryDate) {
        setError(`Batch ${i + 1}: Expiry date is required`);
        return false;
      }

      const expiryDate = new Date(batch.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expiryDate < today) {
        setError(`Batch ${i + 1}: Expiry date cannot be in the past`);
        return false;
      }

      const oneMonthFromNow = new Date(today);
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      
      if (expiryDate < oneMonthFromNow) {
        const confirm = window.confirm(
          `⚠️ Warning: Batch ${i + 1} expires within 30 days (${expiryDate.toLocaleDateString()}).\n\nDo you want to continue?`
        );
        if (!confirm) return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const batchesData = batches.map(batch => ({
        batchNumber: batch.batchNumber.trim(),
        quantity: parseInt(batch.quantity),
        expiryDate: batch.expiryDate
      }));

      const totalStock = batchesData.reduce((sum, batch) => sum + batch.quantity, 0);

      const payload = {
        brandName: formData.brandName.trim(),
        genericName: formData.genericName.trim() || formData.brandName.trim(),
        dosage: formData.dosage.trim(),
        category: formData.category.trim(),
        manufacturer: formData.manufacturer.trim(),
        supplier: formData.supplier.trim(),
        barcode: formData.barcode.trim() || undefined,
        unitPrice: parseFloat(formData.unitPrice),
        unitCost: parseFloat(formData.unitCost),
        batches: batchesData
      };

      console.log('Submitting drug:', payload);

      const response = await axiosInstance.post('/api/inventory', payload);
      
      console.log('Drug added successfully:', response.data);
      
      // alert(`✅ Successfully added ${payload.brandName}!\n\nTotal Stock: ${totalStock} units\nBatches: ${batches.length}`);
      
      // Reset form
      setFormData({
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
      setBatches([{ batchNumber: '', quantity: '', expiryDate: '' }]);
      setTouched({});
      setError('');
      
      onHide();
      
      // Refresh categories list after successful submission
      fetchCategories();
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (err) {
      console.error('Error adding drug:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      setError('Failed to add drug: ' + errorMessage);
      alert('❌ Error adding drug: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
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
    setBatches([{ batchNumber: '', quantity: '', expiryDate: '' }]);
    setError('');
    setTouched({});
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Add New Drug</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            <strong>⚠️ Validation Error:</strong> {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Brand Name <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleChange}
                  placeholder="e.g., Panadol"
                  isInvalid={touched.brandName && !formData.brandName.trim()}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  Brand name is required
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Generic Name (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  name="genericName"
                  value={formData.genericName}
                  onChange={handleChange}
                  placeholder="e.g., Paracetamol"
                />
              
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Barcode (Optional)</Form.Label>
                <Form.Control
                  type="text"
                  name="barcode"
                  placeholder="e.g., 8901234567890"
                  value={formData.barcode}
                  onChange={handleChange}
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
                  type="text"
                  name="dosage"
                  placeholder="e.g., 500 mg"
                  value={formData.dosage}
                  onChange={handleChange}
                  isInvalid={touched.dosage && !formData.dosage.trim()}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  Dosage is required
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Manufacturer <span className="text-danger">*</span></Form.Label>
                {!showNewManufacturer ? (
                  <div className="d-flex gap-2">
                    <Form.Select
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleChange}
                      isInvalid={touched.manufacturer && !formData.manufacturer}
                      required
                    >
                      <option value="">Select Manufacturer</option>
                      {manufacturers.map((mfr, index) => (
                        <option key={index} value={mfr.name}>{mfr.name}</option>
                      ))}
                    </Form.Select>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => setShowNewManufacturer(true)}
                      title="Add new manufacturer"
                    >
                      +
                    </Button>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      placeholder="New manufacturer"
                      value={newManufacturer}
                      onChange={(e) => setNewManufacturer(e.target.value)}
                    />
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={handleAddNewManufacturer}
                      title="Save"
                    >
                      ✓
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setShowNewManufacturer(false);
                        setNewManufacturer('');
                      }}
                      title="Cancel"
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Supplier <span className="text-danger">*</span></Form.Label>
                {!showNewSupplier ? (
                  <div className="d-flex gap-2">
                    <Form.Select
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
                      isInvalid={touched.supplier && !formData.supplier}
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((sup, index) => (
                        <option key={index} value={sup.name}>{sup.name}</option>
                      ))}
                    </Form.Select>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => setShowNewSupplier(true)}
                      title="Add new supplier"
                    >
                      +
                    </Button>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      placeholder="New supplier"
                      value={newSupplier}
                      onChange={(e) => setNewSupplier(e.target.value)}
                    />
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={handleAddNewSupplier}
                      title="Save"
                    >
                      ✓
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setShowNewSupplier(false);
                        setNewSupplier('');
                      }}
                      title="Cancel"
                    >
                      ✕
                    </Button>
                  </div>
                )}
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Category <span className="text-danger">*</span></Form.Label>
                {!showNewCategory ? (
                  <div className="d-flex gap-2">
                    <Form.Select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      isInvalid={touched.category && !formData.category}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat, index) => (
                        <option key={index} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </Form.Select>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => setShowNewCategory(true)}
                      title="Add new category"
                    >
                      +
                    </Button>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      placeholder="New category"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={handleAddNewCategory}
                      title="Save"
                    >
                      ✓
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategory('');
                      }}
                      title="Cancel"
                    >
                      ✕
                    </Button>
                  </div>
                )}
                
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Unit Cost (Rs) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="unitCost"
                  placeholder="e.g., 4.50"
                  value={formData.unitCost}
                  onChange={handleChange}
                  isInvalid={touched.unitCost && (!formData.unitCost || parseFloat(formData.unitCost) <= 0)}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  Valid cost required
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Purchase cost per unit
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Retail Price (Rs) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="unitPrice"
                  placeholder="Auto-calculated from cost"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  isInvalid={touched.unitPrice && (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0)}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  Valid price required
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  {formData.unitCost && formData.unitPrice ? (
                    <>
                      Margin: Rs {(parseFloat(formData.unitPrice) - parseFloat(formData.unitCost)).toFixed(2)} 
                      ({(((parseFloat(formData.unitPrice) - parseFloat(formData.unitCost)) / parseFloat(formData.unitCost)) * 100).toFixed(1)}%)
                    </>
                  ) : (
                    'Selling price per unit (auto-calculated with 10% margin)'
                  )}
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <hr />

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Batch Information</h5>
            <Button variant="secondary" onClick={addBatch} size="sm">
              + Add Batch
            </Button>
          </div>

          {batches.map((batch, index) => (
            <div key={index} className="border p-3 mb-3 rounded bg-light">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Batch {index + 1}</h6>
                {batches.length > 1 && (
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => removeBatch(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Batch Number (Auto-generated)</Form.Label>
                    <Form.Control
                      type="text"
                      value={batch.batchNumber}
                      onChange={(e) => handleBatchChange(index, 'batchNumber', e.target.value)}
                      placeholder="Auto-generated"
                      readOnly
                      style={{ backgroundColor: '#e9ecef' }}
                    />
                    <Form.Text className="text-muted">
                      Auto-generated unique batch number
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Quantity <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
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
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          ))}

          <div className="d-flex gap-2 justify-content-end mt-4">
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
                '✅ Add Drug'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddDrugModal;