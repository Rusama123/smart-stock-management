import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  }
}, { 
  timestamps: true 
});

supplierSchema.index({ userId: 1, name: 1 }, { unique: true });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;