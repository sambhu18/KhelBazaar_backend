const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, index: true },
  description: String,
  price: { type: Number, required: true },
  currency: { type: String, default: 'NPR' },
  images: [String],
  stock: { type: Number, default: 0 },
  category: String,  // ✓ Added for jersey check
  categories: [String],
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  sku: String,
  digitalId: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);