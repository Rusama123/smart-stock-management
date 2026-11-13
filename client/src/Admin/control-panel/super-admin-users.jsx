import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import '../Style/dashboard.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Header from '../header-footer/admin-header';
import Footers from '../header-footer/footer';

const SuperAdminUsers = () => {
  const [usersData, setUsersData] = useState({
    totalUsers: 0,
    usersWithAdmin: 0,
    usersWithoutAdmin: 0,
    activeUsers: 0,
    expiredUsers: 0,
    users: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal]       = useState(false);
  const [showEditUserModal, setShowEditUserModal]         = useState(false);
  const [showEditAdminModal, setShowEditAdminModal]       = useState(false);

  const [selectedUser, setSelectedUser]             = useState(null);
  const [subscriptionMonths, setSubscriptionMonths] = useState(1);
  const [userAnalytics, setUserAnalytics]           = useState(null);
  const [loadingAnalytics, setLoadingAnalytics]     = useState(false);
  const [savingEdit, setSavingEdit]                 = useState(false);

  const [editUserForm, setEditUserForm] = useState({
    name: '', email: '', phone: '',
    pharmacyName: '', city: '', area: '', address: '',
    isVerified: false, hasAccess: false,
  });

  const [editAdminForm, setEditAdminForm] = useState({
    name: '', email: '', phone: '',
    isVerified: false, hasAccess: false,
  });

  useEffect(() => { fetchUsersData(); }, []);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/superadmin/all-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsersData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users data:', err);
      setError('Failed to load users data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnalytics = async (userId) => {
    try {
      setLoadingAnalytics(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/user/${userId}/analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching user analytics:', err);
      alert('Failed to load user analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(amount || 0);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-PK');

  const getSubscriptionStatus = (user) => {
    if (!user.subscriptionEndDate) return 'No Subscription';
    const endDate = new Date(user.subscriptionEndDate);
    const today   = new Date();
    if (endDate < today)  return 'Expired';
    if (endDate >= today) return 'Active';
    return 'Unknown';
  };

  const handleToggleAccess = async (userId, currentStatus) => {
    try {
      const token     = localStorage.getItem('token');
      const newStatus = !currentStatus;
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${userId}/access`,
        { hasAccess: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // alert(`Access ${newStatus ? 'granted' : 'revoked'} successfully`);
      fetchUsersData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user access');
    }
  };

  const openSubscriptionModal = (user) => {
    setSelectedUser(user);
    setSubscriptionMonths(1);
    setShowSubscriptionModal(true);
  };

  const handleExtendSubscription = async () => {
    if (!selectedUser || !subscriptionMonths) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${selectedUser._id}/subscription`,
        { months: subscriptionMonths },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowSubscriptionModal(false);
      fetchUsersData();
      // alert(`Subscription extended by ${subscriptionMonths} month(s) successfully`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to extend subscription');
    }
  };

  const openAnalyticsModal = async (user) => {
    setSelectedUser(user);
    setShowAnalyticsModal(true);
    await fetchUserAnalytics(user._id);
  };

  const openEditUserModal = (user) => {
    setSelectedUser(user);
    setEditUserForm({
      name:         user.name         || '',
      email:        user.email        || '',
      phone:        user.phone        || '',
      pharmacyName: user.pharmacyName || '',
      city:         user.city         || '',
      area:         user.area         || '',
      address:      user.address      || '',
      isVerified:   user.isVerified   || false,
      hasAccess:    user.hasAccess    || false,
    });
    setShowEditUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      setSavingEdit(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${selectedUser._id}/edit`,
        editUserForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowEditUserModal(false);
      fetchUsersData();
      // alert('User updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };

  const openEditAdminModal = (user) => {
    setSelectedUser(user);
    const admin = user.adminInfo || {};
    setEditAdminForm({
      name:         admin.name         || '',
      email:        admin.email        || '',
      phone:        admin.phone        || '',
      isVerified:   admin.isVerified   || false,
      hasAccess:    admin.hasAccess    || false,
    });
    setShowEditAdminModal(true);
  };

  const handleSaveAdmin = async () => {
    if (!selectedUser?.adminInfo?._id) return;
    try {
      setSavingEdit(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/superadmin/admins/${selectedUser.adminInfo._id}`,
        editAdminForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowEditAdminModal(false);
      fetchUsersData();
      // alert('Admin updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update admin');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsersData();
      // alert("User deleted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredUsers = usersData.users.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(q)            ||
      user.email?.toLowerCase().includes(q)           ||
      user.phone?.toLowerCase().includes(q)           ||
      user.pharmacyName?.toLowerCase().includes(q)    ||
      user.adminInfo?.name?.toLowerCase().includes(q) ||
      user.adminInfo?.email?.toLowerCase().includes(q)
    );
  });

  const labelStyle   = { fontWeight: '600', color: '#005A8B', marginBottom: '4px' };
  const sectionStyle = { fontWeight: '700', fontSize: '14px', marginBottom: '10px', marginTop: '6px' };

  return (
    <>
      <Header />
      <div className="container-d" style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', paddingTop: '20px' }}>

        {/* ✅ people-fill = user group management heading */}
        {/* <h1 className="h1blue mb-3" style={{ textAlign: 'center', marginBottom: '30px' }}>
          <i className="bi bi-people-fill" style={{ marginRight: '10px', color: '#005A8B' }}></i>
          All Users Management
        </h1> */}

        {error && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>Error!</strong> {error}
            <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
            <button className="btn btn-primary mt-2" onClick={fetchUsersData}>Retry</button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="row mx-5">

          <div className="col-md-3 stat-card-custom">
            <div className="stat-card-inner">
              <div className="flex-between-custom">
                <h3 className="stat-title-custom">Total Users</h3>
                {/* ✅ person-lines-fill = all registered users */}
                <i className="bi bi-person-lines-fill stat-icon-custom" style={{ fontSize: '28px', color: '#005A8B' }}></i>
              </div>
              <p className="stat-value-custom">{usersData.totalUsers || 0} Users</p>
            </div>
          </div>

          <div className="col-md-3 stat-card-custom">
            <div className="stat-card-inner">
              <div className="flex-between-custom">
                <h3 className="stat-title-custom">With Admin</h3>
                {/* ✅ person-check-fill = user linked/assigned to an admin */}
                <i className="bi bi-person-check-fill stat-icon-custom" style={{ fontSize: '28px', color: '#005A8B' }}></i>
              </div>
              <p className="stat-value-custom">{usersData.usersWithAdmin || 0} Users</p>
            </div>
          </div>

          <div className="col-md-3 stat-card-custom">
            <div className="stat-card-inner">
              <div className="flex-between-custom">
                <h3 className="stat-title-custom">Without Admin</h3>
                {/* ✅ person-dash-fill = user without an admin assigned */}
                <i className="bi bi-person-dash-fill stat-icon-custom" style={{ fontSize: '28px', color: '#005A8B' }}></i>
              </div>
              <p className="stat-value-custom">{usersData.usersWithoutAdmin || 0} Users</p>
            </div>
          </div>

          <div className="col-md-3 stat-card-custom">
            <div className="stat-card-inner">
              <div className="flex-between-custom">
                <h3 className="stat-title-custom">Active Subscription</h3>
                {/* ✅ calendar-check-fill = active/valid subscription */}
                <i className="bi bi-calendar-check-fill stat-icon-custom" style={{ fontSize: '28px', color: '#005A8B' }}></i>
              </div>
              <p className="stat-value-custom">{usersData.activeUsers || 0} Active</p>
            </div>
          </div>

        </div>

        {/* Users Table */}
        <div className="admin-management-section" style={{ marginTop: '30px' }}>
          <div className="admin-management-header">
            {/* ✅ table = tabular user information list */}
            <h2 className="admin-management-title" style={{ color: '#005A8B' }}>
              <i className="bi bi-table" style={{ marginRight: '10px' }}></i>
              All Users Information
            </h2>
          </div>

          <div className="admin-search-bar">
            <div className="search-input-wrapper">
              <i className="bi bi-search search-icon"></i>
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search by name, email, phone, pharmacy, or admin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <i className="bi bi-x-circle search-clear-icon" onClick={() => setSearchQuery('')} style={{ cursor: 'pointer' }}></i>
              )}
            </div>
          </div>

          {loading ? (
            <div className="admin-loading">
              <div className="admin-loading-spinner"></div>
              <p className="admin-loading-text">Loading users data...</p>
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {/* ✅ person = user name */}
                    <th><i className="bi bi-person" style={{ marginRight: '5px' }}></i>User Name</th>
                    {/* ✅ envelope = email address */}
                    <th><i className="bi bi-envelope" style={{ marginRight: '5px' }}></i>User Email</th>
                    {/* ✅ hospital = pharmacy/hospital name */}
                    <th><i className="bi bi-hospital" style={{ marginRight: '5px' }}></i>Pharmacy/Hospital</th>
                    {/* ✅ telephone = phone number */}
                    <th><i className="bi bi-telephone" style={{ marginRight: '5px' }}></i>Phone</th>
                    {/* ✅ shield-lock = admin authority/role */}
                    <th><i className="bi bi-shield-lock" style={{ marginRight: '5px' }}></i>Admin Name</th>
                    {/* ✅ envelope-at = admin's email */}
                    <th><i className="bi bi-envelope-at" style={{ marginRight: '5px' }}></i>Admin Email</th>
                    {/* ✅ patch-check = verification status */}
                    <th><i className="bi bi-patch-check" style={{ marginRight: '5px' }}></i>Verification</th>
                    {/* ✅ toggle-on = access enabled/disabled */}
                    <th><i className="bi bi-toggle-on" style={{ marginRight: '5px' }}></i>Access Status</th>
                    {/* ✅ calendar-check = subscription validity */}
                    <th><i className="bi bi-calendar-check" style={{ marginRight: '5px' }}></i>Subscription</th>
                    {/* ✅ calendar-x = expiry date */}
                    <th><i className="bi bi-calendar-x" style={{ marginRight: '5px' }}></i>Expires On</th>
                    {/* ✅ sliders = controls/actions */}
                    <th><i className="bi bi-sliders" style={{ marginRight: '5px' }}></i>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => {
                    const subscriptionStatus = getSubscriptionStatus(user);
                    return (
                      <tr key={user._id}>
                        <td className="admin-table-index">{index + 1}</td>
                        <td className="admin-table-name">{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.pharmacyName || 'N/A'}</td>
                        <td>{user.phone}</td>
                        <td className="admin-table-name" style={{ color: user.adminInfo ? '#005A8B' : '#dc3545' }}>
                          {user.adminInfo?.name || 'No Admin'}
                        </td>
                        <td style={{ color: user.adminInfo ? '#005A8B' : '#dc3545' }}>
                          {user.adminInfo?.email || 'N/A'}
                        </td>
                        <td>
                          {user.isVerified ? (
                            <span className="admin-badge badge-verified">
                              {/* ✅ check-circle-fill = verified/confirmed */}
                              <i className="bi bi-check-circle-fill" style={{ marginRight: '4px' }}></i>Verified
                            </span>
                          ) : (
                            <span className="admin-badge badge-unverified">
                              {/* ✅ exclamation-triangle-fill = warning/unverified */}
                              <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '4px' }}></i>Unverified
                            </span>
                          )}
                        </td>
                        <td>
                          {user.hasAccess ? (
                            <span className="admin-badge badge-enabled">
                              {/* ✅ unlock-fill = access granted/open */}
                              <i className="bi bi-unlock-fill" style={{ marginRight: '4px' }}></i>Enabled
                            </span>
                          ) : (
                            <span className="admin-badge badge-disabled">
                              {/* ✅ lock-fill = access blocked/locked */}
                              <i className="bi bi-lock-fill" style={{ marginRight: '4px' }}></i>Disabled
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`subscription-status ${
                            subscriptionStatus === 'Active'  ? 'sub-active'  :
                            subscriptionStatus === 'Expired' ? 'sub-expired' : 'sub-none'
                          }`}>
                            <i className={`bi ${
                              subscriptionStatus === 'Active'  ? 'bi-check-circle'  :
                              subscriptionStatus === 'Expired' ? 'bi-x-circle'      : 'bi-dash-circle'
                            }`} style={{ marginRight: '4px' }}></i>
                            {subscriptionStatus}
                          </span>
                        </td>
                        <td>
                          {user.subscriptionEndDate ? formatDate(user.subscriptionEndDate) : 'N/A'}
                        </td>
                        <td>
                          <div className="admin-action-buttons">
                            {/* ✅ lock/unlock = toggle access */}
                            <button
                              className={`admin-btn ${user.hasAccess ? 'admin-btn-disable' : 'admin-btn-enable'}`}
                              onClick={() => handleToggleAccess(user._id, user.hasAccess)}
                              title={user.hasAccess ? 'Disable Access' : 'Enable Access'}
                            >
                              <i className={`bi ${user.hasAccess ? 'bi-lock-fill' : 'bi-unlock-fill'}`} style={{ marginRight: '4px' }}></i>
                              {user.hasAccess ? 'Disable' : 'Enable'}
                            </button>


                            {/* ✅ pencil-fill = edit user details */}
                            <button
                              className="admin-btn"
                              style={{ backgroundColor: '#17a2b8', color: '#fff', border: 'none' }}
                              onClick={() => openEditUserModal(user)}
                              title="Edit User"
                            >
                              <i className="bi bi-pencil-fill" style={{ marginRight: '4px' }}></i>Edit
                            </button>

                            {/* ✅ trash-fill = delete */}
                            <button
                              className="admin-btn"
                              style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none' }}
                              onClick={() => handleDelete(user._id)}
                              title="Delete User"
                            >
                              <i className="bi bi-trash-fill" style={{ marginRight: '4px' }}></i>Delete
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
            <div className="admin-empty-state">
              <div className="admin-empty-icon">
                {/* ✅ people = no users empty state */}
                <i className="bi bi-people"></i>
              </div>
              <h3 className="admin-empty-title">{searchQuery ? 'No results found' : 'No users found'}</h3>
              <p className="admin-empty-text">
                {searchQuery ? 'Try adjusting your search terms' : 'Users will appear here once they register'}
              </p>
            </div>
          )}
        </div>

        {/* ══ EDIT USER MODAL ══ */}
        <Modal show={showEditUserModal} onHide={() => setShowEditUserModal(false)} centered size="lg">
          <Modal.Header closeButton style={{ backgroundColor: '#17a2b8', color: 'white' }}>
            <Modal.Title>
              {/* ✅ person-gear = edit user settings */}
              <i className="bi bi-person-gear" style={{ marginRight: '8px' }}></i>
              Edit User — {selectedUser?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              <div style={{ gridColumn: '1 / -1' }}>
                {/* ✅ person-vcard = user identity/info section */}
                <p style={{ ...sectionStyle, color: '#17a2b8' }}>
                  <i className="bi bi-person-vcard" style={{ marginRight: '6px' }}></i>User Information
                </p>
              </div>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  {/* ✅ person = full name */}
                  <i className="bi bi-person" style={{ marginRight: '5px' }}></i>Full Name
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  placeholder="Full name"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  {/* ✅ envelope = email */}
                  <i className="bi bi-envelope" style={{ marginRight: '5px' }}></i>Email Address
                </Form.Label>
                <Form.Control
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  placeholder="Email address"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  {/* ✅ telephone = phone number */}
                  <i className="bi bi-telephone" style={{ marginRight: '5px' }}></i>Phone Number
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  {/* ✅ hospital = pharmacy/hospital name */}
                  <i className="bi bi-hospital" style={{ marginRight: '5px' }}></i>Pharmacy / Hospital Name
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editUserForm.pharmacyName}
                  onChange={(e) => setEditUserForm({ ...editUserForm, pharmacyName: e.target.value })}
                  placeholder="Pharmacy or hospital name"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  <i className="bi bi-geo-alt" style={{ marginRight: '5px' }}></i>City
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editUserForm.city}
                  onChange={(e) => setEditUserForm({ ...editUserForm, city: e.target.value })}
                  placeholder="City"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  <i className="bi bi-pin-map" style={{ marginRight: '5px' }}></i>Area
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editUserForm.area}
                  onChange={(e) => setEditUserForm({ ...editUserForm, area: e.target.value })}
                  placeholder="Area"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  <i className="bi bi-house" style={{ marginRight: '5px' }}></i>Address (optional)
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editUserForm.address}
                  onChange={(e) => setEditUserForm({ ...editUserForm, address: e.target.value })}
                  placeholder="Street address"
                />
              </Form.Group>

              <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                {/* ✅ toggles = account on/off settings */}
                <p style={{ ...sectionStyle, color: '#17a2b8' }}>
                  <i className="bi bi-toggles" style={{ marginRight: '6px' }}></i>Account Status
                </p>
              </div>

              <Form.Group>
                <Form.Check
                  type="switch"
                  id="user-verified-switch"
                  label={
                    <span style={{ fontWeight: '600', color: editUserForm.isVerified ? '#28a745' : '#dc3545' }}>
                      {editUserForm.isVerified ? (
                        <><i className="bi bi-patch-check-fill" style={{ marginRight: '5px' }}></i>Verified</>
                      ) : (
                        <><i className="bi bi-patch-exclamation-fill" style={{ marginRight: '5px' }}></i>Not Verified</>
                      )}
                    </span>
                  }
                  checked={editUserForm.isVerified}
                  onChange={(e) => setEditUserForm({ ...editUserForm, isVerified: e.target.checked })}
                />
              </Form.Group>

              <Form.Group>
                <Form.Check
                  type="switch"
                  id="user-access-switch"
                  label={
                    <span style={{ fontWeight: '600', color: editUserForm.hasAccess ? '#28a745' : '#dc3545' }}>
                      {editUserForm.hasAccess ? (
                        <><i className="bi bi-unlock-fill" style={{ marginRight: '5px' }}></i>Access Enabled</>
                      ) : (
                        <><i className="bi bi-lock-fill" style={{ marginRight: '5px' }}></i>Access Disabled</>
                      )}
                    </span>
                  }
                  checked={editUserForm.hasAccess}
                  onChange={(e) => setEditUserForm({ ...editUserForm, hasAccess: e.target.checked })}
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditUserModal(false)} disabled={savingEdit}>
              <i className="bi bi-x-circle" style={{ marginRight: '5px' }}></i>Cancel
            </Button>
            <Button style={{ backgroundColor: '#17a2b8', border: 'none', color: '#fff' }} onClick={handleSaveUser} disabled={savingEdit}>
              {/* ✅ floppy-disk = save */}
              {savingEdit
                ? <><i className="bi bi-hourglass-split" style={{ marginRight: '5px' }}></i>Saving...</>
                : <><i className="bi bi-floppy-fill" style={{ marginRight: '5px' }}></i>Save User</>
              }
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ══ EDIT ADMIN MODAL ══ */}
        <Modal show={showEditAdminModal} onHide={() => setShowEditAdminModal(false)} centered size="lg">
          <Modal.Header closeButton style={{ backgroundColor: '#6f42c1', color: 'white' }}>
            <Modal.Title>
              {/* ✅ shield-lock = admin/privileged role */}
              <i className="bi bi-shield-lock" style={{ marginRight: '8px' }}></i>
              Edit Admin — {selectedUser?.adminInfo?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              <div style={{ gridColumn: '1 / -1' }}>
                {/* ✅ person-badge = admin identity */}
                <p style={{ ...sectionStyle, color: '#6f42c1' }}>
                  <i className="bi bi-person-badge" style={{ marginRight: '6px' }}></i>Admin Information
                </p>
              </div>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  <i className="bi bi-person" style={{ marginRight: '5px' }}></i>Full Name
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editAdminForm.name}
                  onChange={(e) => setEditAdminForm({ ...editAdminForm, name: e.target.value })}
                  placeholder="Admin full name"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  <i className="bi bi-envelope" style={{ marginRight: '5px' }}></i>Email Address
                </Form.Label>
                <Form.Control
                  type="email"
                  value={editAdminForm.email}
                  onChange={(e) => setEditAdminForm({ ...editAdminForm, email: e.target.value })}
                  placeholder="Admin email"
                />
              </Form.Group>

              <Form.Group>
                <Form.Label style={labelStyle}>
                  <i className="bi bi-telephone" style={{ marginRight: '5px' }}></i>Phone Number
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editAdminForm.phone}
                  onChange={(e) => setEditAdminForm({ ...editAdminForm, phone: e.target.value })}
                  placeholder="Admin phone"
                />
              </Form.Group>



              <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                <p style={{ ...sectionStyle, color: '#6f42c1' }}>
                  <i className="bi bi-toggles" style={{ marginRight: '6px' }}></i>Account Status
                </p>
              </div>

              <Form.Group>
                <Form.Check
                  type="switch"
                  id="admin-verified-switch"
                  label={
                    <span style={{ fontWeight: '600', color: editAdminForm.isVerified ? '#28a745' : '#dc3545' }}>
                      {editAdminForm.isVerified ? (
                        <><i className="bi bi-patch-check-fill" style={{ marginRight: '5px' }}></i>Verified</>
                      ) : (
                        <><i className="bi bi-patch-exclamation-fill" style={{ marginRight: '5px' }}></i>Not Verified</>
                      )}
                    </span>
                  }
                  checked={editAdminForm.isVerified}
                  onChange={(e) => setEditAdminForm({ ...editAdminForm, isVerified: e.target.checked })}
                />
              </Form.Group>

              <Form.Group>
                <Form.Check
                  type="switch"
                  id="admin-access-switch"
                  label={
                    <span style={{ fontWeight: '600', color: editAdminForm.hasAccess ? '#28a745' : '#dc3545' }}>
                      {editAdminForm.hasAccess ? (
                        <><i className="bi bi-unlock-fill" style={{ marginRight: '5px' }}></i>Access Enabled</>
                      ) : (
                        <><i className="bi bi-lock-fill" style={{ marginRight: '5px' }}></i>Access Disabled</>
                      )}
                    </span>
                  }
                  checked={editAdminForm.hasAccess}
                  onChange={(e) => setEditAdminForm({ ...editAdminForm, hasAccess: e.target.checked })}
                />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditAdminModal(false)} disabled={savingEdit}>
              <i className="bi bi-x-circle" style={{ marginRight: '5px' }}></i>Cancel
            </Button>
            <Button style={{ backgroundColor: '#6f42c1', border: 'none', color: '#fff' }} onClick={handleSaveAdmin} disabled={savingEdit}>
              {savingEdit
                ? <><i className="bi bi-hourglass-split" style={{ marginRight: '5px' }}></i>Saving...</>
                : <><i className="bi bi-floppy-fill" style={{ marginRight: '5px' }}></i>Save Admin</>
              }
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ══ SUBSCRIPTION MODAL ══ */}
        <Modal show={showSubscriptionModal} onHide={() => setShowSubscriptionModal(false)} centered>
          <Modal.Header closeButton style={{ backgroundColor: '#005A8B', color: 'white' }}>
            <Modal.Title>
              {/* ✅ calendar-plus = add/extend subscription */}
              <i className="bi bi-calendar-plus" style={{ marginRight: '8px' }}></i>
              Extend Subscription
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedUser && (
              <>
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <p style={{ marginBottom: '8px' }}>
                    <i className="bi bi-person" style={{ marginRight: '6px', color: '#005A8B' }}></i>
                    <strong>Name:</strong> {selectedUser.name}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <i className="bi bi-envelope" style={{ marginRight: '6px', color: '#005A8B' }}></i>
                    <strong>Email:</strong> {selectedUser.email}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <i className="bi bi-person-badge" style={{ marginRight: '6px', color: '#005A8B' }}></i>
                    <strong>Role:</strong> User
                  </p>
                  <p style={{ marginBottom: '0' }}>
                    <i className="bi bi-calendar-check" style={{ marginRight: '6px', color: '#005A8B' }}></i>
                    <strong>Current Status:</strong> {getSubscriptionStatus(selectedUser)}
                  </p>
                </div>
                <Form.Group>
                  <Form.Label style={{ fontWeight: '600', color: '#005A8B' }}>
                    <i className="bi bi-clock" style={{ marginRight: '6px' }}></i>Select Subscription Duration
                  </Form.Label>
                  <Form.Select value={subscriptionMonths} onChange={(e) => setSubscriptionMonths(parseInt(e.target.value))} size="lg">
                    <option value={1}>📅 1 Month</option>
                    <option value={2}>📅 2 Months</option>
                    <option value={3}>📅 3 Months</option>
                    <option value={6}>📅 6 Months</option>
                    <option value={12}>📅 12 Months (1 Year)</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Subscription will be {getSubscriptionStatus(selectedUser) === 'Active' ? 'extended from current end date' : 'started from today'}
                  </Form.Text>
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSubscriptionModal(false)}>
              <i className="bi bi-x-circle" style={{ marginRight: '5px' }}></i>Cancel
            </Button>
            <Button variant="primary" onClick={handleExtendSubscription}>
              {/* ✅ check-circle = confirm/extend */}
              <i className="bi bi-check-circle-fill" style={{ marginRight: '5px' }}></i>Extend Subscription
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ══ ANALYTICS MODAL ══ */}
        <Modal show={showAnalyticsModal} onHide={() => setShowAnalyticsModal(false)} centered size="lg">
          <Modal.Header closeButton style={{ backgroundColor: '#005A8B', color: 'white' }}>
            <Modal.Title>
              {/* ✅ bar-chart-line = analytics/stats */}
              <i className="bi bi-bar-chart-line-fill" style={{ marginRight: '8px' }}></i>
              User Analytics
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loadingAnalytics ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
                <p className="mt-2">Loading analytics...</p>
              </div>
            ) : userAnalytics ? (
              <>
                <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
                  <h4 style={{ color: '#005A8B', marginBottom: '15px' }}>
                    <i className="bi bi-person-circle" style={{ marginRight: '8px' }}></i>
                    {userAnalytics.user.name}
                  </h4>
                  <p style={{ marginBottom: '8px' }}>
                    <i className="bi bi-envelope" style={{ marginRight: '6px', color: '#005A8B' }}></i>
                    <strong>Email:</strong> {userAnalytics.user.email}
                  </p>
                  <p style={{ marginBottom: '0' }}>
                    <i className="bi bi-hospital" style={{ marginRight: '6px', color: '#005A8B' }}></i>
                    <strong>Pharmacy:</strong> {userAnalytics.user.pharmacyName}
                  </p>
                </div>
                <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#e8f4f8', borderRadius: '10px' }}>
                  {/* ✅ boxes = inventory/stock */}
                  <h5 style={{ color: '#005A8B', marginBottom: '15px' }}>
                    <i className="bi bi-boxes" style={{ marginRight: '8px' }}></i>Inventory
                  </h5>
                  <p style={{ marginBottom: '8px' }}>
                    <i className="bi bi-list-ol" style={{ marginRight: '6px' }}></i>
                    <strong>Total Items:</strong> {userAnalytics.inventory.totalItems}
                  </p>
                  <p style={{ marginBottom: '0' }}>
                    <i className="bi bi-currency-rupee" style={{ marginRight: '6px' }}></i>
                    <strong>Total Value:</strong> {formatCurrency(userAnalytics.inventory.totalValue)}
                  </p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#e8f8e8', borderRadius: '10px' }}>
                  {/* ✅ receipt-cutoff = sales transactions */}
                  <h5 style={{ color: '#28a745', marginBottom: '15px' }}>
                    <i className="bi bi-receipt-cutoff" style={{ marginRight: '8px' }}></i>Sales
                  </h5>
                  <p style={{ marginBottom: '8px' }}>
                    <i className="bi bi-currency-rupee" style={{ marginRight: '6px' }}></i>
                    <strong>Total Sales:</strong> {formatCurrency(userAnalytics.sales.totalSales)}
                  </p>
                  <p style={{ marginBottom: '0' }}>
                    <i className="bi bi-arrow-left-right" style={{ marginRight: '6px' }}></i>
                    <strong>Transactions:</strong> {userAnalytics.sales.totalTransactions}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-4"><p>No analytics data available</p></div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAnalyticsModal(false)}>
              <i className="bi bi-x-circle" style={{ marginRight: '5px' }}></i>Close
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
      <Footers />
    </>
  );
};

export default SuperAdminUsers;