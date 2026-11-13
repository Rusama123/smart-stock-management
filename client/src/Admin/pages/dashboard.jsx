import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../Style/dashboard.css';
import money from "../../assets/money.svg";
import triangle from "../../assets/triangle.svg";
import vector from "../../assets/vector.svg";
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from '../header-footer/header';
import Footers from '../header-footer/footer';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalInventoryValue: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    totalSalesValue: 0,
    recentSales: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salesFilter, setSalesFilter] = useState('daily');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      alert('⚠️ Session expired. Please login again.');
      navigate('/admin/login');
      return;
    }

    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          alert('⚠️ Session expired. Please login again.');
          navigate('/admin/login');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found');
      setError('Authentication required');
      navigate('/admin/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard`, {
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setDashboardData({
        totalInventoryValue: res.data.totalInventoryValue || 0,
        lowStockCount: res.data.lowStockCount || 0,
        expiringSoonCount: res.data.expiringSoonCount || 0,
        totalSalesValue: res.data.totalSalesValue || 0,
        recentSales: res.data.recentSales || []
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      
      let errorMsg = 'Unable to load dashboard data';
      
      if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          alert('⚠️ Session expired. Please login again.');
          navigate('/admin/login');
          return;
        }
        errorMsg = err.response.data.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMsg = 'Cannot connect to server. Please ensure the backend is running on http://localhost:5000';
      } else {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      
      setDashboardData({
        totalInventoryValue: 0,
        lowStockCount: 0,
        expiringSoonCount: 0,
        totalSalesValue: 0,
        recentSales: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'Rs: 0.00';
    }
    return `Rs: ${Number(value).toLocaleString('en-PK', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatLargeCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'Rs: 0.00';
    }
    const valNum = Number(value);
    if (valNum >= 1.0e12) {
      return `Rs: ${(valNum / 1.0e12).toFixed(2)}T`;
    }
    if (valNum >= 1.0e9) {
      return `Rs: ${(valNum / 1.0e9).toFixed(2)}B`;
    }
    if (valNum >= 1.0e6) {
      return `Rs: ${(valNum / 1.0e6).toFixed(2)}M`;
    }
    return formatCurrency(value);
  };

  const getFilteredSales = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return dashboardData.recentSales.filter(sale => {
      const saleDate = new Date(sale.date);
      
      if (salesFilter === 'daily') {
        return saleDate >= today;
      } else if (salesFilter === 'yearly') {
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return saleDate >= yearAgo;
      } else if (salesFilter === 'monthly') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return saleDate >= monthAgo;
      }
      return true;
    });
  };
  const filteredSales = getFilteredSales().filter(sale => {
    const searchLower = searchQuery.toLowerCase();
    return (
      sale.brandName?.toLowerCase().includes(searchLower) ||
      sale.genericName?.toLowerCase().includes(searchLower) ||
      sale.paymentMethod?.toLowerCase().includes(searchLower)
    );
  });

  const downloadSalesReport = () => {
    if (filteredSales.length === 0) {
      alert("No sales records to download for this period.");
      return;
    }

    const headers = ["Index", "Date", "Medicine", "Generic Name", "Quantity", "Amount (PKR)", "Payment Method"];
    const rows = filteredSales.map((sale, index) => {
      const d = new Date(sale.date);
      const day = d.getDate().toString().padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      // Prefix with apostrophe to tell Excel to treat this cell as plain text.
      // This prevents Excel from rendering narrow column overflow as '###'
      const dateStr = `'${day}-${month}-${year} ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
      
      const brand = (sale.brandName || '').replace(/"/g, '""');
      const generic = (sale.genericName || 'N/A').replace(/"/g, '""');
      return [
        index + 1,
        `"${dateStr}"`,
        `"${brand}"`,
        `"${generic}"`,
        sale.quantity,
        sale.totalAmount,
        `"${sale.paymentMethod || 'Cash'}"`
      ];
    });

    // Add total row
    const totalQty = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalVal = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    rows.push(["", "", "Total", "", totalQty, totalVal, ""]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Medix_${salesFilter}_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDFReport = () => {
    if (filteredSales.length === 0) {
      alert("No sales records to download for this period.");
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert("Please allow popups to download/print the PDF report.");
      return;
    }

    const title = `Medix Sales Report - ${salesFilter.toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString('en-PK', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const totalQty = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalVal = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    const tableRows = filteredSales.map((sale, index) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>${new Date(sale.date).toLocaleDateString('en-PK', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })}</td>
        <td><strong>${sale.brandName}</strong></td>
        <td>${sale.genericName || 'N/A'}</td>
        <td style="text-align: center;">${sale.quantity} units</td>
        <td style="text-align: right; font-weight: 600;">Rs. ${Number(sale.totalAmount).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: center;"><span style="text-transform: uppercase; font-size: 11px; padding: 2px 6px; background: #e9ecef; border-radius: 4px;">${sale.paymentMethod || 'Cash'}</span></td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              color: #333;
              margin: 40px;
              line-height: 1.5;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #005A8B;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .header-left h1 {
              margin: 0;
              color: #005A8B;
              font-size: 26px;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .header-left p {
              margin: 4px 0 0 0;
              color: #555;
              font-size: 13px;
              text-transform: uppercase;
              font-weight: 600;
            }
            .header-right {
              text-align: right;
            }
            .header-right .logo-text {
              font-size: 24px;
              font-weight: 800;
              color: #28a745;
              margin: 0;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              font-size: 13px;
              background: #f8f9fa;
              padding: 12px 18px;
              border-radius: 8px;
              border: 1px solid #e9ecef;
            }
            .meta-item {
              margin: 2px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #005A8B;
              color: white;
              text-align: left;
              padding: 10px 12px;
              font-size: 13px;
              font-weight: 600;
              border: 1px solid #dee2e6;
              text-transform: uppercase;
            }
            td {
              padding: 10px 12px;
              font-size: 13px;
              border: 1px solid #dee2e6;
            }
            tr:nth-child(even) {
              background-color: #fcfcfc;
            }
            .totals-row {
              font-weight: bold;
              background-color: #f1f5f9 !important;
              border-top: 2px solid #005A8B;
            }
            .totals-row td {
              color: #005A8B;
              font-size: 14px;
              padding: 12px;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #888;
              margin-top: 60px;
              border-top: 1px solid #e9ecef;
              padding-top: 15px;
            }
            @media print {
              body { margin: 20px; }
              @page { size: A4; margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="header-left">
              <h1>MEDIX PHARMACY</h1>
              <p>Sales Analytics & Inventory Management</p>
            </div>
            <div class="header-right">
              <p class="logo-text">MEDIX AI</p>
            </div>
          </div>
          
          <div class="meta-info">
            <div>
              <div class="meta-item"><strong>Report Period:</strong> ${salesFilter.toUpperCase()} Sales</div>
              <div class="meta-item"><strong>Total Transactions:</strong> ${filteredSales.length} records</div>
            </div>
            <div style="text-align: right;">
              <div class="meta-item"><strong>Generated On:</strong> ${dateStr}</div>
              <div class="meta-item"><strong>Status:</strong> Verified Cloud Ledger</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 20%;">Date & Time</th>
                <th style="width: 25%;">Medicine</th>
                <th style="width: 20%;">Generic Name</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 12%; text-align: right;">Amount</th>
                <th style="width: 8%; text-align: center;">Payment</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="totals-row">
                <td colspan="4" style="text-align: right;">GRAND TOTAL:</td>
                <td style="text-align: center;">${totalQty} units</td>
                <td style="text-align: right;">Rs. ${totalVal.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>This document is system-generated securely by Medix Smart AI Stock Management. All rights reserved &copy; ${new Date().getFullYear()}.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <Header />
      
      <div style={{ flex: '1' }}>
        <div className='container-d'>
          <div className="dashbord d-flex justify-content-between align-items-center">
            {/* ✅ Dashboard heading icon — bar chart is most relevant for a dashboard */}
            <h1 className='text-center h1blue'>
              <i className="bi bi-bar-chart-line-fill" style={{ marginRight: '10px', color: '#005A8B' }}></i>
              Dashboard
            </h1>
          </div>
          
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <strong>Error!</strong> {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError(null)}
                aria-label="Close"
              ></button>
              <div className="mt-2">
                <button 
                  className="btn btn-sm btn-primary" 
                  onClick={fetchDashboardData}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Retry'}
                </button>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          <div className='row mx-1 mb-1'>
            <div className='col-lg-3 col-md-6 col-6 stat-card-custom'>
              <div className='stat-card-inner'>
                <div className='flex-between-custom'>
                  <div className='stat-title-custom'>Total Inventory Value</div>
                  {/* ✅ Archive = physical stock/inventory */}
                  <div className='stat-icon-custom'>
                    <img src={money} alt="money" />
                  </div>
                </div>
                <div className='stat-value-custom' title={formatCurrency(dashboardData.totalInventoryValue)}>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    formatLargeCurrency(dashboardData.totalInventoryValue)
                  )}
                </div>
              </div>
            </div>

            <div className='col-lg-3 col-md-6 col-6 stat-card-custom'>
              <div className='stat-card-inner'>
                <div className='flex-between-custom'>
                  <div className='stat-title-custom'>Low Stock Items</div>
                  <div className='stat-icon-custom'>
                    <img src={triangle} alt="warning" />
                  </div>
                </div>
                <div className='stat-value-custom'>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    `${dashboardData.lowStockCount} Items`
                  )}
                </div>
              </div>
            </div>

            <div className='col-lg-3 col-md-6 col-6 stat-card-custom'>
              <div className='stat-card-inner'>
                <div className='flex-between-custom'>
                  <div className='stat-title-custom'>Expiring Soon</div>
                  <div className='stat-icon-custom'>
                    <img src={vector} alt="alert" />
                  </div>
                </div>
                <div className='stat-value-custom'>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    `${dashboardData.expiringSoonCount} Items`
                  )}
                </div>
              </div>
            </div>

            <div className='col-lg-3 col-md-6 col-6 stat-card-custom'>
              <div className='stat-card-inner'>
                <div className='flex-between-custom'>
                  <div className='stat-title-custom'>Total Sales Value</div>
                  <div className='stat-icon-custom'>
                    <img src={money} alt="money" />
                  </div>
                </div>
                <div className='stat-value-custom' title={formatCurrency(dashboardData.totalSalesValue)}>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    formatLargeCurrency(dashboardData.totalSalesValue)
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sales Activity */}
        <div className='admin-management-section'>
          <div className='admin-management-header'>
            <h2 className='admin-management-title'>
              {/* ✅ Receipt = sales transactions, more specific than generic graph */}
              <i className="bi bi-receipt-cutoff" style={{marginRight: '10px'}}></i>
              Recent Sales Activity
            </h2>
          </div>

          {/* Filter Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={() => setSalesFilter('daily')}
              style={{
                padding: '10px 24px',
                background: salesFilter === 'daily' ? '#005A8B' : '#ffffff',
                color: salesFilter === 'daily' ? '#ffffff' : '#005A8B',
                border: '2px solid #005A8B',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
            >
              {/* ✅ Sun = today/daily — intuitive */}
              <i className="bi bi-sun" style={{marginRight: '6px'}}></i>
              Daily
            </button>
             <button 
              onClick={() => setSalesFilter('monthly')}
              style={{
                padding: '10px 24px',
                background: salesFilter === 'monthly' ? '#005A8B' : '#ffffff',
                color: salesFilter === 'monthly' ? '#ffffff' : '#005A8B',
                border: '2px solid #005A8B',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
            >
              {/* ✅ Calendar month = monthly period */}
              <i className="bi bi-calendar3" style={{marginRight: '6px'}}></i>
              Monthly
            </button>
            <button 
              onClick={() => setSalesFilter('yearly')}
              style={{
                padding: '10px 24px',
                background: salesFilter === 'yearly' ? '#005A8B' : '#ffffff',
                color: salesFilter === 'yearly' ? '#ffffff' : '#005A8B',
                border: '2px solid #005A8B',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
            >
              {/* ✅ Calendar year = yearly period */}
              <i className="bi bi-calendar-check" style={{marginRight: '6px'}}></i>
              Yearly
            </button>
            
            <button 
              onClick={downloadSalesReport}
              style={{
                padding: '10px 24px',
                background: '#28a745',
                color: '#ffffff',
                border: '2px solid #28a745',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
              title="Download current filtered sales as Excel/CSV"
            >
              <i className="bi bi-file-earmark-spreadsheet" style={{marginRight: '6px'}}></i>
              Download Report
            </button>
          </div>

          {/* Search Bar */}
          <div className='admin-search-bar'>
            <div className='search-input-wrapper'>
              <i className="bi bi-search search-icon"></i>
              <input
                type="text"
                className='admin-search-input'
                placeholder="Search by medicine name, generic name, or payment method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <i 
                  className="bi bi-x-circle search-clear-icon" 
                  onClick={() => setSearchQuery('')}
                  style={{cursor: 'pointer'}}
                ></i>
              )}
            </div>
          </div>

          {loading ? (
            <div className='admin-loading'>
              <div className='admin-loading-spinner'></div>
              <p className='admin-loading-text'>Loading sales data...</p>
            </div>
          ) : filteredSales && filteredSales.length > 0 ? (
            <div className='admin-table-container'>
              <table className='admin-table'>
                <thead>
                  <tr>
                    <th>#</th>
                    {/* ✅ calendar-event = date/timestamp */}
                    <th><i className="bi bi-calendar-event" style={{marginRight: '5px'}}></i>Date</th>
                    {/* ✅ capsule = medicine/drug — pharmacy specific */}
                    <th><i className="bi bi-capsule" style={{marginRight: '5px'}}></i>Medicine</th>
                    {/* ✅ file-medical = generic/scientific name */}
                    <th><i className="bi bi-file-medical" style={{marginRight: '5px'}}></i>Generic Name</th>
                    {/* ✅ boxes = quantity of stock units */}
                    <th><i className="bi bi-boxes" style={{marginRight: '5px'}}></i>Quantity</th>
                    {/* ✅ currency-rupee = Rs. amount, Pakistan-specific */}
                    <th><i className="bi bi-currency-rupee" style={{marginRight: '5px'}}></i>Amount</th>
                    {/* ✅ pos = point of sale / payment method */}
                    <th><i className="bi bi-credit-card-2-front" style={{marginRight: '5px'}}></i>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale, index) => (
                    <tr key={index}>
                      <td className='admin-table-index'>{index + 1}</td>
                      <td>{new Date(sale.date).toLocaleDateString('en-PK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</td>
                      <td className='admin-table-name'>{sale.brandName}</td>
                      <td>{sale.genericName || 'N/A'}</td>
                      <td>
                        <span className="admin-badge badge-verified">
                          {/* ✅ boxes = physical units of medicine stock */}
                          <i className="bi bi-boxes" style={{marginRight: '4px'}}></i>
                          {sale.quantity} units
                        </span>
                      </td>
                      <td>
                        <span className="subscription-status sub-active" style={{fontSize: '13px', fontWeight: 'bold'}}>
                          {formatCurrency(sale.totalAmount)}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${
                          sale.paymentMethod === 'Cash' ? 'badge-enabled' : 
                          sale.paymentMethod === 'Card' ? 'badge-verified' : 
                          'badge-unverified'
                        }`}>
                          {/* ✅ cash = banknotes | card = chip card | wallet = digital payment */}
                          <i className={`bi ${
                            sale.paymentMethod === 'Cash' ? 'bi-banknote' : 
                            sale.paymentMethod === 'Card' ? 'bi-credit-card-2-front' : 
                            'bi-wallet2'
                          }`} style={{marginRight: '4px'}}></i>
                          {sale.paymentMethod || 'Cash'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{backgroundColor: '#f8f9fa', fontWeight: 'bold', borderTop: '2px solid #005A8B'}}>
                    <td colSpan="4" style={{textAlign: 'right', padding: '14px 12px', color: '#005A8B', fontSize: '14px'}}>
                      {/* ✅ calculator-fill = totals/sum calculation */}
                      <i className="bi bi-calculator-fill" style={{marginRight: '8px'}}></i>
                      Total:
                    </td>
                    <td style={{padding: '14px 12px'}}>
                      <span className="admin-badge badge-verified" style={{fontSize: '12px'}}>
                        {filteredSales.reduce((sum, sale) => sum + sale.quantity, 0)} units
                      </span>
                    </td>
                    <td colSpan="2" style={{padding: '14px 12px'}}>
                      <span className="subscription-status sub-active" style={{fontSize: '14px', fontWeight: 'bold'}}>
                        {formatCurrency(filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0))}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className='admin-empty-state'>
              <div className='admin-empty-icon'>
                {/* ✅ receipt = no sales/empty transactions state */}
                <i className="bi bi-receipt"></i>
              </div>
              <h5 className='admin-empty-title'>
                {searchQuery 
                  ? 'No sales found' 
                  : `No ${salesFilter} sales yet`
                }
              </h5>
              <p className='admin-empty-text'>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : `Sales for the ${salesFilter} period will appear here`
                }
              </p>
            </div>
          )}
        </div>
      </div>
      <Footers/>
    </>
  );
};

export default Dashboard;