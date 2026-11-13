import React, { useState, useRef } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import axiosInstance from '../../utils/axiosConfig';
import { getDiscountedSalePrice } from '../../utils/discountSafety';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../Style/pos.css';
import Header from '../header-footer/header';
import Footer from '../header-footer/footer';
import BarcodeScanner from './BarcodeScanner';

const PharmacyPOS = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const searchTimeoutRef = useRef(null);

  // AI Substitute State
  const [substituteModal, setSubstituteModal] = useState(false);
  const [substituteList, setSubstituteList] = useState([]);
  const [originalDrugName, setOriginalDrugName] = useState('');
  const [originalGenericName, setOriginalGenericName] = useState('');
  const [loadingSubstitutes, setLoadingSubstitutes] = useState(false);

  const searchMedicines = async (query) => {
    if (!query.trim()) { setSearchResults([]); return; }
    try {
      const res = await axiosInstance.get(`/api/inventory?search=${query}&limit=10`);
      const inventory = res.data.inventory || [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const salableInventory = inventory.filter(item => {
        if (!item.batches || item.batches.length === 0) return true;
        return item.batches.some(batch => {
          const expiryDate = new Date(batch.expiryDate);
          expiryDate.setHours(0, 0, 0, 0);
          return expiryDate > today;
        });
      });
      
      setSearchResults(salableInventory);
      
      // Auto-add to cart on exact barcode match (from hardware barcode scanner)
      if (salableInventory.length === 1 && salableInventory[0].barcode && salableInventory[0].barcode === query.trim()) {
        addToCart(salableInventory[0]);
        setSearchQuery('');
        setSearchResults([]);
        // Play success beep sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrges=');
        audio.play().catch(() => {});
      }
    } catch (error) {
      console.error('Error searching medicines:', error);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchMedicines(query), 300);
  };

  const handleFindSubstitute = async (genericName, brandName) => {
    setOriginalDrugName(brandName);
    setOriginalGenericName(genericName);
    setLoadingSubstitutes(true);
    setSubstituteModal(true);
    try {
      const res = await axiosInstance.get(`/api/inventory?search=${encodeURIComponent(genericName)}&limit=10`);
      const items = res.data.inventory || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filter: same generic, not same brand, must be in stock and unexpired
      const filtered = items.filter(item => {
        if (item.brandName.toLowerCase() === brandName.toLowerCase()) return false;
        if (item.currentStock <= 0) return false;
        if (!item.batches || item.batches.length === 0) return false;
        return item.batches.some(batch => {
          if (batch.quantity <= 0) return false;
          const expiryDate = new Date(batch.expiryDate);
          expiryDate.setHours(0, 0, 0, 0);
          return expiryDate > today;
        });
      });
      setSubstituteList(filtered);
    } catch (err) {
      console.error('Error finding substitutes:', err);
      alert('Error fetching substitutes');
    } finally {
      setLoadingSubstitutes(false);
    }
  };

  const addToCart = (item) => {
    if (!item.currentStock || item.currentStock <= 0) {
      handleFindSubstitute(item.genericName, item.brandName);
      return;
    }
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    const salePrice = getDiscountedSalePrice(item.unitPrice, item.discount || 0, item.unitCost);
    if (existingItem) {
      if (existingItem.quantity >= item.currentStock) {
        alert(`⚠️ Cannot add more. Only ${item.currentStock} units available in stock.`);
        return;
      }
      updateQuantity(item._id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { ...item, quantity: 1, originalPrice: item.unitPrice, unitPrice: salePrice }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (itemId, newQuantity) => {
    const item = cart.find(i => i._id === itemId);
    if (newQuantity > item.currentStock) {
      alert(`⚠️ Cannot exceed available stock: ${item.currentStock} units`);
      return;
    }
    if (newQuantity <= 0) { removeFromCart(itemId); return; }
    setCart(cart.map(i => i._id === itemId ? { ...i, quantity: newQuantity } : i));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  // ✅ No tax — total = subtotal only
  const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  // ✅ Print Receipt — Medix branding, no tax
  const printReceipt = (salesData) => {
    const receiptWindow = window.open('', '_blank');
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medix Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 300px; margin: 20px auto; padding: 10px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
          .header h2 { margin: 5px 0; font-size: 20px; letter-spacing: 2px; }
          .header p { margin: 3px 0; font-size: 11px; }
          .info { margin-bottom: 15px; font-size: 12px; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
          .item-name { flex: 1; }
          .item-qty { width: 40px; text-align: center; }
          .item-price { width: 80px; text-align: right; }
          .totals { margin-top: 10px; font-size: 12px; }
          .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .total-row.grand-total { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 5px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
          @media print { body { margin: 0; padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>MEDIX</h2>
          <p>Pharmacy Management System</p>
          <p>Sales Receipt</p>
        </div>

        <div class="info">
          <div style="margin: 3px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</div>
          <div style="margin: 3px 0;"><strong>Customer:</strong> ${salesData.customerName || 'Walk-in'}</div>
          <div style="margin: 3px 0;"><strong>Payment:</strong> ${salesData.paymentMethod}</div>
        </div>

        <div class="items">
          <div class="item" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px;">
            <div class="item-name">Item</div>
            <div class="item-qty">Qty</div>
            <div class="item-price">Amount</div>
          </div>
          ${cart.map(item => `
            <div class="item">
              <div class="item-name">${item.brandName}</div>
              <div class="item-qty">${item.quantity}</div>
              <div class="item-price">Rs ${(item.unitPrice * item.quantity).toFixed(2)}</div>
            </div>
            <div style="font-size: 10px; color: #666; margin-left: 5px;">${item.genericName || ''}</div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>Rs ${total.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 5px 0; font-weight: bold;">Thank you for choosing Medix!</p>
          <p style="margin: 5px 0; font-size: 10px;">This is a computer generated receipt</p>
        </div>

        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 100); }
        </script>
      </body>
      </html>
    `;
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const validateCartStock = async () => {
    const validationErrors = [];
    for (const cartItem of cart) {
      try {
        const res = await axiosInstance.get(`/api/inventory/${cartItem._id}`);
        const currentItem = res.data;
        if (currentItem.currentStock < cartItem.quantity) {
          validationErrors.push({ name: cartItem.brandName, requestedQty: cartItem.quantity, availableQty: currentItem.currentStock });
        }
      } catch (error) {
        validationErrors.push({ name: cartItem.brandName, error: 'Item not found or deleted' });
      }
    }
    return validationErrors;
  };

  const completeSale = async () => {
    if (cart.length === 0) { alert('Please add items to cart'); return; }
    setLoading(true);
    try {
      const validationErrors = await validateCartStock();
      if (validationErrors.length > 0) {
        let errorMessage = '⚠️ Stock Validation Failed:\n\n';
        validationErrors.forEach(error => {
          errorMessage += error.error
            ? `• ${error.name}: ${error.error}\n`
            : `• ${error.name}: Requested ${error.requestedQty} but only ${error.availableQty} available\n`;
        });
        errorMessage += '\nPlease update quantities before proceeding.';
        alert(errorMessage);
        const updatedCart = await Promise.all(
          cart.map(async (item) => {
            try {
              const res = await axiosInstance.get(`/api/inventory/${item._id}`);
              return { ...item, currentStock: res.data.currentStock };
            } catch { return item; }
          })
        );
        setCart(updatedCart);
        setLoading(false);
        return;
      }

      const salesData = { customerName: customerName || 'Walk-in Customer', paymentMethod, items: cart };
      const successfulSales = [];
      const failedSales = [];

      for (const item of cart) {
        try {
          const response = await axiosInstance.post('/api/sales', {
            inventoryId: item._id,
            brandName: item.brandName,
            genericName: item.genericName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            customerName: customerName || 'Walk-in Customer',
            paymentMethod,
          });
          successfulSales.push({ name: item.brandName, quantity: item.quantity, newStock: response.data.sale.newStock });
        } catch (itemError) {
          failedSales.push({ name: item.brandName, quantity: item.quantity, error: itemError.response?.data?.message || itemError.message });
        }
      }

      if (successfulSales.length > 0) {
        printReceipt(salesData);
        let message = `✅ Successfully sold ${successfulSales.length} item(s):\n\n`;
        successfulSales.forEach(sale => { message += `• ${sale.name} (Qty: ${sale.quantity})\n`; });
        if (failedSales.length > 0) {
          message += `\n⚠️ Failed to sell ${failedSales.length} item(s):\n`;
          failedSales.forEach(fail => { message += `• ${fail.name}: ${fail.error}\n`; });
        }
        // alert(message);
        setCart(cart.filter(item => !successfulSales.find(sale => sale.name === item.brandName)));
        if (failedSales.length === 0) { setCustomerName(''); setPaymentMethod('Cash'); }
      } else {
        alert('❌ Sale failed for all items:\n\n' + failedSales.map(f => `• ${f.name}: ${f.error}`).join('\n'));
      }
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      alert('❌ Error completing sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className='pos-page-wrapper'>
        <div className='container-d'>
          <div className="pos-header-section">
            <h1 className='h1blue'>
              <i className="bi bi-cart3"></i> Point of Sale (POS)
            </h1>
            <div className='pos-action-buttons-wrapper'>
              <button className='pos-action-btn btn-clear' onClick={() => setCart([])} disabled={cart.length === 0}>
                <i className="bi bi-trash"></i> Clear Cart
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className='pos-search-section'>
          <div className='admin-search-bar'>
            <div className='search-input-wrapper'>
              <i className="bi bi-search search-icon"></i>
              <input
                type="text"
                className='admin-search-input'
                placeholder="Search by Brand Name or Generic Name..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <i className="bi bi-x-circle search-clear-icon" onClick={() => { setSearchQuery(''); setSearchResults([]); }}></i>
              )}
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className='pos-search-results'>
              {searchResults.map((item) => {
                const isOutOfStock = !item.currentStock || item.currentStock <= 0;
                const hasDiscount = item.discount > 0;
                const finalPrice = hasDiscount ? item.unitPrice * (1 - item.discount / 100) : item.unitPrice;
                return (
                  <div 
                    key={item._id} 
                    className={`pos-search-item ${isOutOfStock ? 'out-of-stock-item' : ''}`} 
                    onClick={() => !isOutOfStock && addToCart(item)}
                    style={{ cursor: isOutOfStock ? 'default' : 'pointer' }}
                  >
                    <div className='search-item-info'>
                      <div className='search-item-name d-flex justify-content-between align-items-center'>
                        <div>
                          <strong>{item.brandName}</strong>
                          <span className='search-item-generic'>{item.genericName}</span>
                        </div>
                        {hasDiscount && (
                          <span className="badge bg-success text-white">
                            AI {item.discount}% Off
                          </span>
                        )}
                      </div>
                      <div className='search-item-details d-flex justify-content-between align-items-center mt-1'>
                        <div>
                          <span className='search-item-dosage me-2'>{item.dosage}</span>
                          <span className={`search-item-stock ${isOutOfStock ? 'out-of-stock text-danger fw-bold' : item.currentStock <= 10 ? 'low-stock text-warning' : 'text-success'}`}>
                            Stock: {item.currentStock}
                          </span>
                        </div>
                        <div className="search-item-pricing text-end">
                          {hasDiscount ? (
                            <>
                              <span className="text-decoration-line-through text-muted small me-2">Rs {item.unitPrice?.toFixed(2)}</span>
                              <span className="search-item-price fw-bold text-primary">Rs {finalPrice?.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className='search-item-price'>Rs {item.unitPrice?.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      
                      {isOutOfStock && (
                        <div className="d-flex justify-content-end mt-2 pt-2 border-top">
                          <button 
                            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                            onClick={(e) => { e.stopPropagation(); handleFindSubstitute(item.genericName, item.brandName); }}
                          >
                            <i className="bi bi-cpu"></i> Suggest AI Substitute
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main POS */}
        <div className='pos-main-section'>
          <div className='pos-cart-section'>
            <div className='pos-section-card'>
              <div className='pos-section-header'>
                <h3><i className="bi bi-cart3"></i> Shopping Cart</h3>
                <span className='cart-item-count'>{cart.length} item(s)</span>
              </div>

              {cart.length === 0 ? (
                <div className='pos-empty-cart'>
                  <div className='empty-cart-icon'><i className="bi bi-cart-x"></i></div>
                  <h4>Cart is Empty</h4>
                  <p>Search and add medicines to start selling</p>
                </div>
              ) : (
                <div className='pos-cart-items'>
                  <div className='cart-items-table'>
                    <div className='cart-table-header'>
                      <div className='cart-col-product'>Product</div>
                      <div className='cart-col-price'>Price</div>
                      <div className='cart-col-quantity'>Quantity</div>
                      <div className='cart-col-subtotal'>Subtotal</div>
                      <div className='cart-col-action'>Action</div>
                    </div>
                    {cart.map((item) => (
                      <div key={item._id} className='cart-table-row'>
                        <div className='cart-col-product'>
                          <div className='cart-product-info'>
                            <strong>{item.brandName}</strong>
                            <small className='text-muted'>{item.genericName}</small>
                            <small className={`cart-stock-info ${item.currentStock < item.quantity ? 'text-danger' : 'text-muted'}`}>
                              Available: {item.currentStock} units
                              {item.currentStock < item.quantity && ' ⚠️ Insufficient!'}
                            </small>
                          </div>
                        </div>
                         <div className='cart-col-price'>
                          {item.discount > 0 ? (
                            <div className="d-flex flex-column align-items-end">
                              <span className="text-decoration-line-through text-muted small" style={{ fontSize: '11px' }}>Rs {item.originalPrice?.toFixed(2)}</span>
                              <span className="text-success fw-bold">Rs {item.unitPrice?.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span>Rs {item.unitPrice?.toFixed(2)}</span>
                          )}
                        </div>
                        <div className='cart-col-quantity'>
                          <div className='quantity-control'>
                            <button className='qty-btn qty-minus' onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                              <i className="bi bi-dash"></i>
                            </button>
                            <input
                              type="number"
                              className='qty-input'
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item._id, parseInt(e.target.value) || 0)}
                              min="1"
                              max={item.currentStock}
                            />
                            <button className='qty-btn qty-plus' onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                              <i className="bi bi-plus"></i>
                            </button>
                          </div>
                        </div>
                        <div className='cart-col-subtotal'>
                          <strong className='text-primary'>Rs {(item.unitPrice * item.quantity).toFixed(2)}</strong>
                        </div>
                        <div className='cart-col-action'>
                          <button className='cart-remove-btn' onClick={() => removeFromCart(item._id)} title='Remove from cart'>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checkout */}
          <div className='pos-checkout-section'>
            <div className='pos-section-card'>
              <div className='pos-section-header'>
                <h3><i className="bi bi-credit-card"></i> Checkout</h3>
              </div>

              <div className='checkout-form'>
                <div className='form-group'>
                  <label className='form-label'><i className="bi bi-person"></i> Customer Name (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                  />
                </div>
                <div className='form-group'>
                  <label className='form-label'><i className="bi bi-wallet2"></i> Payment Method</label>
                  <select className='form-control' value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile">Mobile Payment</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              {/* ✅ No tax row */}
              <div className='checkout-summary'>
                <div className='summary-row summary-total'>
                  <span>Total:</span>
                  <span className='summary-value-total'>Rs {total.toFixed(2)}</span>
                </div>
              </div>

              <button className='checkout-btn' onClick={completeSale} disabled={cart.length === 0 || loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</>
                ) : (
                  <><i className="bi bi-check-circle"></i> Complete Sale & Print</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>


      <Modal show={substituteModal} onHide={() => setSubstituteModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-cpu me-2"></i> AI Alternative Substitute Finder
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <strong>Original Medicine:</strong> <span className="text-danger fw-bold">{originalDrugName}</span>
            <div className="text-muted small">Generic Active Ingredient: <strong>{originalGenericName}</strong></div>
          </div>
          
          {loadingSubstitutes ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Searching database for matching generic substitutes...</p>
            </div>
          ) : substituteList.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Alternative Drug</th>
                    <th>Dosage</th>
                    <th>Available Stock</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {substituteList.map(item => {
                    const finalPrice = item.discount > 0 ? item.unitPrice * (1 - item.discount / 100) : item.unitPrice;
                    return (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.brandName}</strong>
                          <div className="text-muted small">{item.category}</div>
                        </td>
                        <td>{item.dosage}</td>
                        <td className="text-success fw-bold">{item.currentStock} units</td>
                        <td>
                          {item.discount > 0 ? (
                            <>
                              <span className="text-decoration-line-through text-muted small me-2">Rs {item.unitPrice.toFixed(2)}</span>
                              <strong>Rs {finalPrice.toFixed(2)}</strong>
                            </>
                          ) : (
                            <strong>Rs {item.unitPrice.toFixed(2)}</strong>
                          )}
                        </td>
                        <td>
                          {item.discount > 0 ? (
                            <span className="badge bg-success">AI {item.discount}% Off</span>
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                            onClick={() => {
                              addToCart(item);
                              setSubstituteModal(false);
                            }}
                          >
                            <i className="bi bi-cart-plus"></i> Select & Add
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert variant="warning" className="d-flex align-items-center gap-2 mb-0">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <div>
                No in-stock generic alternatives containing <strong>{originalGenericName}</strong> were found in your inventory database.
              </div>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSubstituteModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Footer />
    </>
  );
};

export default PharmacyPOS;