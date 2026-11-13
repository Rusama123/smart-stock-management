import express from 'express';
import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Inventory from '../models/Inventory.js';
import { getDiscountedSalePrice, getMinSellingPrice } from '../utils/discountSafety.js';

const router = express.Router();

// Get all sales for logged-in user
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId: req.userId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1 })
      .lean();

    res.json({
      sales,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ message: 'Error fetching sales', error: err.message });
  }
});

// Get single sale
router.get('/sales/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({ 
      _id: req.params.id,
      userId: req.userId 
    });
    
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json(sale);
  } catch (err) {
    console.error('Error fetching sale:', err);
    res.status(500).json({ message: 'Error fetching sale', error: err.message });
  }
});

// Add new sale — supports full pack OR partial/loose quantity (e.g. 5 tablets from a strip of 10)
router.post('/sales', async (req, res) => {
  try {
    const {
      inventoryId, 
      brandName,
      genericName,
      quantity,          // can be any positive number, e.g. 5 loose tablets
      unitPrice,
      batchNumber,
      customerName,
      customerPhone,
      paymentMethod,
      discount,
    } = req.body;

    // --- Validation ---
    if (!inventoryId) {
      return res.status(400).json({ 
        message: 'Inventory item is required',
        error: 'Please select an inventory item' 
      });
    }

    const parsedQty = Number(quantity);
    if (!quantity || isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ 
        message: 'Valid quantity is required',
        error: 'Quantity must be greater than 0' 
      });
    }

    // Quantity must be a whole number (you can't sell 1.5 tablets as inventory units)
    if (!Number.isInteger(parsedQty)) {
      return res.status(400).json({
        message: 'Invalid quantity',
        error: 'Quantity must be a whole number'
      });
    }

    // --- Check inventory ---
    const inventoryItem = await Inventory.findOne({ 
      _id: inventoryId,
      userId: req.userId 
    });

    if (!inventoryItem) {
      return res.status(404).json({ 
        message: 'Inventory item not found',
        error: 'Could not find the selected inventory item' 
      });
    }

    if (inventoryItem.currentStock < parsedQty) {
      return res.status(400).json({ 
        message: 'Insufficient stock',
        error: `Only ${inventoryItem.currentStock} units available in stock` 
      });
    }

    // --- Calculate totals (server-authoritative safety) ---
    // Never trust client unitPrice for safety-critical pricing.
    // If a client sends an invalid/unsafe price, fallback to the safe discounted
    // price derived from inventory retail + stored discount + min-profit floor.
    const safeDiscountedUnitPrice = getDiscountedSalePrice(
      inventoryItem.unitPrice,
      inventoryItem.discount || 0,
      inventoryItem.unitCost
    );
    const minAllowedUnitPrice = getMinSellingPrice(inventoryItem.unitCost);
    const requestedUnitPrice = Number(unitPrice);
    const hasValidRequestedUnitPrice = Number.isFinite(requestedUnitPrice) && requestedUnitPrice > 0;
    const pricePerUnit = hasValidRequestedUnitPrice
      ? Math.max(minAllowedUnitPrice, requestedUnitPrice)
      : safeDiscountedUnitPrice;

    const totalAmount = parsedQty * pricePerUnit;
    const discountAmt = Math.max(0, Number(discount) || 0);
    const finalAmount = Math.max(0, totalAmount - discountAmt);

    if (finalAmount <= 0) {
      return res.status(400).json({
        message: 'Invalid sale total',
        error: 'Final amount must be greater than 0 after discount',
      });
    }

    // --- Create sale record ---
    const newSale = new Sale({
      userId: req.userId,
      inventoryId,
      brandName:     brandName     || inventoryItem.brandName,
      genericName:   genericName   || inventoryItem.genericName,
      quantity:      parsedQty,
      unitPrice:     pricePerUnit,
      totalAmount:   finalAmount,
      batchNumber:   batchNumber   || '',
      customerName:  customerName  || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      paymentMethod: paymentMethod || 'Cash',
      discount:      discountAmt,
      date: new Date()
    });

    await newSale.save();

    // --- Deduct stock ---
    // If a specific batch was chosen, deduct from that batch first
    if (batchNumber) {
      const batch = inventoryItem.batches.find(b => b.batchNumber === batchNumber);
      if (batch) {
        batch.quantity = Math.max(0, batch.quantity - parsedQty);
      }
    } else {
      // Deduct from batches in FIFO order (earliest expiry first) for loose sales
      let remaining = parsedQty;
      const sortedBatches = inventoryItem.batches
        .slice()
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

      for (const batch of sortedBatches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        // find in original array and update
        const orig = inventoryItem.batches.find(b => b.batchNumber === batch.batchNumber);
        if (orig) orig.quantity -= deduct;
        remaining -= deduct;
      }
    }

    inventoryItem.currentStock -= parsedQty;
    await inventoryItem.save();

    // Return newStock so the POS frontend can update the cart display
    res.status(201).json({ 
      message: 'Sale recorded successfully!', 
      sale: {
        ...newSale.toObject(),
        newStock: inventoryItem.currentStock   // ← key field the POS frontend uses
      }
    });

  } catch (err) {
    console.error('Error recording sale:', err);
    res.status(500).json({ 
      message: 'Error recording sale', 
      error: err.message 
    });
  }
});

// Delete sale — restores stock
router.delete('/sales/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({ 
      _id: req.params.id,
      userId: req.userId 
    });

    if (!sale) {
      return res.status(404).json({ 
        message: 'Sale not found',
        error: 'Could not find the sale record' 
      });
    }

    // Restore inventory stock
    const inventoryItem = await Inventory.findById(sale.inventoryId);
    if (inventoryItem) {
      inventoryItem.currentStock += sale.quantity;
      
      if (sale.batchNumber) {
        const batch = inventoryItem.batches.find(b => b.batchNumber === sale.batchNumber);
        if (batch) {
          batch.quantity += sale.quantity;
        }
      }
      
      await inventoryItem.save();
    }

    await Sale.deleteOne({ _id: req.params.id });

    res.json({ message: 'Sale deleted and stock restored successfully!' });

  } catch (err) {
    console.error('Error deleting sale:', err);
    res.status(500).json({ 
      message: 'Error deleting sale', 
      error: err.message 
    });
  }
});

// Get sales statistics
router.get('/sales-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchQuery = { userId: new mongoose.Types.ObjectId(req.userId) };
    
    if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
          totalQuantitySold: { $sum: '$quantity' },
          averageTransactionValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const topSellingItems = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$brandName',
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      summary: stats[0] || {
        totalSales: 0,
        totalTransactions: 0,
        totalQuantitySold: 0,
        averageTransactionValue: 0
      },
      topSellingItems
    });

  } catch (err) {
    console.error('Error fetching sales stats:', err);
    res.status(500).json({ 
      message: 'Error fetching sales statistics', 
      error: err.message 
    });
  }
});

export default router;