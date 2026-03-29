require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./src/models/Product");

const fixIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB for index fix");

    // Drop existing indexes if they cause issues
    try {
        await Product.collection.dropIndex("title_text_description_text_tags_text");
        console.log("Dropped old text index");
    } catch (e) {
        console.log("No old text index to drop or error dropping it");
    }

    // Create a comprehensive text index
    await Product.collection.createIndex({
      title: "text",
      description: "text",
      brand: "text",
      categories: "text",
      tags: "text"
    });
    console.log("Text index created successfully");

    process.exit(0);
  } catch (err) {
    console.error("FAILED TO FIX INDEXES:", err);
    process.exit(1);
  }
};

fixIndexes();
