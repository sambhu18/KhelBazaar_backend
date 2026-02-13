const mongoose = require('mongoose');
const { Schema } = mongoose;

const rentalSchema = new Schema({
  rentalNumber: { type: String, unique: true, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  
  // Rental Details
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  actualReturnDate: Date,
  
  // Pricing
  dailyRate: { type: Number, required: true },
  totalDays: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  deposit: { type: Number, required: true },
  lateFee: { type: Number, default: 0 },
  damageFee: { type: Number, default: 0 },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'returned', 'overdue', 'cancelled'],
    default: 'pending'
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'deposit_paid', 'fully_paid', 'refunded'],
    default: 'pending'
  },
  
  // Delivery & Return
  deliveryAddress: {
    name: String,
    phone: String,
    address: String,
    city: String,
    zipCode: String
  },
  
  // Condition Assessment
  conditionAtPickup: {
    rating: { type: Number, min: 1, max: 5 },
    notes: String,
    images: [String]
  },
  
  conditionAtReturn: {
    rating: { type: Number, min: 1, max: 5 },
    notes: String,
    images: [String],
    damageAssessment: String
  },
  
  // Reminders
  remindersSent: [{
    type: { type: String, enum: ['pickup', 'return', 'overdue'] },
    sentAt: Date,
    method: String // email, sms
  }],
  
  // Notes
  notes: String,
  adminNotes: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
rentalSchema.index({ userId: 1, status: 1 });
rentalSchema.index({ productId: 1, status: 1 });
rentalSchema.index({ startDate: 1, endDate: 1 });
rentalSchema.index({ status: 1, endDate: 1 }); // for overdue checks

// Pre-save middleware
rentalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate total days
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Calculate total amount
  if (this.dailyRate && this.totalDays) {
    this.totalAmount = this.dailyRate * this.totalDays;
  }
  
  next();
});

module.exports = mongoose.model('Rental', rentalSchema);