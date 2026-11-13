import mongoose from 'mongoose';

const salesSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  inventoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Inventory',
    required: true 
  },
  brandName: { 
    type: String, 
    required: true 
  },
  genericName: { 
    type: String 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  unitPrice: { 
    type: Number, 
    required: true,
    min: 0
  },
  totalAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  batchNumber: { 
    type: String 
  },
  customerName: { 
    type: String,
    default: 'Walk-in Customer'
  },
  customerPhone: {
    type: String
  },
  paymentMethod: { 
    type: String,
    enum: ['Cash', 'Card', 'Mobile', 'Credit'],
    default: 'Cash'
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  date: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true 
});

// Compound indexes for better query performance
salesSchema.index({ userId: 1, createdAt: -1 });
salesSchema.index({ userId: 1, date: -1 });
salesSchema.index({ userId: 1, brandName: 1 });

const Sale = mongoose.model('Sale', salesSchema);

export default Sale;