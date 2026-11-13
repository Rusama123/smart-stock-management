import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Alert, Tabs, Tab } from 'react-bootstrap';
import axios from 'axios';
import Quagga from 'quagga';

const BarcodeScanner = ({ show, onHide, onSuccess, mode = 'add' }) => {
  // mode can be 'add' (for adding medicine) or 'sell' (for selling medicine)
  const [barcode, setBarcode] = useState('');
  const [scannedItem, setScannedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanMode, setScanMode] = useState('manual'); // 'manual' or 'camera'
  const [cameraActive, setCameraActive] = useState(false);
  const barcodeInputRef = useRef(null);
  const scannerRef = useRef(null);
  const lastScannedRef = useRef('');
  const scanDebounceRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (show && barcodeInputRef.current && scanMode === 'manual') {
      barcodeInputRef.current.focus();
    }
  }, [show, scanMode]);

  // Listen for hardware barcode scanner input (USB/Bluetooth scanner)
  useEffect(() => {
    if (!show || scanMode !== 'manual') return;

    let scannerBuffer = '';
    let scannerTimeout = null;

    const handleKeyPress = (e) => {
      // Ignore if user is typing in an input field
      if (document.activeElement !== barcodeInputRef.current) return;

      // Most barcode scanners send characters quickly followed by Enter
      if (e.key === 'Enter') {
        if (scannerBuffer.length >= 8) {
          e.preventDefault();
          setBarcode(scannerBuffer);
          searchByBarcode(scannerBuffer);
          scannerBuffer = '';
        }
      } else if (e.key.length === 1) {
        // Add character to buffer
        scannerBuffer += e.key;
        
        // Clear buffer after 100ms of inactivity (scanner sends quickly)
        clearTimeout(scannerTimeout);
        scannerTimeout = setTimeout(() => {
          scannerBuffer = '';
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(scannerTimeout);
    };
  }, [show, scanMode]);

  // Initialize camera scanner
  useEffect(() => {
    if (show && scanMode === 'camera' && scannerRef.current && !cameraActive) {
      startCameraScanner();
    }

    return () => {
      if (cameraActive) {
        stopCameraScanner();
      }
    };
  }, [show, scanMode]);

  const startCameraScanner = () => {
    setCameraActive(true);
    
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment"
        },
      },
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "code_128_reader",
          "code_39_reader",
          "upc_reader",
          "upc_e_reader"
        ]
      },
      locate: true,
      locator: {
        patchSize: "medium",
        halfSample: true
      }
    }, (err) => {
      if (err) {
        console.error('Camera initialization error:', err);
        setError('Failed to access camera. Please check permissions.');
        setCameraActive(false);
        return;
      }
      Quagga.start();
    });

    Quagga.onDetected((result) => {
      const code = result.codeResult.code;
      
      // Debounce scanning to avoid multiple rapid scans
      if (code === lastScannedRef.current) return;
      
      clearTimeout(scanDebounceRef.current);
      scanDebounceRef.current = setTimeout(() => {
        lastScannedRef.current = code;
        setBarcode(code);
        searchByBarcode(code);
        
        // Play success sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrges=');
        audio.play().catch(() => {});
        
        // Reset after 2 seconds
        setTimeout(() => {
          lastScannedRef.current = '';
        }, 2000);
      }, 500);
    });
  };

  const stopCameraScanner = () => {
    if (cameraActive) {
      Quagga.stop();
      setCameraActive(false);
    }
  };

  // Handle manual barcode input
  const handleBarcodeInput = async (e) => {
    const code = e.target.value.trim();
    setBarcode(code);
    
    // Auto-search when barcode is entered (typically 8-13 digits)
    if (code.length >= 8) {
      await searchByBarcode(code);
    }
  };

  // Search inventory by barcode
  const searchByBarcode = async (code) => {
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.get(`http://localhost:5000/api/inventory/barcode/${code}`);
      const item = res.data;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isExpired = !item.batches || item.batches.length === 0 || !item.batches.some(batch => {
        if (batch.quantity <= 0) return false;
        const expiryDate = new Date(batch.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        return expiryDate > today;
      });
      
      if (isExpired) {
        setError('This medicine has expired and cannot be sold!');
        setScannedItem(null);
      } else {
        setScannedItem(item);
        if (scanMode === 'camera') {
          stopCameraScanner();
        }
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Medicine not found with this barcode');
        setScannedItem(null);
      } else {
        setError('Error searching for medicine');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle selling medicine
  const handleSell = async () => {
    if (!scannedItem || quantity <= 0) return;

    if (quantity > scannedItem.currentStock) {
      setError(`Insufficient stock. Available: ${scannedItem.currentStock} units`);
      return;
    }

    try {
      setLoading(true);
      await axios.post('http://localhost:5000/api/sales', {
        inventoryId: scannedItem._id,
        quantity: parseInt(quantity),
        barcode: barcode
      });

      // alert(`Sale recorded: ${quantity} unit(s) of ${scannedItem.brandName}`);
      onSuccess();
      resetForm();
      onHide();
    } catch (err) {
      setError('Error recording sale');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding medicine (quick stock addition via barcode)
  const handleAddStock = async () => {
    if (!scannedItem || quantity <= 0) return;

    try {
      setLoading(true);
      // Update the first batch quantity
      const updatedBatches = [...scannedItem.batches];
      if (updatedBatches.length > 0) {
        updatedBatches[0].quantity += parseInt(quantity);
      }

      await axios.put(`http://localhost:5000/api/inventory/${scannedItem._id}`, {
        ...scannedItem,
        batches: updatedBatches,
        currentStock: scannedItem.currentStock + parseInt(quantity)
      });

      // alert(`Added ${quantity} unit(s) to ${scannedItem.brandName}`);
      onSuccess();
      resetForm();
      onHide();
    } catch (err) {
      setError('Error adding stock');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBarcode('');
    setScannedItem(null);
    setQuantity(1);
    setError('');
    lastScannedRef.current = '';
    if (cameraActive) {
      stopCameraScanner();
    }
  };

  const handleTabChange = (key) => {
    setScanMode(key);
    setError('');
    setBarcode('');
    setScannedItem(null);
    
    if (key === 'manual' && cameraActive) {
      stopCameraScanner();
    }
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {mode === 'sell' ? 'Scan to Sell Medicine' : 'Scan to Add Stock'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs
          activeKey={scanMode}
          onSelect={handleTabChange}
          className="mb-3"
        >
          <Tab eventKey="manual" title={<><i className="bi bi-keyboard"></i> Manual/USB Scanner</>}>
            <Alert variant="info" className="mb-3">
              <i className="bi bi-info-circle"></i> 
              {' '}Enter barcode manually or use a USB/Bluetooth barcode scanner
            </Alert>
            
            <Form.Group className="mb-3">
              <Form.Label>Barcode</Form.Label>
              <Form.Control
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={handleBarcodeInput}
                placeholder="Scan or enter barcode..."
                autoFocus
                style={{ fontSize: '1.2rem', padding: '12px' }}
              />
              <Form.Text className="text-muted">
                Focus this field and scan with your barcode reader, or type manually
              </Form.Text>
            </Form.Group>
          </Tab>

          <Tab eventKey="camera" title={<><i className="bi bi-camera"></i> Camera Scanner</>}>
            <Alert variant="info" className="mb-3">
              <i className="bi bi-info-circle"></i> 
              {' '}Point your camera at the barcode. Works best with good lighting.
            </Alert>
            
            <div 
              ref={scannerRef} 
              style={{ 
                width: '100%', 
                height: '400px', 
                backgroundColor: '#000',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {!cameraActive && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#fff',
                  textAlign: 'center'
                }}>
                  <i className="bi bi-camera" style={{ fontSize: '3rem' }}></i>
                  <p>Camera will start automatically</p>
                </div>
              )}
            </div>

            {barcode && (
              <Alert variant="success" className="mt-3">
                <strong>Scanned:</strong> {barcode}
              </Alert>
            )}
          </Tab>
        </Tabs>

        {loading && (
          <Alert variant="info">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Searching...
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {scannedItem && (
          <>
            <Alert variant="success">
              <h6><i className="bi bi-check-circle"></i> Medicine Found:</h6>
              <hr />
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-1"><strong>Brand:</strong> {scannedItem.brandName}</p>
                  <p className="mb-1"><strong>Generic:</strong> {scannedItem.genericName}</p>
                  <p className="mb-1"><strong>Dosage:</strong> {scannedItem.dosage}</p>
                  <p className="mb-1"><strong>Category:</strong> {scannedItem.category}</p>
                </div>
                <div className="col-md-6">
                  <p className="mb-1"><strong>Manufacturer:</strong> {scannedItem.manufacturer || 'N/A'}</p>
                  <p className="mb-1"><strong>Supplier:</strong> {scannedItem.supplier || 'N/A'}</p>
                  <p className="mb-1"><strong>Current Stock:</strong> {scannedItem.currentStock} units</p>
                  <p className="mb-1"><strong>Price:</strong> Rs {scannedItem.unitPrice?.toFixed(2)}/unit</p>
                </div>
              </div>
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Quantity</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ fontSize: '1.2rem', padding: '12px' }}
              />
            </Form.Group>

            {mode === 'sell' && (
              <Alert variant="info">
                <h5 className="mb-0">
                  <strong>Total Amount:</strong> Rs {(scannedItem.unitPrice * quantity).toFixed(2)}
                </h5>
              </Alert>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        {scannedItem && (
          <Button 
            variant={mode === 'sell' ? 'success' : 'primary'}
            onClick={mode === 'sell' ? handleSell : handleAddStock}
            disabled={loading || !scannedItem || quantity <= 0}
            size="lg"
          >
            <i className={`bi ${mode === 'sell' ? 'bi-cart-check' : 'bi-plus-circle'}`}></i>
            {' '}{mode === 'sell' ? 'Complete Sale' : 'Add Stock'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default BarcodeScanner;