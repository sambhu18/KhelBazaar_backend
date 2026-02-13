const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' }, // verified purchase
  
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  
  title: { type: String, maxlength: 100 },
  comment: { type: String, maxlength: 1000 },
  
  // Review Details
  pros: [String],
  cons: [String],
  
  // Verification
  verified: { type: Boolean, default: false }, // verified purchase
  helpful: { type: Number, default: 0 }, // helpful votes
  
  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  
  // Media
  images: [String], // review images
  
  // Metadata
  size: String, // size purchased
  color: String, // color purchased
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
reviewSchema.index({ productId: 1, rating: -1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for product reviews
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);