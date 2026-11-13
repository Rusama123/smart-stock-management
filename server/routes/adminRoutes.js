import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getUsers,
  getAllUsersWithAdminInfo,
  toggleAccess,
  extendSubscription,
  editAdmin,
  editUser,
  addUser,
  deleteAdmin,
  deleteUser,
} from "../controllers/adminController.js";
import { getUserAnalytics } from "../controllers/analyticsController.js";
import User from "../models/User.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Admin Management Routes
router.get("/admin/users", getUsers);
router.post("/admin/users/add", addUser);
router.get("/superadmin/all-users", getAllUsersWithAdminInfo);
router.put("/admin/users/:userId/access", toggleAccess);
router.put("/admin/users/:userId/subscription", extendSubscription);
router.get("/admin/user/:userId/analytics", getUserAnalytics);

// Edit Routes
router.put("/superadmin/admins/:id", editAdmin);
router.put("/admin/users/:id/edit", editUser);

// Delete Routes
router.delete("/superadmin/admins/:id", deleteAdmin);
router.delete("/admin/users/:id", deleteUser);



export default router;