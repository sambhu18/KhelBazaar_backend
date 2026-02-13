const mongoose = require('mongoose');
const { Schema } = mongoose;

const recommendationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  
  // Recommendation Type
  type: {
    type: String,
    enum: [
      'viewed_similar', 
      'bought_together', 
      'trending_local', 
      'category_match', 
      'price_range', 
      'brand_preference',
      'seasonal',
      'new_arrival',
      'personalized'
    ],
    required: true
  },
  
  // Recommendation Reason (for explainability)
  reason: { type: String, required: true },
  
  // Scoring
  score: { type: Number, default: 0 }, // recommendation strength
  confidence: { type: Number, default: 0 }, // confidence level
  
  // Context
  basedOnProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  basedOnCategories: [String],
  basedOnBehavior: {
    views: Number,
    purchases: Number,
    timeSpent: Number
  },
  
  // Metadata
  location: String, // for local trending
  season: String, // for seasonal recommendations
  
  // Performance Tracking
  shown: { type: Number, default: 0 },
  clicked: { type: Number, default: 0 },
  purchased: { type: Number, default: 0 },
  
  // Status
  active: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 days
});

// Indexes
recommendationSchema.index({ userId: 1, type: 1, score: -1 });
recommendationSchema.index({ productId: 1 });
recommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
recommendationSchema.index({ active: 1, score: -1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);