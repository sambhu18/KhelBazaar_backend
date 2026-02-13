const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, index: true },
  description: String,
  shortDescription: String,
  price: { type: Number, required: true },
  originalPrice: Number, // for discounts
  currency: { type: String, default: 'NPR' },
  images: [String],

  // Enhanced Size & Variant Management
  variants: [{
    size: { type: String, required: true }, // S, M, L, XL, 42, 43, etc.
    stock: { type: Number, default: 0 },
    price: Number, // variant-specific pricing
    sku: String,
    barcode: String
  }],

  // Product Classification
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  vendor: { type: Schema.Types.ObjectId, ref: 'User' },
  categories: [String],
  tags: [String],

  // Product Details
  brand: String,
  material: String,
  color: String,
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },

  // Size Chart & Fit Guide
  sizeChart: {
    type: String, // 'clothing', 'shoes', 'equipment'
    measurements: [{
      size: String,
      chest: Number,
      waist: Number,
      length: Number,
      other: Schema.Types.Mixed
    }]
  },

  // Product Status & Features
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'archived'],
    default: 'pending'
  },
  featured: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },
  newArrival: { type: Boolean, default: false },

  // Rental System
  isRentable: { type: Boolean, default: false },
  rentalPrice: {
    daily: Number,
    weekly: Number,
    monthly: Number
  },
  rentalDeposit: Number,

  // Customization Options
  customizable: { type: Boolean, default: false },
  customizationOptions: {
    allowNamePrint: { type: Boolean, default: false },
    allowNumberPrint: { type: Boolean, default: false },
    maxNameLength: { type: Number, default: 15 },
    numberRange: { min: Number, max: Number },
    customizationPrice: Number
  },

  // SEO & Discovery
  metaTitle: String,
  metaDescription: String,
  keywords: [String],

  // Analytics
  views: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },

  // Reviews & Ratings
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },

  // Legacy fields (for backward compatibility)
  stock: { type: Number, default: 0 }, // total stock across variants
  sizes: [String], // deprecated, use variants instead
  sku: String,
  digitalId: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for better performance
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ categories: 1 });
productSchema.index({ status: 1 });
productSchema.index({ featured: 1, trending: 1, newArrival: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ createdAt: -1 });

// Pre-save middleware to update total stock
productSchema.pre('save', function () {
  if (this.variants && this.variants.length > 0) {
    this.stock = this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Product', productSchema);


// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const userSchema = new Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   passwordHash: { type: String, required: true },
//   role: { type: String, enum: ['customer','club','admin','player'], default: 'customer' },
//   club: { type: Schema.Types.ObjectId, ref: 'Club' }, // optional for club members
//   avatarUrl: String,
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('User', userSchema);
