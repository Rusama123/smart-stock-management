import React, { useState, useEffect } from 'react'
import axios from 'axios';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import '../Style/dashboard.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Header from '../header-footer/admin-header';
import Footers from '../header-footer/footer';

/* ─────────────────────────────────────────────────
   Inline SVG icon components — kept as-is (original)
───────────────────────────────────────────────── */

const IconPeople = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
    <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
  </svg>
);

const IconVerified = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
    <path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
  </svg>
);

const IconUnverified = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/>
    <path d="M6.146 5.146a.5.5 0 0 1 .708 0L8 6.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 7l1.147 1.146a.5.5 0 0 1-.708.708L8 7.707 6.854 8.854a.5.5 0 0 1-.708-.708L7.293 7 6.146 5.854a.5.5 0 0 1 0-.708z"/>
  </svg>
);

const IconPending = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
    <path d="M2 1.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1-.5-.5zm2.5.5v1a3.5 3.5 0 0 0 1.989 3.158c.533.256 1.011.791 1.011 1.342v.7c0 .551-.478 1.086-1.011 1.342A3.5 3.5 0 0 0 4.5 13v1h7v-1a3.5 3.5 0 0 0-1.989-3.158C9.978 9.586 9.5 9.051 9.5 8.5v-.7c0-.551.478-1.086 1.011-1.342A3.5 3.5 0 0 0 12.5 3V2h-8z"/>
  </svg>
);

const IconActive = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
    <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
  </svg>
);

const IconExpired = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6.146 7.146a.5.5 0 0 1 .708 0L8 8.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 9l1.147 1.146a.5.5 0 0 1-.708.708L8 9.707l-1.146 1.147a.5.5 0 0 1-.708-.708L7.293 9 6.146 7.854a.5.5 0 0 1 0-.708z"/>
    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
  </svg>
);

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10c-2.029 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
  </svg>
);

