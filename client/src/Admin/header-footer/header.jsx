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

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

  const getCurrentPageName = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/inventory')) return 'Inventory';
    if (path.includes('/alerts')) return 'Alerts';
    if (path.includes('/suppliers')) return 'Suppliers';
    if (path.includes('/PharmacyPOS')) return 'PharmacyPOS';
    if (path.includes('/ai-insights')) return 'Smart Hub';
    if (path.includes('/admin-control')) return 'Admin Control';
    return 'Dashboard';
  };

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  // ✅ FIXED: Sirf value update karo, koi redirect/search nahi on every keystroke
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
  };

  // ✅ Enter press hone pe hi search trigger hoga
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const val = searchValue.trim();
      if (onSearch) {
        // Already inventory page par hain
        onSearch(val);
      } else {
        // Doosre pages se → inventory par redirect karo with query
        if (val) {
          navigate(`/admin/pages/inventory?search=${encodeURIComponent(val)}`, {
            state: { fromSearch: true }
          });
        }
      }
    }
  };

  const clearSearch = () => {
    setSearchValue('');
    if (onSearch) onSearch('');
  };

  // URL change hone par search clear karo (page change)
  useEffect(() => {
    if (!location.pathname.includes('/inventory')) {
      setSearchValue('');
    }
  }, [location.pathname]);

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

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <div className="admin-header-wrapper">
      <div className="header-bar">
        <div className="header-inner">

          <button onClick={toggleMenu} className="menu-toggle-btn">
            <FaList className="menu-icon" />
            <span className="menu-page-label">{getCurrentPageName()}</span>
          </button>

          <div className="header-search-wrapper">
            <i className="bi bi-search header-search-icon"></i>
            <input
              type="text"
              className="header-search-input"
              placeholder="Medicine search..."
              value={searchValue}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}  // ✅ Enter pe search
            />
            {searchValue && (
              <i
                className="bi bi-x-circle header-search-clear"
                onClick={clearSearch}
              ></i>
            )}
          </div>

          <NotificationBell />

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

                {showProfile && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-avatar">
                        {getInitials(user.name)}
                      </div>
                      <div className="profile-dropdown-info">
                        <span className="profile-dropdown-name">{user.name}</span>
                        <span className="profile-dropdown-role">{user.role || 'User'}</span>
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

      <div
        className={`slide-overlay ${isOpen ? 'overlay-open' : ''}`}
        onClick={closeMenu}
      />

      <div className={`slide-panel ${isOpen ? 'panel-open' : ''}`}>
        <div className="panel-header">
          <img src="/medix.png" alt="logo" className="panel-logo" />
          <button onClick={closeMenu} className="panel-close-btn">
            <FaTimes />
          </button>
        </div>

        <nav className="panel-nav mt-4">
          <Link to='/admin/pages/dashboard' onClick={closeMenu}
            className={`panel-link ${location.pathname.includes('/dashboard') ? 'panel-link-active' : ''}`}>
            <i className="bi bi-speedometer2"></i> Dashboard
          </Link>
          <Link to='/admin/pages/inventory' onClick={closeMenu}
            className={`panel-link ${location.pathname.includes('/inventory') ? 'panel-link-active' : ''}`}>
            <i className="bi bi-box-seam"></i> Inventory
          </Link>
          <Link to='/admin/pages/alerts' onClick={closeMenu}
            className={`panel-link ${location.pathname.includes('/alerts') ? 'panel-link-active' : ''}`}>
            <i className="bi bi-bell"></i> Alerts
          </Link>
          <Link to='/admin/pages/suppliers' onClick={closeMenu}
            className={`panel-link ${location.pathname.includes('/suppliers') ? 'panel-link-active' : ''}`}>
            <i className="bi bi-truck"></i> Suppliers
          </Link>
          <Link to='/admin/pages/PharmacyPOS' onClick={closeMenu}
            className={`panel-link ${location.pathname.includes('/PharmacyPOS') ? 'panel-link-active' : ''}`}>
            <i className="bi bi-bag-check"></i> PharmacyPOS
          </Link>
          <Link to='/admin/pages/ai-insights' onClick={closeMenu}
            className={`panel-link ${location.pathname.includes('/ai-insights') ? 'panel-link-active' : ''}`}>
            <i className="bi bi-cpu"></i> Smart Hub
          </Link>
         
          <button onClick={() => { closeMenu(); handleLogout(); }} className="panel-logout-btn">
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Header;