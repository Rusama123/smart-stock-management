import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../utils/axiosConfig';
import '../Style/inventory.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Header from '../header-footer/header';
import AddDrugModal from './AddDrugModal';
import EditDrugModal from './EditDrugModal';
import ViewDrugModal from './ViewDrugModal';
import Footer from '../header-footer/footer';

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageVisible, setPageVisible] = useState(false); // ✅ smooth fade-in

  // ✅ URL query param se search value uthao (Header redirect se aata hai)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search');
    if (q) {
      setSearch(decodeURIComponent(q));
      setCurrentPage(1);
    }
    // Smooth fade-in on mount
    setTimeout(() => setPageVisible(true), 50);
  }, [location.search]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('⚠️ Please login to continue.');
      navigate('/admin/login');
      return;
    }
    setTimeout(() => setPageVisible(true), 50);
  }, [navigate]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = { 
        page: currentPage, 
        limit: 20 
      };
      
      if (search) params.search = search;
      if (category && category !== 'All Categories') params.category = category;

      const res = await axiosInstance.get('/api/inventory', { params });
      
      setInventory(res.data.inventory || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      if (err.response?.status === 401 || err.response?.status === 403) return;
      alert('Error fetching inventory: ' + (err.response?.data?.message || err.message));
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get('/api/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [search, category, currentPage]);

  useEffect(() => {
    fetchCategories();
  }, []);


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axiosInstance.delete(`/api/inventory/${id}`);
        fetchInventory();
      } catch (err) {
        alert('Error deleting item: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleView = async (id) => {
    try {
      const res = await axiosInstance.get(`/api/inventory/${id}`);
      setSelectedItem(res.data);
      setShowViewModal(true);
    } catch (err) {
      alert('Error fetching item details: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await axiosInstance.get(`/api/inventory/${id}`);
      setSelectedItem(res.data);
      setShowEditModal(true);
    } catch (err) {
      alert('Error fetching item details: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', class: 'sub-expired' };
    if (stock <= 10) return { label: 'Low Stock', class: 'badge-unverified' };
    return { label: 'In Stock', class: 'sub-active' };
  };

  // ✅ Header ka onSearch - inventory page par hi hain toh seedha update karo
  const handleHeaderSearch = (val) => {
    setSearch(val);
    setCurrentPage(1);
    // URL bhi update karo taake consistent rahe
    if (val.trim()) {
      navigate(`/admin/pages/inventory?search=${encodeURIComponent(val)}`, { replace: true });
    } else {
      navigate('/admin/pages/inventory', { replace: true });
    }
  };

  return (
    <>
      {/* ✅ onSearch pass kiya - inventory page par seedha filter hoga */}
      <Header onSearch={handleHeaderSearch} />
      
      {/* ✅ Smooth fade-in transition */}
      <div
        className='inventory-page-wrapper'
        style={{
          opacity: pageVisible ? 1 : 0,
          transform: pageVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.45s ease, transform 0.45s ease',
        }}
      >
        <div className='container-d'>
          <div className="inventory-header-section">
            <h1 className='h1blue'>
              <i className="bi bi-box-seam"></i>
              Inventory Management
            </h1>
            <div className='inventory-action-buttons-wrapper'>
              <button className='inventory-action-btn btn-add-drug' onClick={() => setShowAddModal(true)}>
                <i className="bi bi-plus-circle"></i>
                Add New Drug
              </button>
            </div>
          </div>
        </div>

        <div className='admin-management-section'>
          <div className='admin-management-header'>
            <h2 className='admin-management-title m-b-5'>
              <i className="bi bi-list-ul"></i>
              Inventory List
            </h2>
          </div>

          {/* ✅ Inventory page ka apna search bar - bilkul same raha */}
          <div className='admin-search-bar'>
            <div className='search-input-wrapper'>
              <i className="bi bi-search search-icon"></i>
              <input
                type="text"
                className='admin-search-input'
                placeholder="Search by Brand Name or Generic Name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {search && (
                <i 
                  className="bi bi-x-circle search-clear-icon" 
                  onClick={() => setSearch('')}
                ></i>
              )}
            </div>
          </div>

          {loading ? (
            <div className='admin-loading'>
              <div className='admin-loading-spinner'></div>
              <p className='admin-loading-text'>Loading inventory...</p>
            </div>
          ) : inventory && inventory.length > 0 ? (
            <>
              <div className='admin-table-container'>
                <table className='admin-table'>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th><i className="bi bi-capsule"></i>Brand Name</th>
                      <th><i className="bi bi-prescription2"></i>Generic Name</th>
                      <th><i className="bi bi-building"></i>Manufacturer</th>
                      <th><i className="bi bi-truck"></i>Supplier</th>
                      <th><i className="bi bi-tags"></i>Category</th>
                      <th><i className="bi bi-currency-dollar"></i>Price</th>
                      <th><i className="bi bi-box-seam"></i>Stock</th>
                      <th><i className="bi bi-gear"></i>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item, index) => {
                      const stockStatus = getStockStatus(item.currentStock);
                      return (
                        <tr key={item._id}>
                          <td className='admin-table-index'>{((currentPage - 1) * 20) + index + 1}</td>
                          <td className='admin-table-name'>{item.brandName || 'N/A'}</td>
                          <td>{item.genericName || 'N/A'}</td>
                          <td>{item.manufacturer || 'N/A'}</td>
                          <td>{item.supplier || 'N/A'}</td>
                          <td>
                            <span className="admin-badge badge-verified">
                              {item.category || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className="subscription-status sub-active inventory-price">
                              Rs: {item.unitPrice ? item.unitPrice.toFixed(2) : '0.00'}
                            </span>
                          </td>
                          <td>
                            <span className={`subscription-status ${stockStatus.class}`}>
                              <i className={`bi ${
                                item.currentStock === 0 ? 'bi-x-circle' :
                                item.currentStock <= 10 ? 'bi-exclamation-triangle' :
                                'bi-check-circle'
                              }`}></i>
                              {item.currentStock || 0} units
                            </span>
                          </td>
                          <td>
                            <div className="admin-action-buttons">
                              <button
                                className="admin-btn admin-btn-stats"
                                onClick={() => handleView(item._id)}
                                title="View Details"
                              >
                                <i className="bi bi-eye-fill"></i>
                                View
                              </button>
                              <button
                                className="admin-btn admin-btn-subscription"
                                onClick={() => handleEdit(item._id)}
                                title="Edit Item"
                              >
                                <i className="bi bi-pencil-fill"></i>
                                Edit
                              </button>
                              <button
                                className="admin-btn admin-btn-disable"
                                onClick={() => handleDelete(item._id)}
                                title="Delete Item"
                              >
                                <i className="bi bi-trash-fill"></i>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className='inventory-pagination'>
                <p className='inventory-pagination-text'>
                  Showing {inventory.length > 0 ? ((currentPage - 1) * 20) + 1 : 0} to {Math.min(currentPage * 20, total)} of {total} results
                </p>
              </div>
            </>
          ) : (
            <div className='admin-empty-state'>
              <div className='admin-empty-icon'>
                <i className="bi bi-box-seam"></i>
              </div>
              <h5 className='admin-empty-title'>
                {search || (category && category !== 'All Categories')
                  ? 'No items found' 
                  : 'No inventory items yet'
                }
              </h5>
              <p className='admin-empty-text'>
                {search || (category && category !== 'All Categories')
                  ? 'Try adjusting your search or filter' 
                  : 'Start by adding your first inventory item'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddDrugModal show={showAddModal} onHide={() => setShowAddModal(false)} onSuccess={fetchInventory} />
      )}
      {showEditModal && selectedItem && (
        <EditDrugModal show={showEditModal} onHide={() => setShowEditModal(false)} item={selectedItem} onSuccess={fetchInventory} />
      )}
      {showViewModal && selectedItem && (
        <ViewDrugModal show={showViewModal} onHide={() => setShowViewModal(false)} item={selectedItem} />
      )}
      
      <Footer/>
    </>
  );
};

export default Inventory;