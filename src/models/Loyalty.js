const mongoose = require("mongoose");
const { Schema } = mongoose;

const loyaltySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  totalPoints: { type: Number, default: 0 },
  currentTier: {
    type: String,
    enum: ["bronze", "silver", "gold", "platinum"],
    default: "bronze",
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ["earned", "redeemed"],
      },
      points: Number,
      orderId: { type: Schema.Types.ObjectId, ref: "Order" },
      description: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  nextTierThreshold: { type: Number, default: 500 }, // Points needed for next tier
  redeemedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Loyalty", loyaltySchema);
