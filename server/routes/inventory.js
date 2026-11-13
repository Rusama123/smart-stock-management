import express from 'express';
import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Supplier from '../models/Supplier.js';
import Manufacturer from '../models/Manufacturer.js';
import Sale from '../models/Sale.js';
import User from '../models/User.js';
import {
  buildSafeDiscountSuggestion,
  capDiscountPercent,
  getDiscountedSalePrice,
  getMinSellingPrice,
} from '../utils/discountSafety.js';
import {
  buildDemandForecast,
  groupSalesByInventory,
} from '../utils/demandForecast.js';
import {
  requestGeminiJson,
  parseForecastAdvisory,
  parseDiscountAdvisory,
  hasGeminiKey,
  buildForecastAdvisoryFallback,
  buildDiscountAdvisoryFallback,
  containsNonEnglishNarrative,
} from '../services/geminiService.js';
import { getPakistanWeatherContext, hasOpenWeatherKey } from '../services/weatherService.js';
import {
  buildWeatherStockAlerts,
  buildWeatherAlertNarrative,
  HORIZON_DAYS,
} from '../utils/weatherDemand.js';

const router = express.Router();
const DEFAULT_WEATHER_CITY = 'Lahore';

// ============================================
// MANUFACTURER ROUTES (USER-SPECIFIC)
// ============================================

// Get all manufacturers for logged-in user
router.get('/manufacturers', async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find({ userId: req.userId }).sort({ name: 1 });
    res.json(manufacturers);
  } catch (err) {
    console.error('Error fetching manufacturers:', err);
    res.status(500).json({ message: 'Error fetching manufacturers', error: err.message });
  }
});

// Add new manufacturer
router.post('/manufacturers', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        message: 'Manufacturer name is required',
        error: 'Please provide a manufacturer name' 
      });
    }

    const existingManufacturer = await Manufacturer.findOne({ 
      userId: req.userId,
      name: name.trim()
    });

    if (existingManufacturer) {
      return res.status(400).json({ 
        message: 'Manufacturer already exists',
        error: `${name} is already in your manufacturers list` 
      });
    }

    const newManufacturer = new Manufacturer({
      name: name.trim(),
      userId: req.userId
    });

    await newManufacturer.save();
    res.json({ message: 'Manufacturer added successfully!', manufacturer: newManufacturer });
  } catch (err) {
    console.error('Error adding manufacturer:', err);
    res.status(500).json({ message: 'Error adding manufacturer', error: err.message });
  }
});

// ============================================
// INVENTORY ROUTES (USER-SPECIFIC)
// ============================================

// Get all inventory items for logged-in user
router.get('/inventory', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId: req.userId };
    
    if (search) {
      query.$or = [
        { brandName: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'All Categories') {
      query.category = category;
    }

    const total = await Inventory.countDocuments(query);
    const inventory = await Inventory.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      inventory,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ message: 'Error fetching inventory', error: err.message });
  }
});

// Get inventory by barcode (user-specific)
router.get('/inventory/barcode/:barcode', async (req, res) => {
  try {
    const item = await Inventory.findOne({ 
      barcode: req.params.barcode,
      userId: req.userId 
    });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error fetching item by barcode:', err);
    res.status(500).json({ message: 'Error fetching item', error: err.message });
  }
});

// Get single inventory item (user-specific)
router.get('/inventory/:id', async (req, res) => {
  try {
    const item = await Inventory.findOne({ 
      _id: req.params.id,
      userId: req.userId 
    });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).json({ message: 'Error fetching item', error: err.message });
  }
});

