const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  orderNumber: { type: String, unique: true, required: true },
  items: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product" },
      title: String,
      price: Number,
      quantity: Number,
      image: String,
      size: String,
      customization: {
        name: String,
        number: String
      },
    },
  ],
  totalPrice: { type: Number, required: true },
  currency: { type: String, default: "NPR" },
  status: {
    type: String,
    enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["stripe", "khalti", "cod"],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  transactionId: String,
  shippingAddress: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    zipCode: String,
    country: String,
  },
  notes: String,
  loyaltyPointsEarned: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
