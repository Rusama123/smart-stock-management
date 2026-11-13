import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosConfig';
import '../Style/supplier.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Header from '../header-footer/header';
import Footer from '../header-footer/footer';
import AddSupplierModal from './AddSupplierModal';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';

const Suppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [supplierDeliveries, setSupplierDeliveries] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('⚠️ Session expired. Please login again.');
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    fetchSuppliers();
    fetchInventoryBySuppliers();
  }, []);

  // ─── Fetch Suppliers ──────────────────────────────────────────────────────
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/api/suppliers');
      console.log('Suppliers fetched:', res.data);
      setSuppliers(res.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert('⚠️ Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/admin/login');
      } else {
        alert('Error fetching suppliers: ' + (err.response?.data?.message || err.message));
      }
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch Inventory for supplier stats ───────────────────────────────────
  const fetchInventoryBySuppliers = async () => {
    try {
      const res = await axiosInstance.get('/api/inventory');
      const inventory = res.data.inventory || [];

      const deliveriesMap = {};
      inventory.forEach(item => {
        const supplierName = item.supplier || 'Unknown';
        if (!deliveriesMap[supplierName]) {
          deliveriesMap[supplierName] = { products: [], totalQuantity: 0, totalValue: 0 };
        }
        deliveriesMap[supplierName].products.push({
          brandName: item.brandName,
          genericName: item.genericName,
          quantity: item.currentStock || 0,
          unitPrice: item.unitPrice || 0,
          category: item.category
        });
        deliveriesMap[supplierName].totalQuantity += item.currentStock || 0;
        deliveriesMap[supplierName].totalValue += (item.currentStock || 0) * (item.unitPrice || 0);
      });

      setSupplierDeliveries(deliveriesMap);
    } catch (err) {
      console.error('Error fetching inventory for stats:', err);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getSupplierStats = (supplierName) => {
    const d = supplierDeliveries[supplierName];
    if (!d) return { products: 0, totalQuantity: 0, totalValue: 0 };
    return { products: d.products.length, totalQuantity: d.totalQuantity, totalValue: d.totalValue };
  };

  const handleAddSuccess = () => {
    fetchSuppliers();
    fetchInventoryBySuppliers();
  };

  // ─── View ─────────────────────────────────────────────────────────────────
  const handleViewDetails = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  // ─── Edit ─────────────────────────────────────────────────────────────────
  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setEditFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      city: supplier.city || ''
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        city: editFormData.city.trim()
      };
      await axiosInstance.put(`/api/suppliers/${selectedSupplier._id}`, updateData);
      // alert('✅ Supplier updated successfully!');
      setShowEditModal(false);
      fetchSuppliers();
    } catch (err) {
      console.error('Error updating supplier:', err);
      alert('❌ Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDeleteSupplier = async (id, supplierName) => {
    const stats = getSupplierStats(supplierName);
    const msg = stats.products > 0
      ? `⚠️ This supplier has ${stats.products} product(s) in inventory. Delete anyway?`
      : 'Are you sure you want to delete this supplier?';
    if (!window.confirm(msg)) return;

    try {
      await axiosInstance.delete(`/api/suppliers/${id}`);
      // alert('✅ Supplier deleted successfully!');
      fetchSuppliers();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/admin/login');
      } else {
        alert('❌ Error: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filteredSuppliers = suppliers.filter(supplier => {
    const q = searchQuery.toLowerCase();
    return (
      supplier.name?.toLowerCase().includes(q) ||
      supplier.phone?.toLowerCase().includes(q) ||
      supplier.city?.toLowerCase().includes(q)
    );
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Header />

      <div className='suppliers-page-wrapper'>
        {/* Page Header */}
        <div className='container-d'>
          <div className="suppliers-header-section">
            <h1 className='h1blue'>
              <i className="bi bi-truck"></i> Supplier Management
            </h1>
            <div className='suppliers-action-wrapper'>
              <button className='suppliers-action-btn' onClick={() => setShowAddModal(true)}>
                <i className="bi bi-plus-circle"></i> Add New Supplier
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className='admin-management-section container-d'>
          <div className='admin-management-header'>
            <h2 className='admin-management-title'>
              <i className="bi bi-people"></i> Suppliers List
            </h2>
          </div>

          {/* Search */}
          <div className='admin-search-bar'>
            <div className='search-input-wrapper'>
              <i className="bi bi-search search-icon"></i>
              <input
                type="text"
                className='admin-search-input'
                placeholder="Search by name, phone, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <i className="bi bi-x-circle search-clear-icon" onClick={() => setSearchQuery('')}></i>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className='admin-loading'>
              <div className='admin-loading-spinner'></div>
              <p className='admin-loading-text'>Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length > 0 ? (
            <div className='admin-table-container'>
              <table className='admin-table'>
                <thead>
                  <tr>
                    <th>#</th>
                    <th><i className="bi bi-building"></i> Supplier Name</th>
                    <th><i className="bi bi-telephone"></i> Phone</th>
                    <th><i className="bi bi-geo-alt"></i> City</th>
                    <th><i className="bi bi-box-seam"></i> Products</th>
                    <th><i className="bi bi-stack"></i> Total Qty</th>
                    <th><i className="bi bi-gear"></i> Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier, index) => {
                    const stats = getSupplierStats(supplier.name);
                    return (
                      <tr key={supplier._id}>
                        <td className='admin-table-index'>{index + 1}</td>
                        <td className='admin-table-name'>{supplier.name}</td>
                        <td>{supplier.phone}</td>
                        <td>{supplier.city}</td>
                        <td>
                          <span className="admin-badge badge-verified">
                            <i className="bi bi-box-seam-fill me-1"></i>
                            {stats.products} items
                          </span>
                        </td>
                        <td>
                          <span className="subscription-status sub-active">
                            {stats.totalQuantity} units
                          </span>
                        </td>
                        <td>
                          <div className="admin-action-buttons">
                            <button className="admin-btn admin-btn-stats" onClick={() => handleViewDetails(supplier)}>
                              <i className="bi bi-eye-fill"></i> View
                            </button>
                            <button className="admin-btn admin-btn-subscription" onClick={() => handleEditSupplier(supplier)}>
                              <i className="bi bi-pencil-fill"></i> Edit
                            </button>
                            <button className="admin-btn admin-btn-disable" onClick={() => handleDeleteSupplier(supplier._id, supplier.name)}>
                              <i className="bi bi-trash-fill"></i> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='admin-empty-state'>
              <div className='admin-empty-icon'><i className="bi bi-truck"></i></div>
              <h5 className='admin-empty-title'>{searchQuery ? 'No suppliers found' : 'No suppliers yet'}</h5>
              <p className='admin-empty-text'>{searchQuery ? 'Try adjusting your search' : 'Add your first supplier to get started'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      <AddSupplierModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      {/* ── Edit Modal ── */}
      {selectedSupplier && (
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title><i className="bi bi-pencil-square me-2"></i>Edit Supplier</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleUpdateSupplier}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Supplier Name <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  required
                />
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>City <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="city"
                      value={editFormData.city}
                      onChange={handleEditFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                <i className="bi bi-x-circle me-1"></i>Cancel
              </Button>
              <Button variant="primary" type="submit">
                <i className="bi bi-check-circle me-1"></i>Update Supplier
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}

      {/* ── Details Modal ── */}
      {selectedSupplier && (
        <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title><i className="bi bi-info-circle me-2"></i>{selectedSupplier.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Supplier Info */}
            <div className="mb-4 p-3 bg-light rounded">
              <h5 className="mb-3"><i className="bi bi-person-lines-fill me-2"></i>Supplier Info</h5>
              <Row>
                <Col md={4}>
                  <p className="mb-1 text-muted">Name</p>
                  <p className="fw-bold">{selectedSupplier.name}</p>
                </Col>
                <Col md={4}>
                  <p className="mb-1 text-muted">Phone</p>
                  <p className="fw-bold">{selectedSupplier.phone}</p>
                </Col>
                <Col md={4}>
                  <p className="mb-1 text-muted">City</p>
                  <p className="fw-bold">{selectedSupplier.city}</p>
                </Col>
              </Row>
            </div>

            <hr />

            {/* Products */}
            <h5 className="mb-3"><i className="bi bi-box-seam me-2"></i>Products Supplied</h5>
            {supplierDeliveries[selectedSupplier.name]?.products.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Brand Name</th>
                      <th>Generic Name</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Unit Price</th>
                      <th>Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierDeliveries[selectedSupplier.name].products.map((p, i) => (
                      <tr key={i}>
                        <td>{p.brandName}</td>
                        <td>{p.genericName}</td>
                        <td>{p.category}</td>
                        <td>{p.quantity} units</td>
                        <td>Rs {p.unitPrice?.toFixed(2)}</td>
                        <td>Rs {(p.quantity * p.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-bold table-secondary">
                      <td colSpan="3">Total</td>
                      <td>{supplierDeliveries[selectedSupplier.name].totalQuantity} units</td>
                      <td></td>
                      <td>Rs {supplierDeliveries[selectedSupplier.name].totalValue.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-muted">No products currently supplied by this supplier.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
              <i className="bi bi-x-circle me-1"></i>Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      <Footer />
    </>
  );
};

export default Suppliers;