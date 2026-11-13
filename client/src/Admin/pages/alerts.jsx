import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import { Modal, Button, Table } from 'react-bootstrap';
import '../Style/alert.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Header from '../header-footer/header';
import Footer from '../header-footer/footer';

const Alerts = () => {
  const [expiringItems, setExpiringItems] = useState([]);
  const [reorderItems, setReorderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('expiring'); // 'expiring' or 'reorder'

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/alerts');
      console.log('Alerts data:', res.data);
      setExpiringItems(res.data.expiringItems || []);
      setReorderItems(res.data.reorderItems || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      alert('Error fetching alerts: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (itemId) => {
    try {
      const res = await axiosInstance.get(`/api/inventory/${itemId}`);
      setSelectedItem(res.data);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching item details:', err);
      alert('Error loading item details');
    }
  };

  const handleDeleteMedicine = async (itemId) => {
    if (window.confirm('⚠️ Warning: Are you sure you want to delete/remove this medicine? This action cannot be undone.')) {
      try {
        await axiosInstance.delete(`/api/inventory/${itemId}`);
        fetchAlerts(); // Refresh alerts
      } catch (err) {
        console.error('Error deleting item:', err);
        alert('Error removing medicine: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const getDaysRemaining = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemainingClass = (days) => {
    if (days < 0) return 'days-expired';
    if (days <= 1) return 'days-critical';
    if (days <= 3) return 'days-urgent';
    if (days <= 7) return 'days-warning';
    return 'days-ok';
  };

  const getStockStatusClass = (stock) => {
    if (stock === 0) return 'stock-out';
    if (stock <= 5) return 'stock-critical';
    return 'stock-low';
  };

  return (
    <>
      <Header />
      
      <div className='alerts-page-wrapper'>
        {/* Header Section */}
        <div className='container-d'>
          <div className="alerts-header-section">
            <h1 className='h1blue'>
              <i className="bi bi-exclamation-triangle"></i>
              Alerts & Suggestions
            </h1>
          </div>
        </div>

        {/* Alerts Section */}
        <div className='admin-management-section'>
          <div className='admin-management-header'>
            <h2 className='admin-management-title'>
              <i className="bi bi-bell"></i>
              System Alerts
            </h2>
          </div>

          {/* Tab Buttons */}
          <div className='alerts-tab-wrapper'>
            <button 
              className={`alerts-tab-btn ${activeTab === 'expiring' ? 'active' : ''}`}
              onClick={() => setActiveTab('expiring')}
            >
              <i className="bi bi-calendar-x"></i>
              Expiring Items ({expiringItems.length})
            </button>
            <button 
              className={`alerts-tab-btn ${activeTab === 'reorder' ? 'active' : ''}`}
              onClick={() => setActiveTab('reorder')}
            >
              <i className="bi bi-arrow-repeat"></i>
              Reorder Suggestion ({reorderItems.length})
            </button>
          </div>

          {/* Expiring Items Table */}
          {activeTab === 'expiring' && (
            <>
              {loading ? (
                <div className='admin-loading'>
                  <div className='admin-loading-spinner'></div>
                  <p className='admin-loading-text'>Loading expiring items...</p>
                </div>
              ) : expiringItems.length > 0 ? (
                <div className='admin-table-container'>
                  <table className='admin-table'>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th><i className="bi bi-capsule"></i>Brand Name</th>
                        <th><i className="bi bi-upc"></i>Batch Number</th>
                        <th><i className="bi bi-box-seam"></i>Quantity</th>
                        <th><i className="bi bi-calendar-event"></i>Expiry Date</th>
                        <th><i className="bi bi-hourglass-split"></i>Days Remaining</th>
                        <th><i className="bi bi-gear"></i>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringItems.map((item, index) => {
                        const daysRemaining = getDaysRemaining(item.expiryDate);
                        const isExpired = daysRemaining < 0;
                        const daysClass = getDaysRemainingClass(daysRemaining);

                        return (
                          <tr key={index}>
                            <td className='admin-table-index'>{index + 1}</td>
                            <td className='admin-table-name'>{item.brandName}</td>
                            <td>{item.batchNumber}</td>
                            <td>
                              <span className="admin-badge badge-verified">
                                <i className="bi bi-box-seam-fill"></i>
                                {item.quantity} units
                              </span>
                            </td>
                            <td>{formatDate(item.expiryDate)}</td>
                            <td>
                              <span className={`subscription-status ${daysClass}`}>
                                <i className={`bi ${
                                  isExpired ? 'bi-x-circle' :
                                  daysRemaining <= 3 ? 'bi-exclamation-triangle' :
                                  'bi-clock'
                                }`}></i>
                                {isExpired ? 'Expired!' : `${daysRemaining} days`}
                              </span>
                            </td>
                            <td style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="admin-btn admin-btn-stats"
                                onClick={() => handleViewDetails(item.itemId)}
                              >
                                <i className="bi bi-eye-fill"></i>
                                View
                              </button>
                              <button
                                className="admin-btn"
                                onClick={() => handleDeleteMedicine(item.itemId)}
                                style={{
                                  backgroundColor: '#dc3545',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                <i className="bi bi-trash-fill"></i>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='admin-empty-state'>
                  <div className='admin-empty-icon'>
                    <i className="bi bi-calendar-check"></i>
                  </div>
                  <h5 className='admin-empty-title'>No Expiring Items</h5>
                  <p className='admin-empty-text'>All items are within safe expiry dates</p>
                </div>
              )}
            </>
          )}

          {/* Reorder Suggestion Table */}
          {activeTab === 'reorder' && (
            <>
              {loading ? (
                <div className='admin-loading'>
                  <div className='admin-loading-spinner'></div>
                  <p className='admin-loading-text'>Loading reorder suggestions...</p>
                </div>
              ) : reorderItems.length > 0 ? (
                <div className='admin-table-container'>
                  <table className='admin-table'>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th><i className="bi bi-capsule"></i>Brand Name</th>
                        <th><i className="bi bi-prescription2"></i>Generic Name</th>
                        <th><i className="bi bi-box-seam"></i>Current Stock</th>
                        <th><i className="bi bi-tags"></i>Category</th>
                        <th><i className="bi bi-info-circle"></i>Status</th>
                        <th><i className="bi bi-gear"></i>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reorderItems.map((item, index) => {
                        const stockClass = getStockStatusClass(item.currentStock);

                        return (
                          <tr key={index}>
                            <td className='admin-table-index'>{index + 1}</td>
                            <td className='admin-table-name'>{item.brandName}</td>
                            <td>{item.genericName}</td>
                            <td>
                              <span className={`subscription-status ${stockClass}`}>
                                <i className={`bi ${
                                  item.currentStock === 0 ? 'bi-x-circle' :
                                  item.currentStock <= 5 ? 'bi-exclamation-triangle' :
                                  'bi-info-circle'
                                }`}></i>
                                {item.currentStock} units
                              </span>
                            </td>
                            <td>
                              <span className="admin-badge badge-verified">
                                {item.category}
                              </span>
                            </td>
                            <td>
                              <span className={`subscription-status ${stockClass}`}>
                                <i className="bi bi-exclamation-diamond"></i>
                                {item.currentStock === 0 ? 'Out of Stock' : 'Low Stock'}
                              </span>
                            </td>
                            <td style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="admin-btn admin-btn-stats"
                                onClick={() => handleViewDetails(item._id)}
                              >
                                <i className="bi bi-eye-fill"></i>
                                View
                              </button>
                              <button
                                className="admin-btn"
                                onClick={() => handleDeleteMedicine(item._id)}
                                style={{
                                  backgroundColor: '#dc3545',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                <i className="bi bi-trash-fill"></i>
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className='admin-empty-state'>
                  <div className='admin-empty-icon'>
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <h5 className='admin-empty-title'>No Reorder Needed</h5>
                  <p className='admin-empty-text'>All items are adequately stocked</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Drug Details Modal */}
      {selectedItem && (
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-info-circle" style={{marginRight: '8px'}}></i>
              Drug Details
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h5><i className="bi bi-file-text" style={{marginRight: '8px'}}></i>Basic Information</h5>
            <Table bordered>
              <tbody>
                <tr>
                  <td><strong>Brand Name</strong></td>
                  <td>{selectedItem.brandName}</td>
                </tr>
                <tr>
                  <td><strong>Generic Name</strong></td>
                  <td>{selectedItem.genericName}</td>
                </tr>
                <tr>
                  <td><strong>Dosage</strong></td>
                  <td>{selectedItem.dosage}</td>
                </tr>
                <tr>
                  <td><strong>Category</strong></td>
                  <td>{selectedItem.category}</td>
                </tr>
                <tr>
                  <td><strong>Current Stock</strong></td>
                  <td>{selectedItem.currentStock} units</td>
                </tr>
                <tr>
                  <td><strong>Unit Price</strong></td>
                  <td>Rs: {selectedItem.unitPrice}</td>
                </tr>
              </tbody>
            </Table>

            <h5 className="mt-4">
              <i className="bi bi-list-check" style={{marginRight: '8px'}}></i>
              Batch Details
            </h5>
            <Table bordered striped>
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedItem.batches && selectedItem.batches.map((batch, index) => {
                  const daysRemaining = getDaysRemaining(batch.expiryDate);
                  const isExpired = daysRemaining < 0;
                  
                  return (
                    <tr key={index}>
                      <td>{batch.batchNumber}</td>
                      <td>{batch.quantity} units</td>
                      <td>{new Date(batch.expiryDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`modal-status ${
                          isExpired ? 'status-expired' : 
                          daysRemaining <= 7 ? 'status-urgent' : 
                          daysRemaining <= 15 ? 'status-warning' : 'status-valid'
                        }`}>
                          {isExpired ? 'Expired' : 
                           daysRemaining <= 7 ? `${daysRemaining} days left` : 
                           'Valid'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              <i className="bi bi-x-circle" style={{marginRight: '6px'}}></i>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
      <Footer/>
    </>
  );
};

export default Alerts;