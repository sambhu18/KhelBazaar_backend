const mongoose = require('mongoose');
const { Schema } = mongoose;

const clubSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  bannerUrl: String,
  storefrontSettings: {
    currency: { type: String, default: 'NPR' },
    shippingRegions: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Club', clubSchema);