const AdminControl = () => {
  const [dashboardData, setDashboardData] = useState({
    userStats: {
      totalUsers: 0, totalAdmins: 0, verifiedAdmins: 0,
      unverifiedAdmins: 0, activeSubscriptions: 0,
      expiredSubscriptions: 0, pendingApproval: 0
    },
    users: [],
    currentUserRole: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [subscriptionMonths, setSubscriptionMonths] = useState(1);

  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '',
    pharmacyName: '', city: '', area: '', address: '',
    isVerified: false, hasAccess: false,
  });

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    name: '', email: '', phone: '', pharmacyName: '', city: '', area: '', address: '', password: ''
  });

  useEffect(() => { fetchUserData(); }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData({
        userStats: response.data.userStats,
        users: response.data.users,
        currentUserRole: response.data.currentUserRole,
      });
      setError(null);
    } catch (err) {
      setError('Failed to load user data');
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
    const today = new Date();
    if (endDate < today) return 'Expired';
    if (endDate >= today) return 'Active';
    return 'Unknown';
  };

  const handleToggleAccess = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = !currentStatus;
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${userId}/access`,
        { hasAccess: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Show the server message (includes subscription date when enabling)
      // alert(res.data?.message || `Access ${newStatus ? 'granted' : 'revoked'} successfully`);
      fetchUserData();
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
      fetchUserData();
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

  const openAddUserModal = () => {
    if (dashboardData.users.length >= 3) {
      alert("You have already reached the maximum limit of 3 users.");
      return;
    }
    setAddUserForm({
      name: '', email: '', phone: '', pharmacyName: '', city: '', area: '', address: '', password: ''
    });
    setShowAddUserModal(true);
  };

  const handleAddUser = async () => {
    if (!addUserForm.name || !addUserForm.pharmacyName || !addUserForm.phone || !addUserForm.email || !addUserForm.password || !addUserForm.city || !addUserForm.area) {
      alert("Name, pharmacy, phone, email, password, city, and area are required!");
      return;
    }
    if (addUserForm.phone.length !== 11) {
      alert("Phone number must be exactly 11 digits!");
      return;
    }
    try {
      setAddingUser(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/add`,
        addUserForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAddUserModal(false);
      fetchUserData();
      // alert("User added successfully!");
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(`Are you sure you want to delete this ${isSuperAdmin ? 'admin and all associated users' : 'user'}?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const url = isSuperAdmin
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/superadmin/admins/${userId}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${userId}`;

      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchUserData();
      // alert(`${isSuperAdmin ? 'Admin' : 'User'} deleted successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      pharmacyName: user.pharmacyName || '',
      city: user.city || '',
      area: user.area || '',
      address: user.address || '',
      isVerified: user.isVerified || false,
      hasAccess: user.hasAccess || false,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      setSavingEdit(true);
      const token = localStorage.getItem('token');
      const url = isSuperAdmin
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/superadmin/admins/${selectedUser._id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/${selectedUser._id}/edit`;

      await axios.put(url, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowEditModal(false);
      fetchUserData();
      // alert(`${isSuperAdmin ? 'Admin' : 'User'} updated successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredUsers = dashboardData.users.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.phone?.toLowerCase().includes(q) ||
      user.pharmacyName?.toLowerCase().includes(q)
    );
  });

  const isSuperAdmin = dashboardData.currentUserRole === 'superadmin';
  const isAdmin = dashboardData.currentUserRole === 'admin';
  const editColor = isSuperAdmin ? '#6f42c1' : '#17a2b8';
  const labelStyle = { fontWeight: '600', color: '#005A8B', marginBottom: '4px' };
  const sectionStyle = { fontWeight: '700', color: '#005A8B', fontSize: '14px', marginBottom: '10px', marginTop: '6px' };

  return (
    <>
      <Header />

      <div style={{ flex: '1' }}>
        <div className='container-d'>
          <div className="justify-content-between align-items-center mb-4 text-center">
            <h1 className='text-center h1blue'>
              {isSuperAdmin ? (
                <>
                  {/* ✅ shield-lock-fill = super admin / highest privilege */}
                  <i className="bi bi-shield-lock-fill" style={{ color: '#005A8B' }}></i>
                  {' '}Super Admin  Panel
                </>
              ) : (
                <>
                  {/* ✅ person-gear = admin managing users */}
                  <i className="bi bi-person-gear" style={{ color: '#005A8B' }}></i>
                  {' '}Admin Control 
                </>
              )}
            </h1>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <strong>Error!</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
              <div className="mt-2">
                <button className="btn btn-sm btn-primary" onClick={fetchUserData}>Retry</button>
              </div>
            </div>
          )}

          {/* ── SuperAdmin Stats ── */}
          {isSuperAdmin && (
            <>
              <div className='row mx-1 mb-1'>
                {[
                  { label: 'Total Admin',       Icon: IconPeople,     val: dashboardData.userStats.totalAdmins },
                  { label: 'Verified Admins',   Icon: IconVerified,   val: dashboardData.userStats.verifiedAdmins },
                  { label: 'Unverified Admins', Icon: IconUnverified, val: dashboardData.userStats.unverifiedAdmins },
                  { label: 'Pending Approval',  Icon: IconPending,    val: dashboardData.userStats.pendingApproval },
                ].map(({ label, Icon, val }) => (
                  <div className='col-lg-3 col-md-6 col-6 stat-card-custom' key={label}>
                    <div className='stat-card-inner'>
                      <div className='flex-between-custom'>
                        <div className='stat-title-custom'>{label}</div>
                        <div className='stat-icon-custom'><Icon /></div>
                      </div>
                      <div className='stat-value-custom'>{val !== undefined ? val : 0}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className='row mx-1 mb-4'>
                {[
                  { label: 'Active Subscriptions',  Icon: IconActive,  val: dashboardData.userStats.activeSubscriptions,  suffix: 'Active' },
                  { label: 'Expired Subscriptions', Icon: IconExpired, val: dashboardData.userStats.expiredSubscriptions, suffix: 'Expired' },
                ].map(({ label, Icon, val, suffix }) => (
                  <div className='col-lg-3 col-md-6 col-6 stat-card-custom' key={label}>
                    <div className='stat-card-inner'>
                      <div className='flex-between-custom'>
                        <div className='stat-title-custom'>{label}</div>
                        <div className='stat-icon-custom'><Icon /></div>
                      </div>
                      <div className='stat-value-custom'>{val || 0} {suffix}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Admin Stats ── */}
          {isAdmin && (
            <div className='row mx-2 mb-4'>
              {[
                { label: 'Total Users',           Icon: IconUser,    val: dashboardData.userStats.totalUsers,           suffix: 'Users' },
                { label: 'Active Subscriptions',  Icon: IconActive,  val: dashboardData.userStats.activeSubscriptions,  suffix: 'Active' },
                // { label: 'Expired Subscriptions', Icon: IconExpired, val: dashboardData.userStats.expiredSubscriptions, suffix: 'Expired' },
                { label: 'Pending Approval',      Icon: IconPending, val: dashboardData.userStats.pendingApproval,      suffix: 'Pending' },
              ].map(({ label, Icon, val, suffix }) => (
                <div className='col-lg-3 col-md-6 col-6 stat-card-custom' key={label}>
                  <div className='stat-card-inner'>
                    <div className='flex-between-custom'>
                      <div className='stat-title-custom'>{label}</div>
                      <div className='stat-icon-custom'><Icon /></div>
                    </div>
                    <div className='stat-value-custom'>{val || 0} {suffix}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className='admin-management-section'>
          <div className='admin-management-header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className='admin-management-title' style={{ marginBottom: 0 }}>
              {/* ✅ person-gear = admin mgmt | people = user mgmt */}
              <i className={`bi ${isSuperAdmin ? 'bi-person-gear' : 'bi-people'}`} style={{ marginRight: '10px' }}></i>
              {isSuperAdmin ? 'Admin Management' : 'User Management'}
            </h2>
            {isAdmin && (
              <button 
                className="btn btn-success fw-semibold"
                onClick={openAddUserModal}
              >
                <i className="bi bi-person-plus-fill" style={{ marginRight: '6px' }}></i>
                Add User
              </button>
            )}
          </div>

          <div className='admin-search-bar'>
            <div className='search-input-wrapper'>
              <i className="bi bi-search search-icon"></i>
              <input
                type="text"
                className='admin-search-input'
                placeholder="Search by name, email, phone, or pharmacy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <i className="bi bi-x-circle search-clear-icon" onClick={() => setSearchQuery('')} style={{ cursor: 'pointer' }}></i>
              )}
            </div>
          </div>

          {loading ? (
            <div className='admin-loading'>
              <div className='admin-loading-spinner'></div>
              <p className='admin-loading-text'>Loading data...</p>
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className='admin-table-container'>
              <table className='admin-table'>
                <thead>
                  <tr>
                    <th>#</th>
                    {/* ✅ person = name */}
                    <th><i className="bi bi-person" style={{ marginRight: '5px' }}></i>Name</th>
                    {/* ✅ envelope = email */}
                    <th><i className="bi bi-envelope" style={{ marginRight: '5px' }}></i>Email</th>
                    {/* ✅ hospital = pharmacy/hospital */}
                    {isAdmin && <th><i className="bi bi-hospital" style={{ marginRight: '5px' }}></i>Pharmacy/Hospital</th>}
                    {/* ✅ telephone = phone */}
                    <th><i className="bi bi-telephone" style={{ marginRight: '5px' }}></i>Phone</th>
                    {/* ✅ patch-check = verification status */}
                    <th><i className="bi bi-patch-check" style={{ marginRight: '5px' }}></i>Verification</th>
                    {/* ✅ toggle-on = access on/off */}
                    <th><i className="bi bi-toggle-on" style={{ marginRight: '5px' }}></i>Access Status</th>
                    {/* ✅ calendar-check = valid subscription */}
                    <th><i className="bi bi-calendar-check" style={{ marginRight: '5px' }}></i>Subscription</th>
                    {/* ✅ calendar-x = expiry date */}
                    <th><i className="bi bi-calendar-x" style={{ marginRight: '5px' }}></i>Expires On</th>
                    {/* ✅ sliders = action controls */}
                    <th><i className="bi bi-sliders" style={{ marginRight: '5px' }}></i>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => {
                    const subscriptionStatus = getSubscriptionStatus(user);
                    return (
                      <tr key={user._id}>
                        <td className='admin-table-index'>{index + 1}</td>
                        <td className='admin-table-name'>{user.name}</td>
                        <td>{user.email}</td>
                        {isAdmin && <td>{user.pharmacyName || 'N/A'}</td>}
                        <td>{user.phone}</td>
                        <td>
                          {user.isVerified ? (
                            <span className="admin-badge badge-verified">
                              {/* ✅ check-circle-fill = confirmed/verified */}
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
                              {/* ✅ unlock-fill = access open */}
                              <i className="bi bi-unlock-fill" style={{ marginRight: '4px' }}></i>Enabled
                            </span>
                          ) : (
                            <span className="admin-badge badge-disabled">
                              {/* ✅ lock-fill = access locked */}
                              <i className="bi bi-lock-fill" style={{ marginRight: '4px' }}></i>Disabled
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`subscription-status ${
                            subscriptionStatus === 'Active' ? 'sub-active' :
                            subscriptionStatus === 'Expired' ? 'sub-expired' : 'sub-none'
                          }`}>
                            <i className={`bi ${
                              subscriptionStatus === 'Active'  ? 'bi-check-circle'  :
                              subscriptionStatus === 'Expired' ? 'bi-x-circle'      : 'bi-dash-circle'
                            }`} style={{ marginRight: '4px' }}></i>
                            {subscriptionStatus}
                          </span>
                        </td>
                        <td>{user.subscriptionEndDate ? formatDate(user.subscriptionEndDate) : 'N/A'}</td>
                        <td>
                          <div className="admin-action-buttons">
                            {/* ✅ lock/unlock = toggle access */}
                            <button
                              className={`admin-btn ${user.hasAccess ? 'admin-btn-disable' : 'admin-btn-enable'}`}
                              onClick={() => handleToggleAccess(user._id, user.hasAccess)}
                            >
                              <i className={`bi ${user.hasAccess ? 'bi-lock-fill' : 'bi-unlock-fill'}`} style={{ marginRight: '4px' }}></i>
                              {user.hasAccess ? 'Disable' : 'Enable'}
                            </button>


                            {/* ✅ bar-chart-fill = analytics/stats */}
                            {isAdmin && (
                              <button className="admin-btn admin-btn-stats" onClick={() => openAnalyticsModal(user)}>
                                <i className="bi bi-bar-chart-fill" style={{ marginRight: '4px' }}></i>Stats
                              </button>
                            )}

                            {/* ✅ pencil-fill = edit */}
                            <button
                              className="admin-btn"
                              style={{ backgroundColor: editColor, color: '#fff', border: 'none' }}
                              onClick={() => openEditModal(user)}
                            >
                              <i className="bi bi-pencil-fill" style={{ marginRight: '4px' }}></i>Edit
                            </button>

                            {/* ✅ trash-fill = delete */}
                            <button
                              className="admin-btn"
                              style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none' }}
                              onClick={() => handleDelete(user._id)}
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
            <div className='admin-empty-state'>
              <div className='admin-empty-icon'>
                {/* ✅ person-gear = no admins | people = no users */}
                <i className={`bi ${isSuperAdmin ? 'bi-person-gear' : 'bi-people'}`}></i>
              </div>
              <h5 className='admin-empty-title'>
                {searchQuery ? 'No results found' : (isSuperAdmin ? 'No admin accounts found' : 'No users found')}
              </h5>
              <p className='admin-empty-text'>
                {searchQuery ? 'Try adjusting your search terms' : (isSuperAdmin ? 'Admins will appear here once they register' : 'Users will appear here once they register')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ══ ADD USER MODAL ══ */}
      <Modal show={showAddUserModal} onHide={() => setShowAddUserModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#28a745', color: '#fff' }}>
          <Modal.Title>
            <i className="bi bi-person-plus-fill" style={{ marginRight: '8px' }}></i>
            Add New User
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={sectionStyle}>
                <i className="bi bi-person-vcard" style={{ marginRight: '6px' }}></i>
                User Information
              </p>
            </div>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-person" style={{ marginRight: '5px' }}></i>Full Name
              </Form.Label>
              <Form.Control 
                type="text" 
                value={addUserForm.name} 
                onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })} 
                placeholder="Full name (min 4 characters)" 
              />
            </Form.Group>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-envelope" style={{ marginRight: '5px' }}></i>Email Address
              </Form.Label>
              <Form.Control 
                type="email" 
                value={addUserForm.email} 
                onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })} 
                placeholder="Email address" 
              />
            </Form.Group>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-telephone" style={{ marginRight: '5px' }}></i>Phone Number
              </Form.Label>
              <Form.Control 
                type="text" 
                value={addUserForm.phone} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 11) return;
                  if (val && !/^\d*$/.test(val)) return;
                  setAddUserForm({ ...addUserForm, phone: val });
                }} 
                placeholder="Phone number (11 digits)" 
              />
            </Form.Group>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-hospital" style={{ marginRight: '5px' }}></i>Pharmacy / Hospital Name
              </Form.Label>
              <Form.Control 
                type="text" 
                value={addUserForm.pharmacyName} 
                onChange={(e) => setAddUserForm({ ...addUserForm, pharmacyName: e.target.value })} 
                placeholder="Pharmacy or hospital name (min 8 characters)" 
              />
            </Form.Group>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-geo-alt" style={{ marginRight: '5px' }}></i>City
              </Form.Label>
              <Form.Control 
                type="text" 
                value={addUserForm.city} 
                onChange={(e) => setAddUserForm({ ...addUserForm, city: e.target.value })} 
                placeholder="City (e.g. Lahore)" 
              />
            </Form.Group>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-pin-map" style={{ marginRight: '5px' }}></i>Area
              </Form.Label>
              <Form.Control 
                type="text" 
                value={addUserForm.area} 
                onChange={(e) => setAddUserForm({ ...addUserForm, area: e.target.value })} 
                placeholder="Area / locality" 
              />
            </Form.Group>

            <Form.Group style={{ gridColumn: '1 / -1' }}>
              <Form.Label style={labelStyle}>
                <i className="bi bi-house" style={{ marginRight: '5px' }}></i>Address (optional)
              </Form.Label>
              <Form.Control 
                type="text" 
                value={addUserForm.address} 
                onChange={(e) => setAddUserForm({ ...addUserForm, address: e.target.value })} 
                placeholder="Street address (optional)" 
              />
            </Form.Group>

            <Form.Group style={{ gridColumn: '1 / -1' }}>
              <Form.Label style={labelStyle}>
                <i className="bi bi-key" style={{ marginRight: '5px' }}></i>Password
              </Form.Label>
              <Form.Control 
                type="password" 
                value={addUserForm.password} 
                onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })} 
                placeholder="Password (min 8 characters, 1 uppercase, 1 number)" 
              />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddUserModal(false)} disabled={addingUser}>
            <i className="bi bi-x-circle" style={{ marginRight: '5px' }}></i>Cancel
          </Button>
          <Button variant="success" onClick={handleAddUser} disabled={addingUser}>
            {addingUser
              ? <><i className="bi bi-hourglass-split" style={{ marginRight: '5px' }}></i>Adding...</>
              : <><i className="bi bi-person-plus-fill" style={{ marginRight: '5px' }}></i>Add User</>
            }
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══ EDIT MODAL ══ */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: editColor, color: '#fff' }}>
          <Modal.Title>
            {/* ✅ person-gear = edit admin | person-fill-gear = edit user */}
            <i className={`bi ${isSuperAdmin ? 'bi-shield-lock' : 'bi-person-gear'}`} style={{ marginRight: '8px' }}></i>
            Edit {isSuperAdmin ? 'Admin' : 'User'} — {selectedUser?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              {/* ✅ person-vcard = user identity info */}
              <p style={sectionStyle}>
                <i className={`bi ${isSuperAdmin ? 'bi-person-badge' : 'bi-person-vcard'}`} style={{ marginRight: '6px' }}></i>
                {isSuperAdmin ? 'Admin' : 'User'} Information
              </p>
            </div>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-person" style={{ marginRight: '5px' }}></i>Full Name
              </Form.Label>
              <Form.Control type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Full name" />
            </Form.Group>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-envelope" style={{ marginRight: '5px' }}></i>Email Address
              </Form.Label>
              <Form.Control type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email address" />
            </Form.Group>

            <Form.Group>
              <Form.Label style={labelStyle}>
                <i className="bi bi-telephone" style={{ marginRight: '5px' }}></i>Phone Number
              </Form.Label>
              <Form.Control type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone number" />
            </Form.Group>

            {isAdmin && (
              <>
                <Form.Group>
                  <Form.Label style={labelStyle}>
                    <i className="bi bi-hospital" style={{ marginRight: '5px' }}></i>Pharmacy / Hospital Name
                  </Form.Label>
                  <Form.Control type="text" value={editForm.pharmacyName} onChange={(e) => setEditForm({ ...editForm, pharmacyName: e.target.value })} placeholder="Pharmacy or hospital name" />
                </Form.Group>

                <Form.Group>
                  <Form.Label style={labelStyle}>
                    <i className="bi bi-geo-alt" style={{ marginRight: '5px' }}></i>City
                  </Form.Label>
                  <Form.Control type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="City" />
                </Form.Group>

                <Form.Group>
                  <Form.Label style={labelStyle}>
                    <i className="bi bi-pin-map" style={{ marginRight: '5px' }}></i>Area
                  </Form.Label>
                  <Form.Control type="text" value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: e.target.value })} placeholder="Area" />
                </Form.Group>

                <Form.Group>
                  <Form.Label style={labelStyle}>
                    <i className="bi bi-house" style={{ marginRight: '5px' }}></i>Address (optional)
                  </Form.Label>
                  <Form.Control type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Street address" />
                </Form.Group>
              </>
            )}



            <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
              {/* ✅ toggles = on/off account settings */}
              <p style={sectionStyle}>
                <i className="bi bi-toggles" style={{ marginRight: '6px' }}></i>Account Status
              </p>
            </div>

            <Form.Group>
              <Form.Check
                type="switch"
                id="edit-verified-switch"
                label={
                  <span style={{ fontWeight: '600', color: editForm.isVerified ? '#28a745' : '#dc3545' }}>
                    {editForm.isVerified
                      ? <><i className="bi bi-patch-check-fill" style={{ marginRight: '5px' }}></i>Verified</>
                      : <><i className="bi bi-patch-exclamation-fill" style={{ marginRight: '5px' }}></i>Not Verified</>
                    }
                  </span>
                }
                checked={editForm.isVerified}
                onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
              />
            </Form.Group>

            <Form.Group>
              <Form.Check
                type="switch"
                id="edit-access-switch"
                label={
                  <span style={{ fontWeight: '600', color: editForm.hasAccess ? '#28a745' : '#dc3545' }}>
                    {editForm.hasAccess
                      ? <><i className="bi bi-unlock-fill" style={{ marginRight: '5px' }}></i>Access Enabled</>
                      : <><i className="bi bi-lock-fill" style={{ marginRight: '5px' }}></i>Access Disabled</>
                    }
                  </span>
                }
                checked={editForm.hasAccess}
                onChange={(e) => setEditForm({ ...editForm, hasAccess: e.target.checked })}
              />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={savingEdit}>
            <i className="bi bi-x-circle" style={{ marginRight: '5px' }}></i>Cancel
          </Button>
          <Button style={{ backgroundColor: editColor, border: 'none', color: '#fff' }} onClick={handleSaveEdit} disabled={savingEdit}>
            {savingEdit
              ? <><i className="bi bi-hourglass-split" style={{ marginRight: '5px' }}></i>Saving...</>
              : <><i className="bi bi-floppy-fill" style={{ marginRight: '5px' }}></i>Save {isSuperAdmin ? 'Admin' : 'User'}</>
            }
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══ SUBSCRIPTION MODAL ══ */}
      <Modal show={showSubscriptionModal} onHide={() => setShowSubscriptionModal(false)} centered>
        <Modal.Header closeButton>
          {/* ✅ calendar-plus = add/extend subscription */}
          <Modal.Title>
            <i className="bi bi-calendar-plus" style={{ marginRight: '8px' }}></i>Extend Subscription
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <>
              <div className="alert alert-info">
                <p className="mb-1">
                  <i className="bi bi-person" style={{ marginRight: '6px' }}></i>
                  <strong>Name:</strong> {selectedUser.name}
                </p>
                <p className="mb-1">
                  <i className="bi bi-envelope" style={{ marginRight: '6px' }}></i>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
                <p className="mb-0">
                  <i className="bi bi-calendar-check" style={{ marginRight: '6px' }}></i>
                  <strong>Current Status:</strong> {getSubscriptionStatus(selectedUser)}
                </p>
              </div>
              <Form.Group className="mt-3">
                <Form.Label>
                  <i className="bi bi-clock" style={{ marginRight: '6px' }}></i>
                  <strong>Select Subscription Duration</strong>
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
          <Button variant="success" onClick={handleExtendSubscription}>
            {/* ✅ check-circle-fill = confirm */}
            <i className="bi bi-check-circle-fill" style={{ marginRight: '5px' }}></i>Extend Subscription
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ══ ANALYTICS MODAL ══ */}
      <Modal show={showAnalyticsModal} onHide={() => setShowAnalyticsModal(false)} centered size="lg">
        <Modal.Header closeButton>
          {/* ✅ bar-chart-line-fill = analytics/statistics */}
          <Modal.Title>
            <i className="bi bi-bar-chart-line-fill" style={{ marginRight: '8px' }}></i>User Analytics
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingAnalytics ? (
            <div className='text-center py-4'>
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
              <p className='mt-2'>Loading analytics...</p>
            </div>
          ) : userAnalytics ? (
            <>
              <div className="alert alert-primary">
                <h5 className="mb-2">
                  <i className="bi bi-person-circle" style={{ marginRight: '8px' }}></i>
                  {userAnalytics.user.name}
                </h5>
                <p className="mb-1">
                  <i className="bi bi-envelope" style={{ marginRight: '6px' }}></i>
                  <strong>Email:</strong> {userAnalytics.user.email}
                </p>
                <p className="mb-0">
                  <i className="bi bi-hospital" style={{ marginRight: '6px' }}></i>
                  <strong>Pharmacy:</strong> {userAnalytics.user.pharmacyName}
                </p>
              </div>
              <hr />
              <div className="row">
                <div className="col-md-6">
                  <div className="card bg-light mb-3">
                    <div className="card-body">
                      {/* ✅ boxes = inventory/stock */}
                      <h6 className="card-title">
                        <i className="bi bi-boxes" style={{ marginRight: '6px' }}></i>Inventory
                      </h6>
                      <p className="card-text mb-1">
                        <i className="bi bi-list-ol" style={{ marginRight: '5px' }}></i>
                        <strong>Total Items:</strong> {userAnalytics.inventory.totalItems}
                      </p>
                      <p className="card-text">
                        <i className="bi bi-currency-rupee" style={{ marginRight: '5px' }}></i>
                        <strong>Total Value:</strong> {formatCurrency(userAnalytics.inventory.totalValue)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card bg-light mb-3">
                    <div className="card-body">
                      {/* ✅ receipt-cutoff = sales transactions */}
                      <h6 className="card-title">
                        <i className="bi bi-receipt-cutoff" style={{ marginRight: '6px' }}></i>Sales
                      </h6>
                      <p className="card-text mb-1">
                        <i className="bi bi-currency-rupee" style={{ marginRight: '5px' }}></i>
                        <strong>Total Sales:</strong> {formatCurrency(userAnalytics.sales.totalSales)}
                      </p>
                      <p className="card-text">
                        <i className="bi bi-arrow-left-right" style={{ marginRight: '5px' }}></i>
                        <strong>Transactions:</strong> {userAnalytics.sales.totalTransactions}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted">No analytics data available</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAnalyticsModal(false)}>
            <i className="bi bi-x-circle" style={{ marginRight: '5px' }}></i>Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Footers />
    </>
  );
};

export default AdminControl;