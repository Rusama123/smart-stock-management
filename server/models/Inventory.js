import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchNumber: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 0 
  },
  expiryDate: { 
    type: Date, 
    required: true 
  }
}, { _id: true });

const inventorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  brandName: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  genericName: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  dosage: { 
    type: String, 
    required: true,
    trim: true
  },
  category: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  manufacturer: { 
    type: String, 
    required: false,
    trim: true
  },
  supplier: { 
    type: String, 
    required: false,
    trim: true
  },
  barcode: { 
    type: String,
    trim: true
  },
  currentStock: { 
    type: Number, 
    required: true,
    default: 0,
    min: 0
  },
  unitPrice: { 
    type: Number, 
    required: true,
    min: 0
  },
  unitCost: { 
    type: Number, 
    required: true,
    min: 0
  },
  boxPrice: { 
    type: Number,
    min: 0,
    required: false
  },
  unitsPerBox: { 
    type: Number,
    min: 1,
    required: false
  },
  discount: { 
    type: Number, 
    required: false,
    default: 0,
    min: 0,
    max: 100
  },
  batches: [batchSchema]
}, { 
  timestamps: true 
});

// Compound indexes for better performance
inventorySchema.index({ userId: 1, brandName: 1 });
inventorySchema.index({ userId: 1, genericName: 1 });
inventorySchema.index({ userId: 1, category: 1 });

// CRITICAL: Barcode index must be unique only when barcode is provided and is a non-empty string.
// This allows multiple documents with no barcode (null or undefined) without causing duplication errors.
inventorySchema.index(
  { userId: 1, barcode: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { barcode: { $type: 'string' } }
  }
);

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;