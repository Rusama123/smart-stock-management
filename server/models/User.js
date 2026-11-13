import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 4 },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'user'], 
    default: 'user',
    index: true
  },
  pharmacyName: { 
    type: String, 
    required: function() { return this.role === 'user'; }, 
    minlength: 8 
  },
  city: {
    type: String,
    trim: true,
    required: false
  },
  area: {
    type: String,
    trim: true,
    required: false
  },
  address: {
    type: String,
    trim: true,
    required: false
  },
  phone: { 
    type: String, 
    required: true, 
    length: 11,
    index: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  password: { type: String, required: true, minlength: 8 },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpiry: { type: Date },
  hasAccess: { type: Boolean, default: false },
  subscriptionEndDate: { type: Date },

  // Plan tracking fields
  planId:          { type: String },
  planName:        { type: String },
  planType:        { type: String },
  planDuration:    { type: String },
  planActivatedAt: { type: Date },
  
  // Hierarchy: which admin manages this user
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  
  createdAt: { type: Date, default: Date.now }
});

// Compound indexes
userSchema.index({ role: 1, phone: 1 });
userSchema.index({ adminId: 1, hasAccess: 1 });

const User = mongoose.model("User", userSchema);

export default User;