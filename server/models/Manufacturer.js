import mongoose from 'mongoose';

const manufacturerSchema = new mongoose.Schema({
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
  country: {
    type: String,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  website: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// Compound index to ensure unique manufacturer names per user
manufacturerSchema.index({ userId: 1, name: 1 }, { unique: true });

const Manufacturer = mongoose.model('Manufacturer', manufacturerSchema);

export default Manufacturer;