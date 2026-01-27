const mongoose = require("mongoose");
const { Schema } = mongoose;

const clubPostSchema = new Schema({
  clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  postType: {
    type: String,
    enum: ["goods", "service", "announcement", "event"],
    default: "goods",
  },
  title: { type: String, required: true },
  description: String,
  images: [String],
  category: { type: String, required: true },
  price: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 },
  available: { type: Boolean, default: true },
  specifications: {
    size: String,
    color: String,
    condition: {
      type: String,
      enum: ["new", "like-new", "good", "fair"],
      default: "new",
    },
    material: String,
  },
  tags: [String],
  likes: { type: Number, default: 0 },
  comments: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      text: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  views: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["active", "inactive", "archived"],
    default: "active",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ClubPost", clubPostSchema);
