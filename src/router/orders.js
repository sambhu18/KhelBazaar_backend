const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  title: String,
  price: Number,
  quantity: Number
});

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [orderItemSchema],
  total: Number,
  currency: { type: String, default: 'NPR' },
  shippingAddress: {
    name: String,
    addressLine: String,
    city: String,
    postalCode: String,
    phone: String
  },
  status: { type: String, enum: ['pending','paid','processing','shipped','cancelled','completed'], default: 'pending' },
  paymentInfo: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);