// Add new inventory item
router.post('/inventory', async (req, res) => {
  try {
    console.log('Received inventory data:', req.body);
    console.log('User ID:', req.userId);

    const { 
      brandName, 
      genericName, 
      dosage, 
      category, 
      manufacturer,
      supplier,
      barcode,
      unitPrice, 
      unitCost,
      boxPrice,
      unitsPerBox,
      batches 
    } = req.body;

    // Validation
    if (!brandName || !brandName.trim()) {
      return res.status(400).json({ 
        message: 'Brand name is required',
        error: 'Please provide a brand name' 
      });
    }

    if (!genericName || !genericName.trim()) {
      return res.status(400).json({ 
        message: 'Generic name is required',
        error: 'Please provide a generic name' 
      });
    }

    if (!dosage || !dosage.trim()) {
      return res.status(400).json({ 
        message: 'Dosage is required',
        error: 'Please provide dosage information' 
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({ 
        message: 'Category is required',
        error: 'Please provide a category' 
      });
    }



    if (!unitPrice || isNaN(unitPrice) || parseFloat(unitPrice) <= 0) {
      return res.status(400).json({ 
        message: 'Valid retail price is required',
        error: 'Retail price must be greater than 0' 
      });
    }

    if (!unitCost || isNaN(unitCost) || parseFloat(unitCost) <= 0) {
      return res.status(400).json({ 
        message: 'Valid unit cost is required',
        error: 'Unit cost must be greater than 0' 
      });
    }

    // Box price and units per box are now OPTIONAL
    // No validation needed if not provided

    if (!batches || !Array.isArray(batches) || batches.length === 0) {
      return res.status(400).json({ 
        message: 'At least one batch is required',
        error: 'Please add batch information' 
      });
    }

    // Validate each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      if (!batch.batchNumber || !batch.batchNumber.trim()) {
        return res.status(400).json({ 
          message: `Batch ${i + 1} number is required`,
          error: `Please provide batch number for batch ${i + 1}` 
        });
      }

      if (!batch.quantity || isNaN(batch.quantity) || parseInt(batch.quantity) <= 0) {
        return res.status(400).json({ 
          message: `Batch ${i + 1} quantity is invalid`,
          error: `Quantity for batch ${i + 1} must be greater than 0` 
        });
      }

      if (!batch.expiryDate) {
        return res.status(400).json({ 
          message: `Batch ${i + 1} expiry date is required`,
          error: `Please provide expiry date for batch ${i + 1}` 
        });
      }
    }

    // Check for duplicate barcode (if provided)
    if (barcode && barcode.trim()) {
      const existingItem = await Inventory.findOne({ 
        userId: req.userId, 
        barcode: barcode.trim() 
      });
      
      if (existingItem) {
        return res.status(400).json({ 
          message: 'Barcode already exists',
          error: `An item with barcode "${barcode}" already exists in your inventory` 
        });
      }
    }

    // Check for duplicate brandName and genericName (case-insensitive)
    if (brandName && genericName) {
      const existingNameItem = await Inventory.findOne({
        userId: req.userId,
        brandName: { $regex: new RegExp(`^${brandName.trim()}$`, 'i') },
        genericName: { $regex: new RegExp(`^${genericName.trim()}$`, 'i') }
      });

      if (existingNameItem) {
        return res.status(400).json({
          message: 'Medicine already exists',
          error: `A medicine with brand name "${brandName.trim()}" and generic name "${genericName.trim()}" already exists in your inventory`
        });
      }
    }

    // Calculate current stock
    const currentStock = batches.reduce((sum, batch) => {
      return sum + (parseInt(batch.quantity) || 0);
    }, 0);

    // Create inventory data object
    const inventoryData = {
      userId: req.userId,
      brandName: brandName.trim(),
      genericName: genericName.trim(),
      dosage: dosage.trim(),
      category: category.trim(),
      manufacturer: manufacturer ? manufacturer.trim() : '',
      supplier: supplier ? supplier.trim() : '',
      barcode: barcode && barcode.trim() ? barcode.trim() : undefined,
      currentStock,
      unitPrice: parseFloat(unitPrice),
      unitCost: parseFloat(unitCost),
      batches: batches.map(batch => ({
        batchNumber: batch.batchNumber.trim(),
        quantity: parseInt(batch.quantity),
        expiryDate: new Date(batch.expiryDate)
      }))
    };

    // Add box price and units per box only if provided
    if (boxPrice && !isNaN(boxPrice) && parseFloat(boxPrice) > 0) {
      inventoryData.boxPrice = parseFloat(boxPrice);
    }

    if (unitsPerBox && !isNaN(unitsPerBox) && parseInt(unitsPerBox) > 0) {
      inventoryData.unitsPerBox = parseInt(unitsPerBox);
    }

    const newItem = new Inventory(inventoryData);

    console.log('Saving new item:', newItem);
    await newItem.save();
    
    console.log('Item saved successfully:', newItem._id);
    res.status(201).json({ 
      message: 'Inventory item added successfully!', 
      item: newItem 
    });

  } catch (err) {
    console.error('Error adding inventory:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        error: messages.join(', ') 
      });
    }
    
    if (err.code === 11000) {
      let field = 'field';
      if (err.keyPattern && err.keyPattern.barcode) {
        field = 'barcode';
      }
      return res.status(400).json({ 
        message: 'Duplicate entry', 
        error: `An item with this ${field} already exists in your inventory` 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid data format', 
        error: `Invalid ${err.path}: ${err.value}` 
      });
    }
    
    res.status(500).json({ 
      message: 'Error adding inventory', 
      error: err.message 
    });
  }
});

