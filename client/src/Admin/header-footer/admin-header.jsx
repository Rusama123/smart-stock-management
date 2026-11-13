import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaList, FaTimes } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import '../../Admin/Style/header.css';

const Header = ({ onSearch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user'));

  // ✅ Role check
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

  // ✅ FIXED: Role-based page name
  const getCurrentPageName = () => {
    const path = location.pathname;

    if (isSuperAdmin) {
      if (path.includes('/admin-control'))      return 'Super Admin Control';
      if (path.includes('/super-admin-users'))  return 'User Management';
      return 'Super Admin Panel';
    }

    if (isAdmin) {
      if (path.includes('/admin-control'))      return 'Admin Control Panel';
      return 'Admin Panel';
    }

    return 'Admin Panel';
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu  = () => setIsOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const clearSearch = () => {
    setSearchValue('');
    if (onSearch) onSearch('');
  };

  // Close profile dropdown and panel on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
      if (isOpen && !e.target.closest('.slide-panel') && !e.target.closest('.menu-toggle-btn')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  // Prevent body scroll when panel open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <div className="admin-header-wrapper">
      {/* ===== MAIN HEADER ===== */}
      <div className="header-bar">
        <div className="header-inner">

          {/* LEFT: Menu toggle */}
          <button onClick={toggleMenu} className="menu-toggle-btn">
            <FaList className="menu-icon" />
            <span className="menu-page-label">{getCurrentPageName()}</span>
          </button>

          {/* CENTER: Search Bar */}
          <div className="header-search-wrapper">
            <i className="bi bi-search header-search-icon"></i>
            <input
              type="text"
              className="header-search-input"
              placeholder="Search..."
              value={searchValue}
              onChange={handleSearchChange}
            />
            {searchValue && (
              <i
                className="bi bi-x-circle header-search-clear"
                onClick={clearSearch}
              ></i>
            )}
          </div>

          {/* <NotificationBell /> */}

          {/* RIGHT: Profile Avatar */}
          <div className="header-profile-wrapper" ref={profileRef}>
            {user ? (
              <>
                <button
                  className="profile-avatar-btn"
                  onClick={() => setShowProfile(!showProfile)}
                  title={user.name}
                >
                  {getInitials(user.name)}
                </button>

                {/* Profile Dropdown */}
                {showProfile && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-avatar">
                        {getInitials(user.name)}
                      </div>
                      <div className="profile-dropdown-info">
                        <span className="profile-dropdown-name">{user.name}</span>
                        <span className="profile-dropdown-role">
                          {/* ✅ Role-based label in dropdown */}
                          {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : user.role || 'Admin'}
                        </span>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider"></div>
                    <button
                      className="profile-dropdown-logout"
                      onClick={handleLogout}
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="header-auth-btns">
                <Link to="/admin/login">
                  <button className="header-btn-login">Login</button>
                </Link>
                <Link to="/admin/register">
                  <button className="header-btn-register">Register</button>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ===== OVERLAY ===== */}
      <div
        className={`slide-overlay ${isOpen ? 'overlay-open' : ''}`}
        onClick={closeMenu}
      />

      {/* ===== SLIDE PANEL ===== */}
      <div className={`slide-panel ${isOpen ? 'panel-open' : ''}`}>
        <div className="panel-header">
          <img src="/medix.png" alt="logo" className="panel-logo" />
          <button onClick={closeMenu} className="panel-close-btn">
            <FaTimes />
          </button>
        </div>

        <nav className="panel-nav mt-4">

          {/* ✅ Super Admin: dono links dikhao */}
          {isSuperAdmin && (
            <>
              <Link
                to='/admin/control-panel/admin-control'
                onClick={closeMenu}
                className={`panel-link ${location.pathname.includes('/admin-control') ? 'panel-link-active' : ''}`}
              >
                <i className="bi bi-shield-lock"></i> Super Admin
              </Link>
              {/* <Link
                to='/admin/control-panel/super-admin-users'
                onClick={closeMenu}
                className={`panel-link ${location.pathname.includes('/super-admin-users') ? 'panel-link-active' : ''}`}
              >
                <i className="bi bi-people"></i> User Management
              </Link> */}
            </>
          )}

          {/* ✅ Admin: sirf Admin Control dikhao */}
          {isAdmin && (
            <Link
              to='/admin/control-panel/admin-control'
              onClick={closeMenu}
              className={`panel-link ${location.pathname.includes('/admin-control') ? 'panel-link-active' : ''}`}
            >
              <i className="bi bi-person-gear"></i> Admin Panel
            </Link>
          )}

          <button
            onClick={() => { closeMenu(); handleLogout(); }}
            className="panel-logout-btn"
          >
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Header;