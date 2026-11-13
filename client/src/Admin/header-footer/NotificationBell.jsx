import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosConfig';
import 'bootstrap-icons/font/bootstrap-icons.css';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toasts, setToasts] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load notifications from API
  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get('/api/notifications');
      const data = res.data || [];
      
      // Filter out dismissed notifications
      const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]');
      const activeNotifications = data.filter(item => !dismissed.includes(item.id));
      
      setNotifications(activeNotifications);
      triggerToasts(activeNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Toast notifications trigger logic
  const triggerToasts = (activeNotifications) => {
    const toastedIds = JSON.parse(sessionStorage.getItem('toastedNotificationIds') || '[]');
    const newToasts = [];
    const updatedToastedIds = [...toastedIds];

    // Show toast for up to 3 of the most critical notifications that haven't been toasted in this session
    activeNotifications.slice(0, 3).forEach(item => {
      if (!toastedIds.includes(item.id)) {
        newToasts.push(item);
        updatedToastedIds.push(item.id);
      }
    });

    if (newToasts.length > 0) {
      sessionStorage.setItem('toastedNotificationIds', JSON.stringify(updatedToastedIds));
      
      // Add new toasts with a unique instance ID and timestamp
      const toastInstances = newToasts.map(item => ({
        ...item,
        instanceId: `${item.id}-${Date.now()}`
      }));

      setToasts(prev => [...prev, ...toastInstances]);

      // Setup auto-dismiss for each toast after 6 seconds
      toastInstances.forEach(instance => {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.instanceId !== instance.instanceId));
        }, 6000);
      });
    }
  };

  // Dismiss a single notification
  const handleDismiss = (id, e) => {
    if (e) e.stopPropagation();
    const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]');
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem('dismissedNotifications', JSON.stringify(dismissed));
    }
    setNotifications(prev => prev.filter(item => item.id !== id));
  };

  // Mark all notifications as read/dismissed
  const handleMarkAllRead = (e) => {
    if (e) e.stopPropagation();
    const dismissed = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]');
    notifications.forEach(item => {
      if (!dismissed.includes(item.id)) {
        dismissed.push(item.id);
      }
    });
    localStorage.setItem('dismissedNotifications', JSON.stringify(dismissed));
    setNotifications([]);
    setShowDropdown(false);
  };

  // Navigate to target and close dropdown
  const handleNotificationClick = (link, id) => {
    handleDismiss(id);
    setShowDropdown(false);
    navigate(link);
  };

  // Fetch on mount and set polling every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'danger':
        return <i className="bi bi-exclamation-octagon-fill text-danger me-2"></i>;
      case 'warning':
        return <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>;
      default:
        return <i className="bi bi-info-circle-fill text-primary me-2"></i>;
    }
  };

  const getSeverityClass = (severity) => {
    return `notif-item severity-${severity}`;
  };

  return (
    <>
      <div className="header-notif-wrapper" ref={dropdownRef}>
        <button 
          className="notif-bell-btn" 
          onClick={() => setShowDropdown(!showDropdown)}
          title="Notifications"
        >
          <i className="bi bi-bell-fill"></i>
          {notifications.length > 0 && (
            <span className="notif-badge-count">
              {notifications.length}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="notif-dropdown">
            <div className="notif-dropdown-header">
              <span className="notif-dropdown-title">
                Notifications ({notifications.length})
              </span>
              {notifications.length > 0 && (
                <button className="notif-clear-btn" onClick={handleMarkAllRead}>
                  Mark all as read
                </button>
              )}
            </div>

            <div className="notif-dropdown-divider"></div>

            <div className="notif-list-container">
              {notifications.length > 0 ? (
                notifications.map(item => (
                  <div 
                    key={item.id} 
                    className={getSeverityClass(item.severity)}
                    onClick={() => handleNotificationClick(item.link, item.id)}
                  >
                    <div className="notif-item-header">
                      <div className="notif-item-title-wrapper">
                        {getSeverityIcon(item.severity)}
                        <span className="notif-item-title">{item.title}</span>
                      </div>
                      <button 
                        className="notif-item-close" 
                        onClick={(e) => handleDismiss(item.id, e)}
                        title="Dismiss"
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                    <div className="notif-item-msg">{item.message}</div>
                  </div>
                ))
              ) : (
                <div className="notif-empty-state">
                  <i className="bi bi-bell-slash text-muted mb-2"></i>
                  <span>No new notifications</span>
                </div>
              )}
            </div>

            <div className="notif-dropdown-divider"></div>
            <div className="notif-dropdown-footer">
              <button 
                className="notif-footer-link" 
                onClick={() => { setShowDropdown(false); navigate('/admin/pages/alerts'); }}
              >
                View All Alerts & Suggestions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating corner toasts */}
      <div className="notification-toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.instanceId} 
            className={`notification-toast toast-${toast.severity}`}
            onClick={() => {
              setToasts(prev => prev.filter(t => t.instanceId !== toast.instanceId));
              navigate(toast.link);
            }}
          >
            <div className="toast-header-custom">
              <div className="toast-title-wrapper">
                {getSeverityIcon(toast.severity)}
                <strong>{toast.title}</strong>
              </div>
              <button 
                className="toast-close-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.instanceId !== toast.instanceId));
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="toast-body-custom">
              {toast.message}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationBell;
