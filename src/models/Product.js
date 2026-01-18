const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, index: true },
  description: String,
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 }, // Cost price for profit calculations
  currency: { type: String, default: 'NPR' },
  images: [String],
  stock: { type: Number, default: 0 },
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  categories: [String],
  sizes: [String],
  sku: String,
  digitalId: String, // for authenticity / product passport
  createdAt: { type: Date, default: Date.now }
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
