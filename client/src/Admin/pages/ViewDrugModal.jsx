import React from 'react';
import { Modal, Button, Table } from 'react-bootstrap';

const ViewDrugModal = ({ show, onHide, item }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Drug Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Basic Information</h5>
        <Table bordered>
          <tbody>
            <tr>
              <td><strong>Brand Name</strong></td>
              <td>{item.brandName}</td>
            </tr>
            <tr>
              <td><strong>Generic Name</strong></td>
              <td>{item.genericName}</td>
            </tr>
            <tr>
              <td><strong>Barcode</strong></td>
              <td>{item.barcode || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Dosage</strong></td>
              <td>{item.dosage}</td>
            </tr>
            <tr>
              <td><strong>Manufacturer</strong></td>
              <td>{item.manufacturer || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Supplier</strong></td>
              <td>{item.supplier || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Category</strong></td>
              <td>{item.category}</td>
            </tr>
            <tr>
              <td><strong>Current Stock</strong></td>
              <td>{item.currentStock} units</td>
            </tr>
            <tr>
              <td><strong>Unit Cost</strong></td>
              <td>Rs: {item.unitCost ? item.unitCost.toFixed(2) : '0.00'}</td>
            </tr>
            <tr>
              <td><strong>Retail Price</strong></td>
              <td>Rs: {item.unitPrice ? item.unitPrice.toFixed(2) : '0.00'}</td>
            </tr>
            {/* <tr>
              <td><strong>Box Price</strong></td>
              <td>Rs: {item.boxPrice ? item.boxPrice.toFixed(2) : '0.00'}</td>
            </tr> */}
            {/* <tr>
              <td><strong>Units Per Box</strong></td>
              <td>{item.unitsPerBox || 'N/A'}</td>
            </tr> */}
          </tbody>
        </Table>

        <h5 className="mt-4">Batch Details</h5>
        <Table bordered striped>
          <thead>
            <tr>
              <th>Batch Number</th>
              <th>Quantity</th>
              <th>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {item.batches && item.batches.length > 0 ? (
              item.batches.map((batch, index) => (
                <tr key={index}>
                  <td>{batch.batchNumber}</td>
                  <td>{batch.quantity} units</td>
                  <td>{new Date(batch.expiryDate).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="text-center">No batch information available</td>
              </tr>
            )}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ViewDrugModal;