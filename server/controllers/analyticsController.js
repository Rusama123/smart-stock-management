import mongoose from "mongoose";
import User from "../models/User.js";
import Sale from "../models/Sale.js";
import Inventory from "../models/Inventory.js";

// Get User Analytics
export const getUserAnalytics = async (req, res) => {
  try {
    const isSuperAdmin = req.userRole === 'superadmin' || 
                        req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';

    let currentUser;

    if (isSuperAdmin) {
      console.log('🔥 Super admin viewing analytics');
      currentUser = {
        _id: req.userId,
        email: req.userEmail,
        role: 'superadmin',
        hasAccess: true
      };
    } else {
      currentUser = await User.findById(req.userId);

      if (!currentUser) {
        return res.status(404).json({ message: "Current user not found!" });
      }

      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied! Admin only." });
      }

      if (!currentUser.hasAccess) {
        return res.status(403).json({ message: "Access denied! Please wait for super admin approval." });
      }
    }

    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (currentUser.role === 'admin') {
      if (targetUser.adminId?.toString() !== currentUser._id.toString() || targetUser.role !== 'user') {
        return res.status(403).json({ message: "You can only view users registered under your account!" });
      }
    }

    // Get inventory analytics
    let totalInventoryValue = 0;
    let totalItems = 0;

    try {
      const inventoryAgg = await Inventory.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.params.userId) } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } },
            totalItems: { $sum: 1 }
          }
        }
      ]);

      if (inventoryAgg.length > 0) {
        totalInventoryValue = inventoryAgg[0].totalValue || 0;
        totalItems = inventoryAgg[0].totalItems || 0;
      }
    } catch (invErr) {
      console.error('Error fetching inventory analytics:', invErr);
      // Continue with default values
    }

    // Get sales analytics
    let totalSalesValue = 0;
    let totalTransactions = 0;

    try {
      const salesAgg = await Sale.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.params.userId) } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            totalTransactions: { $sum: 1 }
          }
        }
      ]);

      if (salesAgg.length > 0) {
        totalSalesValue = salesAgg[0].totalSales || 0;
        totalTransactions = salesAgg[0].totalTransactions || 0;
      }
    } catch (salesErr) {
      console.error('Error fetching sales analytics:', salesErr);
      // Continue with default values
    }

    res.status(200).json({
      user: {
        name: targetUser.name,
        email: targetUser.email,
        pharmacyName: targetUser.pharmacyName || 'N/A'
      },
      inventory: {
        totalValue: totalInventoryValue,
        totalItems: totalItems
      },
      sales: {
        totalSales: totalSalesValue,
        totalTransactions: totalTransactions
      }
    });

  } catch (err) {
    console.error('Error fetching user analytics:', err);
    res.status(500).json({ 
      message: "Error fetching user analytics", 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