// Update inventory item (user-specific)
router.put('/inventory/:id', async (req, res) => {
  try {
    console.log('Updating inventory:', req.params.id);
    console.log('Update data:', req.body);

    const { 
      brandName, 
      genericName, 
      dosage, 
      category, 
      manufacturer,
      supplier,
      barcode,
      unitPrice, 
      unitCost,
      boxPrice,
      unitsPerBox,
      batches 
    } = req.body;

    if (!brandName || !brandName.trim()) {
      return res.status(400).json({ 
        message: 'Brand name is required',
        error: 'Please provide a brand name' 
      });
    }

    if (!batches || !Array.isArray(batches) || batches.length === 0) {
      return res.status(400).json({ 
        message: 'At least one batch is required',
        error: 'Please add batch information' 
      });
    }

    if (barcode && barcode.trim()) {
      const existingItem = await Inventory.findOne({ 
        userId: req.userId, 
        barcode: barcode.trim(),
        _id: { $ne: req.params.id }
      });
      
      if (existingItem) {
        return res.status(400).json({ 
          message: 'Barcode already exists',
          error: `Another item with barcode "${barcode}" already exists` 
        });
      }
    }

    // Check for duplicate brandName and genericName (case-insensitive, excluding this item itself)
    if (brandName && genericName) {
      const existingNameItem = await Inventory.findOne({
        userId: req.userId,
        brandName: { $regex: new RegExp(`^${brandName.trim()}$`, 'i') },
        genericName: { $regex: new RegExp(`^${genericName.trim()}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingNameItem) {
        return res.status(400).json({
          message: 'Medicine already exists',
          error: `Another medicine with brand name "${brandName.trim()}" and generic name "${genericName.trim()}" already exists in your inventory`
        });
      }
    }

    const currentStock = batches.reduce((sum, batch) => {
      return sum + (parseInt(batch.quantity) || 0);
    }, 0);

    const updateData = {
      brandName: brandName.trim(),
      genericName: genericName.trim(),
      dosage: dosage.trim(),
      category: category.trim(),
      manufacturer: manufacturer ? manufacturer.trim() : '',
      supplier: supplier ? supplier.trim() : '',
      barcode: barcode && barcode.trim() ? barcode.trim() : undefined,
      currentStock,
      unitPrice: parseFloat(unitPrice),
      unitCost: parseFloat(unitCost),
      batches: batches.map(batch => ({
        batchNumber: batch.batchNumber.trim(),
        quantity: parseInt(batch.quantity),
        expiryDate: new Date(batch.expiryDate)
      }))
    };

    // Add box fields only if provided
    if (boxPrice && !isNaN(boxPrice) && parseFloat(boxPrice) > 0) {
      updateData.boxPrice = parseFloat(boxPrice);
    }

    if (unitsPerBox && !isNaN(unitsPerBox) && parseInt(unitsPerBox) > 0) {
      updateData.unitsPerBox = parseInt(unitsPerBox);
    }

    const updatedItem = await Inventory.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ 
        message: 'Item not found or unauthorized',
        error: 'Could not find the inventory item or you do not have permission to update it' 
      });
    }

    console.log('Item updated successfully:', updatedItem._id);
    res.json({ message: 'Inventory updated successfully!', item: updatedItem });

  } catch (err) {
    console.error('Error updating inventory:', err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        error: messages.join(', ') 
      });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate entry', 
        error: 'An item with this barcode already exists' 
      });
    }
    
    res.status(500).json({ 
      message: 'Error updating inventory', 
      error: err.message 
    });
  }
});

// Delete inventory item (user-specific)
router.delete('/inventory/:id', async (req, res) => {
  try {
    console.log('Deleting inventory:', req.params.id);

    const deletedItem = await Inventory.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.userId 
    });
    
    if (!deletedItem) {
      return res.status(404).json({ 
        message: 'Item not found or unauthorized',
        error: 'Could not find the inventory item or you do not have permission to delete it' 
      });
    }

    console.log('Item deleted successfully:', deletedItem._id);
    res.json({ message: 'Inventory item deleted successfully!' });

  } catch (err) {
    console.error('Error deleting inventory:', err);
    res.status(500).json({ 
      message: 'Error deleting inventory', 
      error: err.message 
    });
  }
});

// Get all categories for logged-in user
router.get('/categories', async (req, res) => {
  try {
    const categories = await Inventory.distinct('category', { userId: req.userId });
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories', error: err.message });
  }
});

// ============================================
// ALERTS ROUTE (USER-SPECIFIC)
// ============================================

router.get('/alerts', async (req, res) => {
  try {
    const allItems = await Inventory.find({ userId: req.userId });
    
    const expiringItems = [];
    const reorderItems = [];
    const today = new Date();

    allItems.forEach(item => {
      if (item.currentStock <= 10) {
        reorderItems.push({
          brandName: item.brandName,
          genericName: item.genericName,
          currentStock: item.currentStock,
          category: item.category,
          _id: item._id
        });
      }

      if (item.batches && item.batches.length > 0) {
        item.batches.forEach(batch => {
          const expiryDate = new Date(batch.expiryDate);
          const diffTime = expiryDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 15) {
            expiringItems.push({
              brandName: item.brandName,
              genericName: item.genericName,
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate,
              daysRemaining: diffDays,
              itemId: item._id,
              category: item.category,
              dosage: item.dosage,
              unitPrice: item.unitPrice,
              allBatches: item.batches
            });
          }
        });
      }
    });

    expiringItems.sort((a, b) => a.daysRemaining - b.daysRemaining);
    reorderItems.sort((a, b) => a.currentStock - b.currentStock);

    res.json({
      expiringItems,
      reorderItems,
      summary: {
        totalExpiring: expiringItems.length,
        totalReorder: reorderItems.length,
        criticalExpiry: expiringItems.filter(item => item.daysRemaining <= 3).length,
        outOfStock: reorderItems.filter(item => item.currentStock === 0).length
      }
    });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ message: 'Error fetching alerts', error: err.message });
  }
});

// ============================================
// NOTIFICATIONS ROUTE (USER-SPECIFIC)
// ============================================
router.get('/notifications', async (req, res) => {
  try {
    const allItems = await Inventory.find({ userId: req.userId });
    const notifications = [];
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    // ── Admin Subscription Expiration Warnings (30 days, 7 days, 3 days, 1 day, expired) ──────────
    const currentUser = await User.findById(req.userId);
    if (currentUser && currentUser.role === 'admin' && currentUser.subscriptionEndDate) {
      const subEndDateMidnight = new Date(currentUser.subscriptionEndDate);
      subEndDateMidnight.setHours(0, 0, 0, 0);

      const diffTime = subEndDateMidnight.getTime() - todayMidnight.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const expiryStr = subEndDateMidnight.toLocaleDateString("en-PK", {
        day: "numeric", month: "long", year: "numeric",
      });

      if (diffDays <= 0) {
        notifications.push({
          id: `sub-expired-${currentUser._id}`,
          type: 'sub-expired',
          severity: 'danger',
          title: 'Subscription Expired',
          message: `Your subscription expired on ${expiryStr}. Renew now to keep access.`,
          date: new Date(),
          link: '/pricing',
          brandName: 'Subscription'
        });
      } else if (diffDays <= 1) {
        notifications.push({
          id: `sub-1day-${currentUser._id}`,
          type: 'sub-1day',
          severity: 'danger',
          title: '⚠️ Subscription Expires Tomorrow!',
          message: `Your subscription expires on ${expiryStr} — only 1 day left! Renew now.`,
          date: new Date(),
          link: '/pricing',
          brandName: 'Subscription'
        });
      } else if (diffDays <= 3) {
        notifications.push({
          id: `sub-3days-${currentUser._id}`,
          type: 'sub-3days',
          severity: 'danger',
          title: '⚠️ Subscription Expiring in 3 Days',
          message: `Your subscription expires on ${expiryStr}. ${diffDays} days remaining — renew soon.`,
          date: new Date(),
          link: '/pricing',
          brandName: 'Subscription'
        });
      } else if (diffDays <= 7) {
        notifications.push({
          id: `sub-7days-${currentUser._id}`,
          type: 'sub-7days',
          severity: 'warning',
          title: 'Subscription Expiring in 1 Week',
          message: `Your subscription expires on ${expiryStr}. ${diffDays} days remaining. Renew to avoid interruption.`,
          date: new Date(),
          link: '/pricing',
          brandName: 'Subscription'
        });
      } else if (diffDays <= 30) {
        notifications.push({
          id: `sub-30days-${currentUser._id}`,
          type: 'sub-30days',
          severity: 'info',
          title: 'Subscription Expiring in 1 Month',
          message: `Your subscription expires on ${expiryStr}. ${diffDays} days remaining. Consider renewing early.`,
          date: new Date(),
          link: '/pricing',
          brandName: 'Subscription'
        });
      }
    }

    console.log(`[DEBUG] /notifications: Found ${allItems.length} items for userId ${req.userId}`);
    allItems.forEach(item => {
      const brandName = item.brandName || "Unknown Medicine";

      // 1. Low stock warning (1 to 5 units remaining) and Out of stock (0 units remaining)
      if (item.currentStock >= 1 && item.currentStock <= 5) {
        notifications.push({
          id: `low-stock-${item._id}-${item.currentStock}`,
          type: 'low-stock',
          severity: 'warning',
          title: 'Low Stock Warning',
          message: `Stock is ending: "${brandName}" has only ${item.currentStock} units left!`,
          date: item.updatedAt || new Date(),
          link: '/admin/pages/inventory',
          brandName: brandName
        });
      } else if (item.currentStock === 0) {
        notifications.push({
          id: `out-of-stock-${item._id}`,
          type: 'out-of-stock',
          severity: 'danger',
          title: 'Out of Stock Alert',
          message: `"${brandName}" is out of stock!`,
          date: item.updatedAt || new Date(),
          link: '/admin/pages/inventory',
          brandName: brandName
        });
      }

      // 2. Expiry warnings (3 days before, 1 day before, already expired)
      if (item.batches && item.batches.length > 0) {
        console.log(`[DEBUG] /notifications: Item "${brandName}" has ${item.batches.length} batches.`);
        item.batches.forEach(batch => {
          if (!batch || batch.quantity <= 0 || !batch.expiryDate) {
            console.log(`[DEBUG] /notifications: Skipping batch because qty: ${batch?.quantity}, expiryDate: ${batch?.expiryDate}`);
            return; // skip if invalid or quantity is 0
          }
          
          const expiryMidnight = new Date(batch.expiryDate);
          if (isNaN(expiryMidnight.getTime())) return; // skip invalid date inputs
          
          expiryMidnight.setHours(0, 0, 0, 0);

          const diffTime = expiryMidnight.getTime() - todayMidnight.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          const batchNumber = batch.batchNumber || "Unknown Batch";

          if (diffDays <= 0) {
            notifications.push({
              id: `expired-${item._id}-${batchNumber}-${expiryMidnight.getTime()}`,
              type: 'expired',
              severity: 'danger',
              title: 'Medicine Expired',
              message: `"${brandName}" (Batch: ${batchNumber}) has EXPIRED!`,
              date: new Date(),
              link: '/admin/pages/alerts',
              brandName: brandName,
              batchNumber: batchNumber
            });
          } else if (diffDays === 1) {
            notifications.push({
              id: `expiry-1d-${item._id}-${batchNumber}-${expiryMidnight.getTime()}`,
              type: 'expiry-1d',
              severity: 'danger',
              title: 'Expiring Tomorrow',
              message: `"${brandName}" (Batch: ${batchNumber}) is expiring tomorrow!`,
              date: new Date(),
              link: '/admin/pages/alerts',
              brandName: brandName,
              batchNumber: batchNumber
            });
          } else if (diffDays <= 3) {
            notifications.push({
              id: `expiry-3d-${item._id}-${batchNumber}-${expiryMidnight.getTime()}`,
              type: 'expiry-3d',
              severity: 'danger',
              title: 'Expiring within 3 Days',
              message: `"${brandName}" (Batch: ${batchNumber}) is expiring in ${diffDays} days!`,
              date: new Date(),
              link: '/admin/pages/alerts',
              brandName: brandName,
              batchNumber: batchNumber
            });
          } else if (diffDays <= 7) {
            notifications.push({
              id: `expiry-7d-${item._id}-${batchNumber}-${expiryMidnight.getTime()}`,
              type: 'expiry-7d',
              severity: 'warning',
              title: 'Expiring within 7 Days',
              message: `"${brandName}" (Batch: ${batchNumber}) is expiring in ${diffDays} days!`,
              date: new Date(),
              link: '/admin/pages/alerts',
              brandName: brandName,
              batchNumber: batchNumber
            });
          }
        });
      }
    });

    // Sort by severity (danger first, then warning)
    const severityOrder = { danger: 1, warning: 2, info: 3 };
    notifications.sort((a, b) => {
      return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
    });

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Error fetching notifications', error: err.message });
  }
});

// ============================================
// DASHBOARD ROUTE (USER-SPECIFIC)
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    console.log('Fetching dashboard for user:', req.userId);
    
    const allItems = await Inventory.find({ userId: req.userId });
    
    const totalInventoryValue = allItems.reduce((sum, item) => {
      return sum + ((item.currentStock || 0) * (item.unitPrice || 0));
    }, 0);

    const lowStockCount = allItems.filter(item => item.currentStock <= 10).length;

    let expiringSoonCount = 0;
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    allItems.forEach(item => {
      if (item.batches && item.batches.length > 0) {
        item.batches.forEach(batch => {
          const expiryDate = new Date(batch.expiryDate);
          if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
            expiringSoonCount++;
          }
        });
      }
    });

    let totalSalesValue = 0;
    let recentSales = [];

    try {
      const salesAgg = await Sale.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(req.userId) 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$totalAmount' } 
          } 
        }
      ]);
      
      totalSalesValue = salesAgg.length > 0 ? salesAgg[0].total : 0;
      
      recentSales = await Sale.find({ userId: req.userId })
        .sort({ date: -1 })
        .limit(10)
        .lean();
      
    } catch (salesErr) {
      console.error('Error fetching sales data:', salesErr);
      totalSalesValue = 0;
      recentSales = [];
    }

    res.json({
      totalInventoryValue: totalInventoryValue || 0,
      lowStockCount: lowStockCount || 0,
      expiringSoonCount: expiringSoonCount || 0,
      totalSalesValue: totalSalesValue || 0,
      recentSales: recentSales || []
    });
    
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ 
      message: 'Error fetching dashboard data', 
      error: err.message
    });
  }
});

// ============================================
// SUPPLIER ROUTES (USER-SPECIFIC)
// ============================================

router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    res.status(500).json({ message: 'Error fetching suppliers', error: err.message });
  }
});

router.get('/suppliers/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ 
      _id: req.params.id,
      userId: req.userId 
    });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (err) {
    console.error('Error fetching supplier:', err);
    res.status(500).json({ message: 'Error fetching supplier', error: err.message });
  }
});

router.post('/suppliers', async (req, res) => {
  try {
    const { name, phone, city } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ 
        message: 'Supplier name is required',
        error: 'Please provide a supplier name' 
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ 
        message: 'Phone is required',
        error: 'Please provide a phone number' 
      });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({ 
        message: 'City is required',
        error: 'Please provide a city' 
      });
    }

    const existingSupplier = await Supplier.findOne({ 
      userId: req.userId,
      name: name.trim()
    });

    if (existingSupplier) {
      return res.status(400).json({ 
        message: 'Supplier already exists',
        error: `${name} is already in your suppliers list` 
      });
    }

    const newSupplier = new Supplier({
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      userId: req.userId
    });

    await newSupplier.save();
    console.log('Supplier saved:', newSupplier);
    res.json({ message: 'Supplier added successfully!', supplier: newSupplier });
  } catch (err) {
    console.error('Error adding supplier:', err);
    res.status(500).json({ message: 'Error adding supplier', error: err.message });
  }
});

router.put('/suppliers/:id', async (req, res) => {
  try {
    const updatedSupplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedSupplier) {
      return res.status(404).json({ 
        message: 'Supplier not found or unauthorized',
        error: 'Could not find the supplier or you do not have permission to update it' 
      });
    }
    res.json({ message: 'Supplier updated successfully!', supplier: updatedSupplier });
  } catch (err) {
    console.error('Error updating supplier:', err);
    res.status(500).json({ message: 'Error updating supplier', error: err.message });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    const deletedSupplier = await Supplier.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.userId 
    });
    if (!deletedSupplier) {
      return res.status(404).json({ 
        message: 'Supplier not found or unauthorized',
        error: 'Could not find the supplier or you do not have permission to delete it' 
      });
    }
    res.json({ message: 'Supplier deleted successfully!' });
  } catch (err) {
    console.error('Error deleting supplier:', err);
    res.status(500).json({ message: 'Error deleting supplier', error: err.message });
  }
});

// ============================================
// AI INSIGHTS & SMART PROMOTIONS (USER-SPECIFIC)
// ============================================

router.get('/ai/insights', async (req, res) => {
  try {
    const userId = req.userId;
    const allItems = await Inventory.find({ userId }).lean();

    // Fetch 120 days of sales for statistical forecasting
    const historyStart = new Date();
    historyStart.setDate(historyStart.getDate() - 120);

    const salesLogs = await Sale.find({
      userId,
      date: { $gte: historyStart },
    }).lean();

    const salesByInventory = groupSalesByInventory(salesLogs);

    // Generate demand forecasts using deterministic WMA + seasonality + trend
    const demandForecasts = allItems.map((item) => {
      const itemSales = salesByInventory[item._id.toString()] || [];
      const forecast = buildDemandForecast(item, itemSales);
      const smartLowStockThreshold = Math.max(8, Math.ceil((forecast.forecastedDailyDemand || 0) * 14));
      const stockVsThresholdRatio = smartLowStockThreshold > 0
        ? parseFloat(((item.currentStock || 0) / smartLowStockThreshold).toFixed(2))
        : 0;
      const belowSmartThreshold = (item.currentStock || 0) <= smartLowStockThreshold;

      return {
        _id: item._id,
        brandName: item.brandName,
        genericName: item.genericName,
        currentStock: item.currentStock,
        category: item.category,
        smartLowStockThreshold,
        belowSmartThreshold,
        stockVsThresholdRatio,
        ...forecast,
      };
    });

    // Sort demand forecasts: critical items first (predicted to run out soonest)
    demandForecasts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // 3. Generate Expiry-Based Smart Discounts + sell-through projection
    const today = new Date();
    const discountSuggestions = [];

    allItems.forEach(item => {
      if (item.batches && item.batches.length > 0) {
        item.batches.forEach(batch => {
          if (batch.quantity > 0) {
            const expiryDate = new Date(batch.expiryDate);
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Suggest discounts for batches expiring within 45 days
            if (diffDays <= 45 && diffDays > 0) {
              let idealDiscount = 10;
              let riskLevel = 'Low';

              if (diffDays <= 10) {
                idealDiscount = 35;
                riskLevel = 'Critical';
              } else if (diffDays <= 20) {
                idealDiscount = 25;
                riskLevel = 'High';
              } else if (diffDays <= 30) {
                idealDiscount = 15;
                riskLevel = 'Medium';
              }

              const safeSuggestion = buildSafeDiscountSuggestion({
                idealDiscount,
                unitPrice: item.unitPrice,
                unitCost: item.unitCost,
                currentDiscount: item.discount || 0,
              });

              if (safeSuggestion) {
                const perItemForecast = demandForecasts.find(
                  (f) => f._id.toString() === item._id.toString()
                );
                const dailyDemand = Math.max(0, Number(perItemForecast?.forecastedDailyDemand || perItemForecast?.salesVelocity || 0));
                const projectedSellThroughDays = dailyDemand > 0
                  ? parseFloat((batch.quantity / dailyDemand).toFixed(1))
                  : 999;
                const likelySellBeforeExpiry = projectedSellThroughDays <= diffDays;
                const projectedUnsoldQtyAtExpiry = dailyDemand > 0
                  ? Math.max(0, Math.ceil(batch.quantity - (dailyDemand * diffDays)))
                  : batch.quantity;

                discountSuggestions.push({
                  _id: item._id,
                  brandName: item.brandName,
                  genericName: item.genericName,
                  batchNumber: batch.batchNumber,
                  quantity: batch.quantity,
                  expiryDate: batch.expiryDate,
                  daysRemaining: diffDays,
                  currentPrice: item.unitPrice,
                  unitCost: item.unitCost,
                  currentDiscount: item.discount || 0,
                  idealDiscount: safeSuggestion.idealDiscount,
                  suggestedDiscount: safeSuggestion.suggestedDiscount,
                  maxSafeDiscount: safeSuggestion.maxSafeDiscount,
                  minSellingPrice: safeSuggestion.minSellingPrice,
                  discountedPrice: safeSuggestion.discountedPrice,
                  safetyNote: safeSuggestion.safetyNote,
                  wasCapped: safeSuggestion.wasCapped,
                  riskLevel,
                  projectedSellThroughDays,
                  likelySellBeforeExpiry,
                  projectedUnsoldQtyAtExpiry,
                });
              }
            }
          }
        });
      }
    });

    // Also check for Slow-Moving stock: high stock but zero sales in last 30 days
    allItems.forEach(item => {
      const itemSeries = salesByInventory[item._id.toString()] || [];
      const totalSold = itemSeries.reduce((sum, s) => sum + (s.quantity || 0), 0);
      if (totalSold === 0 && item.currentStock > 40) {
        // Only suggest if not already suggested for expiry
        const alreadySuggested = discountSuggestions.some(s => s._id.toString() === item._id.toString());
        if (!alreadySuggested) {
          const safeSuggestion = buildSafeDiscountSuggestion({
            idealDiscount: 15,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            currentDiscount: item.discount || 0,
          });

          if (safeSuggestion) {
            discountSuggestions.push({
              _id: item._id,
              brandName: item.brandName,
              genericName: item.genericName,
              batchNumber: 'ALL BATCHES',
              quantity: item.currentStock,
              daysRemaining: 999,
              currentPrice: item.unitPrice,
              unitCost: item.unitCost,
              currentDiscount: item.discount || 0,
              idealDiscount: safeSuggestion.idealDiscount,
              suggestedDiscount: safeSuggestion.suggestedDiscount,
              maxSafeDiscount: safeSuggestion.maxSafeDiscount,
              minSellingPrice: safeSuggestion.minSellingPrice,
              discountedPrice: safeSuggestion.discountedPrice,
              safetyNote: safeSuggestion.safetyNote,
              wasCapped: safeSuggestion.wasCapped,
              riskLevel: 'Slow Moving',
              projectedSellThroughDays: 999,
              likelySellBeforeExpiry: false,
              projectedUnsoldQtyAtExpiry: item.currentStock,
            });
          }
        }
      }
    });

    discountSuggestions.sort((a, b) => {
      // Sort Critical/High risk first
      const riskOrder = { Critical: 1, High: 2, Medium: 3, 'Slow Moving': 4, Low: 5 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });

    // 4. Calculate Top Selling Medicines
    const topSellersAgg = await Sale.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$brandName', totalSold: { $sum: '$quantity' }, totalRevenue: { $sum: '$totalAmount' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    const topSelling = topSellersAgg.map(item => ({
      brandName: item._id,
      totalSold: item.totalSold,
      totalRevenue: item.totalRevenue
    }));

    const GEMINI_ENRICH_LIMIT = 15;

    const formulaDemandForecasts = demandForecasts.map((item) => ({
      ...item,
      aiNarrative: buildForecastAdvisoryFallback(item),
      aiSuggestedReorder: item.suggestedReorderQty || 0,
      aiAvailable: false,
      aiStatus: 'fallback',
      aiSource: 'fallback',
    }));

    const geminiDemandTargets = formulaDemandForecasts.slice(0, GEMINI_ENRICH_LIMIT);
    const geminiDemandResults = await Promise.all(
      geminiDemandTargets.map(async (item) => {
        const fallback = {
          item,
          aiNarrative: buildForecastAdvisoryFallback(item),
          aiSuggestedReorder: item.suggestedReorderQty || 0,
          aiAvailable: false,
          aiStatus: 'fallback',
          aiSource: 'fallback',
        };

        const aiRaw = await requestGeminiJson({
          task: 'Explain next-month demand and reorder recommendation in professional English only. Return JSON with aiNarrative (string) and aiSuggestedReorder (number). Do not use Urdu or Roman Urdu.',
          context: {
            medicine: `${item.brandName} (${item.genericName})`,
            category: item.category,
            currentStock: item.currentStock,
            forecastedDailyDemand: item.forecastedDailyDemand,
            forecastedWeeklyDemand: item.forecastedWeeklyDemand,
            forecasted30DayDemand: item.forecasted30DayDemand,
            suggestedReorderQty: item.suggestedReorderQty,
            trend: item.trend,
            seasonalityNotes: item.seasonalityNotes,
            daysRemaining: item.daysRemaining,
            needsReorder: item.needsReorder,
            confidence: item.confidence,
          },
          fallback,
        });

        const advisory = parseForecastAdvisory(aiRaw, fallback);
        const aiSuggestedReorderSafe = Math.max(
          0,
          Math.min(
            Math.round(advisory.aiSuggestedReorder || 0),
            Math.max(0, Math.round((item.forecasted30DayDemand || 0) * 2))
          )
        );

        return {
          ...item,
          aiNarrative: advisory.aiNarrative,
          aiSuggestedReorder: aiSuggestedReorderSafe,
          aiAvailable: advisory.aiAvailable,
          aiStatus: advisory.aiStatus,
          aiSource: advisory.aiSource,
        };
      })
    );

    const geminiDemandMap = new Map(geminiDemandResults.map((item) => [item._id.toString(), item]));
    const enrichedDemandForecasts = formulaDemandForecasts.map(
      (item) => geminiDemandMap.get(item._id.toString()) || item
    );

    const formulaDiscountSuggestions = discountSuggestions.map((item) => ({
      ...item,
      aiSuggestedDiscountReason: buildDiscountAdvisoryFallback(item),
      aiSuggestedDiscount: item.suggestedDiscount,
      aiAvailable: false,
      aiStatus: 'fallback',
      aiSource: 'fallback',
    }));

    const geminiDiscountTargets = formulaDiscountSuggestions.slice(0, GEMINI_ENRICH_LIMIT);
    const geminiDiscountResults = await Promise.all(
      geminiDiscountTargets.map(async (item) => {
        const fallback = {
          item,
          aiSuggestedDiscountReason: buildDiscountAdvisoryFallback(item),
          aiSuggestedDiscount: item.suggestedDiscount,
          aiAvailable: false,
          aiStatus: 'fallback',
          aiSource: 'fallback',
        };

        const aiRaw = await requestGeminiJson({
          task: 'Provide discount rationale for expiry-risk stock in professional English only. Return JSON with aiSuggestedDiscountReason (string) and aiSuggestedDiscount (number). Do not use Urdu or Roman Urdu.',
          context: {
            medicine: `${item.brandName} (${item.genericName})`,
            batchNumber: item.batchNumber,
            quantity: item.quantity,
            daysRemaining: item.daysRemaining,
            projectedSellThroughDays: item.projectedSellThroughDays,
            likelySellBeforeExpiry: item.likelySellBeforeExpiry,
            avgDailySales: Number(item.quantity) > 0 && Number(item.projectedSellThroughDays) > 0 && Number.isFinite(item.projectedSellThroughDays)
              ? parseFloat((item.quantity / item.projectedSellThroughDays).toFixed(3))
              : 0,
            suggestedDiscount: item.suggestedDiscount,
            maxSafeDiscount: item.maxSafeDiscount,
            minSellingPrice: item.minSellingPrice,
            riskLevel: item.riskLevel,
          },
          fallback,
        });

        const advisory = parseDiscountAdvisory(aiRaw, fallback);
        const aiDiscountClamped = capDiscountPercent(
          advisory.aiSuggestedDiscount ?? item.suggestedDiscount,
          item.currentPrice,
          item.unitCost
        );

        return {
          ...item,
          aiSuggestedDiscountReason: advisory.aiSuggestedDiscountReason,
          aiSuggestedDiscount: aiDiscountClamped,
          aiAvailable: advisory.aiAvailable,
          aiStatus: advisory.aiStatus,
          aiSource: advisory.aiSource,
        };
      })
    );

    const geminiDiscountMap = new Map(geminiDiscountResults.map((item) => [`${item._id}:${item.batchNumber}`, item]));
    const enrichedDiscountSuggestions = formulaDiscountSuggestions.map(
      (item) => geminiDiscountMap.get(`${item._id}:${item.batchNumber}`) || item
    );

    const geminiActive = enrichedDemandForecasts.some((i) => i.aiSource === 'gemini')
      || enrichedDiscountSuggestions.some((i) => i.aiSource === 'gemini');

    res.json({
      demandForecasts: enrichedDemandForecasts,
      discountSuggestions: enrichedDiscountSuggestions,
      topSelling,
      aiMeta: {
        advisoryOnly: true,
        deterministicBaseTruth: true,
        geminiConfigured: hasGeminiKey(),
        geminiActive,
      },
    });

  } catch (err) {
    console.error('Error calculating smart insights:', err);
    res.status(500).json({ message: 'Error generating insights', error: err.message });
  }
});

// ============================================
// WEATHER STOCK ALERTS (USER-SPECIFIC)
// ============================================

router.get('/ai/weather-alerts', async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select('city area pharmacyName').lean();
    const profileCity = String(user?.city || '').trim();
    const profileArea = String(user?.area || '').trim();
    const usedDefaultCity = !profileCity;
    const city = profileCity || DEFAULT_WEATHER_CITY;

    const pkWeather = await getPakistanWeatherContext(city);
    const weather = pkWeather.primary;

    const allItems = await Inventory.find({ userId }).lean();

    const historyStart = new Date();
    historyStart.setDate(historyStart.getDate() - 120);
    const salesLogs = await Sale.find({
      userId,
      date: { $gte: historyStart },
    }).lean();
    const salesByInventory = groupSalesByInventory(salesLogs);

    const forecastedItems = allItems.map((item) => {
      const itemSales = salesByInventory[item._id.toString()] || [];
      const forecast = buildDemandForecast(item, itemSales);
      return {
        _id: item._id,
        brandName: item.brandName,
        genericName: item.genericName,
        category: item.category,
        currentStock: item.currentStock,
        forecastedDailyDemand: forecast.forecastedDailyDemand,
        salesVelocity: forecast.salesVelocity,
        forecastedWeeklyDemand: forecast.forecastedWeeklyDemand,
      };
    });

    const {
      alerts,
      eventNotes,
      missingSeasonalMedicines,
      pakistanSeason,
      nationalContext,
      horizonDays,
    } = buildWeatherStockAlerts(forecastedItems, weather);

    const actionAlerts = alerts.filter(
      (a) => a.type === 'missing' || (a.type === 'reorder' && a.orderQty > 0)
    );

    const baseNarrative = buildWeatherAlertNarrative({
      weather,
      eventNotes,
      alerts: actionAlerts,
      city,
      nationalContext,
      horizonDays,
    });

    let aiNarrative = baseNarrative;
    let aiSource = 'fallback';
    let aiAvailable = false;

    if (hasGeminiKey() && actionAlerts.length > 0) {
      const fallback = {
        aiNarrative: baseNarrative,
        aiAvailable: false,
        aiStatus: 'fallback',
        aiSource: 'fallback',
      };
      const aiRaw = await requestGeminiJson({
        task: [
          'Write a short professional English-only pharmacy weather-stock advisory for the next 30 days.',
          'Mention missing seasonal medicines if any, using phrasing like "are not in stock" and "order recommended".',
          'Return JSON with aiNarrative (string). Do not invent stock numbers.',
          'CRITICAL: English only. Never use Urdu or Roman Urdu words such as garmi, aglay, mein nahi, order kar do, tez rehti, stock mein.',
        ].join(' '),
        context: {
          city,
          area: profileArea || null,
          horizonDays: HORIZON_DAYS,
          pakistanSeason: nationalContext?.seasonLabel,
          planningNote: nationalContext?.planningNote,
          weather: {
            temp: weather.temp,
            humidity: weather.humidity,
            condition: weather.condition,
            source: weather.source,
          },
          multiCityAvg: pkWeather.nationalSummary?.avgTemp,
          eventNotes: eventNotes.map((e) => e.label),
          missingCount: missingSeasonalMedicines.length,
          alertCount: actionAlerts.length,
          topAlerts: actionAlerts.slice(0, 8).map((a) => ({
            type: a.type,
            brandName: a.brandName,
            currentStock: a.currentStock,
            predictedNeed30Days: a.predictedNeed30Days,
            orderQty: a.orderQty,
            priority: a.priority,
            message: a.message,
          })),
          englishFallbackNarrative: baseNarrative,
        },
        fallback,
      });
      const narrative = String(aiRaw?.aiNarrative || '').trim();
      if (
        narrative
        && aiRaw?.aiSource === 'gemini'
        && !containsNonEnglishNarrative(narrative)
      ) {
        aiNarrative = narrative.slice(0, 480);
        aiSource = 'gemini';
        aiAvailable = true;
      }
    }

    res.json({
      weather: {
        city: weather.city,
        area: profileArea || null,
        country: weather.country || 'PK',
        temp: weather.temp,
        feelsLike: weather.feelsLike,
        humidity: weather.humidity,
        condition: weather.condition,
        description: weather.description,
        icon: weather.icon,
        windSpeed: weather.windSpeed,
        source: weather.source,
        season: weather.season || pakistanSeason?.primary || null,
        fetchedAt: weather.fetchedAt,
        fromCache: Boolean(weather.fromCache),
      },
      multiCity: pkWeather.multiCity,
      nationalSummary: pkWeather.nationalSummary,
      pakistanSeason: pakistanSeason?.primary || nationalContext?.season,
      nationalContext,
      eventNotes,
      alerts: actionAlerts,
      missingSeasonalMedicines,
      highDemandCount: actionAlerts.length,
      missingCount: missingSeasonalMedicines.length,
      reorderCount: actionAlerts.filter((a) => a.type === 'reorder').length,
      aiNarrative,
      aiSource,
      aiAvailable,
      warnings: [],
      meta: {
        usedDefaultCity,
        openWeatherConfigured: hasOpenWeatherKey(),
        geminiConfigured: hasGeminiKey(),
        inventoryScanned: allItems.length,
        horizonDays: horizonDays || HORIZON_DAYS,
      },
    });
  } catch (err) {
    console.error('Error generating weather stock alerts:', err);
    res.status(500).json({ message: 'Error generating weather alerts', error: err.message });
  }
});

// Update medicine discount percentage (enforced: never sell below cost + min profit)
router.put('/inventory/:id/discount', async (req, res) => {
  try {
    const { discount } = req.body;

    if (discount === undefined || isNaN(discount) || discount < 0 || discount > 100) {
      return res.status(400).json({ message: 'Valid discount value (0-100) is required' });
    }

    const item = await Inventory.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) {
      return res.status(404).json({ message: 'Medicine item not found' });
    }

    const requestedDiscount = parseFloat(discount);
    const safeDiscount = capDiscountPercent(requestedDiscount, item.unitPrice, item.unitCost);

    if (safeDiscount <= 0 && requestedDiscount > 0) {
      const minPrice = getMinSellingPrice(item.unitCost);
      return res.status(400).json({
        message: `Cannot apply discount: margin is too thin. Minimum safe sale price is Rs ${minPrice.toFixed(2)} (5% profit on cost).`,
        minSellingPrice: minPrice,
        maxSafeDiscount: 0,
      });
    }

    const updatedItem = await Inventory.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: { discount: safeDiscount } },
      { new: true }
    );

    const wasCapped = safeDiscount < requestedDiscount;
    const salePrice = getDiscountedSalePrice(item.unitPrice, safeDiscount, item.unitCost);

    res.json({
      message: wasCapped
        ? `Discount capped to ${safeDiscount}% to preserve 5% minimum profit (sale price Rs ${salePrice.toFixed(2)}).`
        : 'Discount applied successfully!',
      item: updatedItem,
      appliedDiscount: safeDiscount,
      requestedDiscount,
      wasCapped,
      salePrice,
    });
  } catch (err) {
    console.error('Error updating discount:', err);
    res.status(500).json({ message: 'Error updating discount', error: err.message });
  }
});

export default router;