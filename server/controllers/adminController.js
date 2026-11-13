import User from "../models/User.js";

// Get Users/Admins List
export const getUsers = async (req, res) => {
  try {
    console.log(`📋 User accessing admin panel:`, {
      email: req.userEmail,
      role: req.userRole,
      userId: req.userId
    });

    const isSuperAdmin = req.userRole === 'superadmin' || 
                        req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';
    
    if (isSuperAdmin) {
      console.log('🔥 SUPER ADMIN detected - fetching all admins');
      
      const users = await User.find({ 
        role: 'admin',
        email: { $ne: 'usama.rana.tech@gmail.com' }
      })
        .select('name email phone businessName role isVerified hasAccess subscriptionEndDate createdAt')
        .sort({ createdAt: -1 })
        .lean();

      console.log(`✅ Super Admin viewing ${users.length} admins`);

      const today = new Date();
      const userStats = {
        totalAdmins: users.length,
        verifiedAdmins: users.filter(u => u.isVerified).length,
        unverifiedAdmins: users.filter(u => !u.isVerified).length,
        activeSubscriptions: users.filter(u => 
          u.hasAccess && u.subscriptionEndDate && new Date(u.subscriptionEndDate) > today
        ).length,
        expiredSubscriptions: users.filter(u => 
          u.subscriptionEndDate && new Date(u.subscriptionEndDate) <= today
        ).length,
        pendingApproval: users.filter(u => u.isVerified && !u.hasAccess).length
      };

      return res.status(200).json({ 
        users, 
        userStats, 
        currentUserRole: 'superadmin' 
      });
    }

    // Regular admin flow
    const currentUser = await User.findById(req.userId);
    
    if (!currentUser) {
      console.error('❌ Current user not found:', req.userId);
      return res.status(404).json({ message: "User not found!" });
    }

    console.log(`User ${currentUser.email} (${currentUser.role}) accessing admin panel`);

    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: "Access denied! Admin privileges required." });
    }

    if (!currentUser.hasAccess) {
      return res.status(403).json({ message: "Access denied! Please wait for super admin approval." });
    }

    // For legacy support: associate users with this admin via phone number if adminId is not set
    await User.updateMany(
      { role: 'user', phone: currentUser.phone, adminId: { $exists: false } },
      { $set: { adminId: currentUser._id } }
    );

    const users = await User.find({ 
      role: 'user',
      adminId: currentUser._id
    })
      .select('name email pharmacyName city area address phone role isVerified hasAccess subscriptionEndDate createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Admin viewing ${users.length} users with adminId ${currentUser._id}`);

    const today = new Date();
    const userStats = {
      totalUsers: users.length,
      activeSubscriptions: users.filter(u => 
        u.hasAccess && u.subscriptionEndDate && new Date(u.subscriptionEndDate) > today
      ).length,
      expiredSubscriptions: users.filter(u => 
        u.subscriptionEndDate && new Date(u.subscriptionEndDate) <= today
      ).length,
      pendingApproval: users.filter(u => u.isVerified && !u.hasAccess).length
    };

    res.status(200).json({ 
      users, 
      userStats, 
      currentUserRole: currentUser.role 
    });

  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ 
      message: "Error fetching users", 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Get All Users with Admin Info (Super Admin Only)
export const getAllUsersWithAdminInfo = async (req, res) => {
  try {
    console.log(`📋 Super Admin accessing all users:`, {
      email: req.userEmail,
      role: req.userRole,
      userId: req.userId
    });

    const isSuperAdmin = req.userRole === 'superadmin' || 
                        req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';
    
    if (!isSuperAdmin) {
      return res.status(403).json({ 
        message: "Access denied! Super Admin privileges required." 
      });
    }

    console.log('🔥 SUPER ADMIN detected - fetching all users with admin info');
    
    const users = await User.find({ role: 'user' })
      .select('name email pharmacyName city area address phone role isVerified hasAccess subscriptionEndDate createdAt adminId')
      .sort({ createdAt: -1 })
      .lean();

    const admins = await User.find({ role: 'admin' })
      .select('name email phone role')
      .lean();

    const adminMap = {};
    admins.forEach(admin => {
      adminMap[admin._id.toString()] = admin;
      if (!adminMap[admin.phone]) {
        adminMap[admin.phone] = admin;
      }
    });

    const usersWithAdminInfo = await Promise.all(
      users.map(async (user) => {
        let adminInfo = null;
        
        if (user.adminId && adminMap[user.adminId.toString()]) {
          const admin = adminMap[user.adminId.toString()];
          adminInfo = {
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role
          };
        } 
        else if (user.phone && adminMap[user.phone]) {
          const admin = adminMap[user.phone];
          adminInfo = {
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role
          };
          if (!user.adminId) {
            await User.updateOne(
              { _id: user._id },
              { $set: { adminId: admin._id } }
            );
          }
        }

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          pharmacyName: user.pharmacyName,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          hasAccess: user.hasAccess,
          subscriptionEndDate: user.subscriptionEndDate,
          createdAt: user.createdAt,
          adminInfo: adminInfo
        };
      })
    );

    console.log(`✅ Super Admin viewing ${usersWithAdminInfo.length} users`);

    const today = new Date();
    const usersWithAdmin    = usersWithAdminInfo.filter(u => u.adminInfo !== null).length;
    const usersWithoutAdmin = usersWithAdminInfo.filter(u => u.adminInfo === null).length;
    
    const userStats = {
      totalUsers: usersWithAdminInfo.length,
      usersWithAdmin,
      usersWithoutAdmin,
      activeUsers: usersWithAdminInfo.filter(u => 
        u.hasAccess && u.subscriptionEndDate && new Date(u.subscriptionEndDate) > today
      ).length,
      expiredUsers: usersWithAdminInfo.filter(u => 
        u.subscriptionEndDate && new Date(u.subscriptionEndDate) <= today
      ).length
    };

    return res.status(200).json({ 
      users: usersWithAdminInfo,
      totalUsers:        userStats.totalUsers,
      usersWithAdmin:    userStats.usersWithAdmin,
      usersWithoutAdmin: userStats.usersWithoutAdmin,
      activeUsers:       userStats.activeUsers,
      expiredUsers:      userStats.expiredUsers,
      currentUserRole: 'superadmin' 
    });

  } catch (err) {
    console.error('❌ Error fetching all users:', err);
    res.status(500).json({ 
      message: "Error fetching all users", 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Toggle User/Admin Access - WITH CASCADE
export const toggleAccess = async (req, res) => {
  try {
    const isSuperAdmin = req.userRole === 'superadmin' || 
                        req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';

    let currentUser;

    if (isSuperAdmin) {
      console.log('🔥 Super admin managing access');
      currentUser = {
        _id: req.userId,
        email: req.userEmail,
        role: 'superadmin',
        hasAccess: true
      };
    } else {
      currentUser = await User.findById(req.userId);

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied! Admin only." });
      }

      if (!currentUser.hasAccess) {
        return res.status(403).json({ message: "Access denied! Please wait for super admin approval." });
      }
    }

    const { hasAccess } = req.body;
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    // SUPER ADMIN MANAGING ADMIN
    if (currentUser.role === 'superadmin') {
      if (targetUser.role !== 'admin') {
        return res.status(403).json({ message: "Super admin can only manage admin accounts!" });
      }
      
      if (targetUser.email === currentUser.email) {
        return res.status(403).json({ message: "You cannot modify your own access!" });
      }

      if (!hasAccess) {
        console.log(`🔥 Disabling admin ${targetUser.email} - cascading to all their users...`);
        
        const affectedUsers = await User.updateMany(
          {
            role: 'user',
            adminId: targetUser._id
          },
          {
            $set: { 
              hasAccess: false
            }
          }
        );

        console.log(`✅ Disabled ${affectedUsers.modifiedCount} users under admin ${targetUser.email}`);
      }
      
      if (hasAccess) {
        console.log(`✅ Enabling admin ${targetUser.email} - users remain disabled until admin enables them`);
      }
    }

    // ADMIN MANAGING USER
    if (currentUser.role === 'admin') {
      if (targetUser.role !== 'user') {
        return res.status(403).json({ message: "You can only manage user accounts!" });
      }
      if (targetUser.adminId?.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ message: "You can only manage users registered under your account!" });
      }
    }

    targetUser.hasAccess = hasAccess;
    if (hasAccess && currentUser.role === 'admin') {
      targetUser.adminId = currentUser._id;

      // ✅ AUTO-CASCADE: Give pharmacist the same subscription end date as admin
      if (currentUser.subscriptionEndDate) {
        targetUser.subscriptionEndDate = currentUser.subscriptionEndDate;
        console.log(`✅ Auto-cascaded subscription to pharmacist ${targetUser.email}: expires ${new Date(currentUser.subscriptionEndDate).toLocaleDateString()}`);
      }
    }

    await targetUser.save();

    console.log(`${targetUser.role} ${targetUser.email} access ${hasAccess ? 'granted' : 'revoked'} by ${currentUser.role}`);

    res.status(200).json({ 
      message: `${targetUser.role === 'admin' ? 'Admin' : 'User'} access ${hasAccess ? 'granted' : 'revoked'} successfully!${
        currentUser.role === 'superadmin' && targetUser.role === 'admin' && !hasAccess 
          ? ' All users under this admin have also been disabled.' 
          : ''
      }${
        currentUser.role === 'admin' && hasAccess && targetUser.subscriptionEndDate
          ? ` Subscription active until ${new Date(targetUser.subscriptionEndDate).toLocaleDateString('en-PK')}.`
          : ''
      }`,
      user: targetUser
    });

  } catch (err) {
    console.error('Error updating user access:', err);
    res.status(500).json({ 
      message: "Error updating user access", 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Extend Subscription - WITH CASCADE
export const extendSubscription = async (req, res) => {
  try {
    const isSuperAdmin = req.userRole === 'superadmin' || 
                        req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';

    let currentUser;

    if (isSuperAdmin) {
      console.log('🔥 Super admin managing subscription');
      currentUser = {
        _id: req.userId,
        email: req.userEmail,
        role: 'superadmin',
        hasAccess: true
      };
    } else {
      currentUser = await User.findById(req.userId);

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied! Admin only." });
      }

      if (!currentUser.hasAccess) {
        return res.status(403).json({ message: "Access denied! Please wait for super admin approval." });
      }

      if (currentUser.subscriptionEndDate) {
        const today = new Date();
        if (today > new Date(currentUser.subscriptionEndDate)) {
          return res.status(403).json({ 
            message: "Your subscription has expired! You cannot extend user subscriptions. Please contact super admin." 
          });
        }
      }
    }

    const { months } = req.body;
    
    if (!months || months < 1) {
      return res.status(400).json({ message: "Please provide valid number of months (1-12)!" });
    }

    const targetUser = await User.findById(req.params.userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (currentUser.role === 'superadmin') {
      if (targetUser.role !== 'admin') {
        return res.status(403).json({ message: "Super admin can only manage admin accounts!" });
      }
    }

    if (currentUser.role === 'admin') {
      if (targetUser.role !== 'user') {
        return res.status(403).json({ message: "You can only manage user accounts!" });
      }
      if (targetUser.adminId?.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ message: "You can only manage users registered under your account!" });
      }
    }

    let newEndDate;
    const today = new Date();
    
    if (targetUser.subscriptionEndDate && new Date(targetUser.subscriptionEndDate) > today) {
      newEndDate = new Date(targetUser.subscriptionEndDate);
      newEndDate.setMonth(newEndDate.getMonth() + months);
    } else {
      newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + months);
    }

    targetUser.subscriptionEndDate = newEndDate;
    targetUser.hasAccess = true;
    if (currentUser.role === 'admin') {
      targetUser.adminId = currentUser._id;
    }
    await targetUser.save();

    console.log(`Subscription extended for ${targetUser.role} ${targetUser.email} by ${months} month(s)`);

    // ✅ CASCADE: If superadmin extended an admin's subscription, also update all
    //    pharmacists (role=user) under that admin to the same end date
    let cascadeCount = 0;
    if (isSuperAdmin && targetUser.role === 'admin') {
      const cascadeResult = await User.updateMany(
        {
          role: 'user',
          adminId: targetUser._id
        },
        {
          $set: {
            subscriptionEndDate: newEndDate,
            hasAccess:           true,
          }
        }
      );
      cascadeCount = cascadeResult.modifiedCount;
      if (cascadeCount > 0) {
        console.log(`✅ Cascaded subscription to ${cascadeCount} pharmacist(s) under admin ${targetUser.email}`);
      }
    }

    res.status(200).json({ 
      message: `Subscription extended by ${months} month(s) successfully!${
        cascadeCount > 0 ? ` Also extended for ${cascadeCount} pharmacist(s).` : ''
      }`,
      user: targetUser
    });

  } catch (err) {
    console.error('Error extending subscription:', err);
    res.status(500).json({ 
      message: "Error extending subscription", 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// ════════════════════════════════════════════════════════════════
// Edit Admin — SuperAdmin only
// PUT /api/superadmin/admins/:id
// ════════════════════════════════════════════════════════════════
export const editAdmin = async (req, res) => {
  try {
    const isSuperAdmin = req.userRole === 'superadmin' ||
                         req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';

    if (!isSuperAdmin) {
      return res.status(403).json({ message: "Access denied! SuperAdmin only." });
    }

    const { id } = req.params;
    const { name, email, phone, businessName, isVerified, hasAccess } = req.body;

    // Prevent editing the super admin's own account
    if (email?.toLowerCase() === 'usama.rana.tech@gmail.com') {
      return res.status(403).json({ message: "Cannot edit the super admin account." });
    }

    // Email duplicate check — skip same document
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: "Email already in use by another account." });
      }
    }

    const targetAdmin = await User.findById(id);
    if (!targetAdmin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    if (targetAdmin.role !== 'admin') {
      return res.status(400).json({ message: "Target user is not an admin." });
    }

    const updatedAdmin = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(name         !== undefined && { name }),
          ...(email        !== undefined && { email }),
          ...(phone        !== undefined && { phone }),
          ...(businessName !== undefined && { businessName }),
          ...(isVerified   !== undefined && { isVerified }),
          ...(hasAccess    !== undefined && { hasAccess }),
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    console.log(`✅ Admin ${updatedAdmin.email} updated by SuperAdmin`);

    res.status(200).json({
      message: "Admin updated successfully.",
      admin: updatedAdmin,
    });

  } catch (err) {
    console.error("❌ Error updating admin:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════
// Edit User — Admin only (can only edit their own users)
// PUT /api/admin/users/:id/edit
// ════════════════════════════════════════════════════════════════
export const editUser = async (req, res) => {
  try {
    const isSuperAdmin = req.userRole === 'superadmin' ||
                         req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';

    let currentUser;

    if (isSuperAdmin) {
      currentUser = { _id: req.userId, role: 'superadmin', phone: null };
    } else {
      currentUser = await User.findById(req.userId);

      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied! Admin only." });
      }

      if (!currentUser.hasAccess) {
        return res.status(403).json({ message: "Access denied! Please wait for super admin approval." });
      }
    }

    const { id } = req.params;
    const { name, email, phone, pharmacyName, city, area, address, isVerified, hasAccess } = req.body;

    // Email duplicate check
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: "Email already in use by another account." });
      }
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (targetUser.role !== 'user') {
      return res.status(400).json({ message: "Target account is not a user." });
    }

    // Admin can only edit their own users (matched by adminId)
    if (!isSuperAdmin && targetUser.adminId?.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ message: "You can only edit users registered under your account." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(name         !== undefined && { name }),
          ...(email        !== undefined && { email }),
          ...(phone        !== undefined && { phone }),
          ...(pharmacyName !== undefined && { pharmacyName }),
          ...(city         !== undefined && { city }),
          ...(area         !== undefined && { area }),
          ...(address      !== undefined && { address }),
          ...(isVerified   !== undefined && { isVerified }),
          ...(hasAccess    !== undefined && { hasAccess }),
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    console.log(`✅ User ${updatedUser.email} updated by ${isSuperAdmin ? 'SuperAdmin' : 'Admin'}`);

    res.status(200).json({
      message: "User updated successfully.",
      user: updatedUser,
    });

  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Add User — Admin only
// POST /api/admin/users/add
export const addUser = async (req, res) => {
  try {
    const { name, pharmacyName, phone, email, password, city, area, address } = req.body;

    const currentAdmin = await User.findById(req.userId);
    if (!currentAdmin || currentAdmin.role !== 'admin') {
      return res.status(403).json({ message: "Access denied! Admin privileges required." });
    }

    if (!currentAdmin.hasAccess) {
      return res.status(403).json({ message: "Access denied! Please wait for super admin approval." });
    }

    const existingUserCount = await User.countDocuments({ role: 'user', adminId: currentAdmin._id });
    if (existingUserCount >= 3) {
      return res.status(400).json({ message: "You have already reached the maximum limit of 3 users." });
    }

    if (!name || name.length < 4) {
      return res.status(400).json({ message: "Name must be at least 4 characters!" });
    }

    if (!pharmacyName || pharmacyName.length < 8) {
      return res.status(400).json({ message: "Pharmacy name must be at least 8 characters!" });
    }

    if (!city || city.trim().length < 2) {
      return res.status(400).json({ message: "City is required (min 2 characters)!" });
    }

    if (!area || area.trim().length < 2) {
      return res.status(400).json({ message: "Area is required (min 2 characters)!" });
    }

    if (!phone || phone.length !== 11 || !/^\d+$/.test(phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 11 digits!" });
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address!" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with 1 uppercase letter and 1 number!"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email!" });
    }

    const newUser = new User({
      name,
      role: 'user',
      pharmacyName,
      city: city.trim(),
      area: area.trim(),
      address: address?.trim() || undefined,
      phone,
      email: normalizedEmail,
      password,
      adminId: currentAdmin._id,
      isVerified: true,
      hasAccess: false
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully!",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        pharmacyName: newUser.pharmacyName,
        city: newUser.city,
        area: newUser.area,
        address: newUser.address,
        adminId: newUser.adminId,
        isVerified: newUser.isVerified,
        hasAccess: newUser.hasAccess
      }
    });

  } catch (err) {
    console.error("❌ Error adding user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete Admin — Super Admin only
// DELETE /api/superadmin/admins/:id
export const deleteAdmin = async (req, res) => {
  try {
    const isSuperAdmin = req.userRole === 'superadmin' || 
                        req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';

    if (!isSuperAdmin) {
      return res.status(403).json({ message: "Access denied! Super Admin privileges required." });
    }

    const { id } = req.params;

    const targetAdmin = await User.findById(id);
    if (!targetAdmin) {
      return res.status(404).json({ message: "Admin not found!" });
    }

    if (targetAdmin.role !== 'admin') {
      return res.status(400).json({ message: "Target account is not an admin!" });
    }

    if (targetAdmin.email?.toLowerCase() === 'usama.rana.tech@gmail.com') {
      return res.status(403).json({ message: "You cannot delete the super admin account!" });
    }

    // Delete all pharmacists/users associated with this admin
    const deletedUsers = await User.deleteMany({ role: 'user', adminId: targetAdmin._id });
    console.log(`🧹 Deleted ${deletedUsers.deletedCount} sub-users under admin ${targetAdmin.email}`);

    await User.findByIdAndDelete(id);
    console.log(`🗑️ Admin ${targetAdmin.email} deleted by Super Admin`);

    res.status(200).json({ message: "Admin and associated users deleted successfully!" });

  } catch (err) {
    console.error("❌ Error deleting admin:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete User — Admin only (can only delete their own users)
// DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const isSuperAdmin = req.userRole === 'superadmin' || 
                        req.userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';

    let currentUser;

    if (isSuperAdmin) {
      currentUser = { _id: req.userId, role: 'superadmin' };
    } else {
      currentUser = await User.findById(req.userId);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Access denied! Admin privileges required." });
      }
      if (!currentUser.hasAccess) {
        return res.status(403).json({ message: "Access denied! Please wait for super admin approval." });
      }
    }

    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    if (targetUser.role !== 'user') {
      return res.status(400).json({ message: "Target account is not a user!" });
    }

    // Verify ownership if regular admin
    if (!isSuperAdmin && targetUser.adminId?.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ message: "You can only delete users registered under your account." });
    }

    await User.findByIdAndDelete(id);
    console.log(`🗑️ User ${targetUser.email} deleted by ${isSuperAdmin ? 'SuperAdmin' : 'Admin'}`);

    res.status(200).json({ message: "User deleted successfully!" });

  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};