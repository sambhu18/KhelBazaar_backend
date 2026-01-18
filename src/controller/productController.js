const Product = require("../models/Product");
const User = require("../models/User");
const Club = require("../models/Club");

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('club');
    res.status(200).json(products);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get single product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('club');
    if (!product) return res.status(404).json({ msg: "Product not found" });
    res.status(200).json(product);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Create product (Admin only)
exports.createProduct = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ msg: "Only admins can add products" });
    }

    const { title, description, price, costPrice, currency, stock, categories, sku, club } = req.body;

    if (!title || !price || stock === undefined) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // Handle image uploads
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push(file.path);
      });
    }

    // Create slug from title
    const slug = title.toLowerCase().replace(/\s+/g, "-");

    const product = await Product.create({
      title,
      slug,
      description,
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : 0,
      currency,
      stock: parseInt(stock),
      categories: categories ? categories.split(",").map((c) => c.trim()) : [],
      sku,
      images,
      club: club || null,
    });

    res.status(201).json({ msg: "Product created successfully", product });
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update product (Admin only)
exports.updateProduct = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ msg: "Only admins can update products" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    const { title, description, price, costPrice, currency, stock, categories, sku, club } = req.body;

    // Update basic fields
    if (title) product.title = title;
    if (description) product.description = description;
    if (price) product.price = parseFloat(price);
    if (costPrice !== undefined) product.costPrice = parseFloat(costPrice);
    if (currency) product.currency = currency;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (sku) product.sku = sku;
    if (club) product.club = club;
    if (categories) product.categories = categories.split(",").map((c) => c.trim());

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = [];
      req.files.forEach((file) => {
        newImages.push(file.path);
      });
      product.images = newImages;
    }

    // Update slug if title changed
    if (title) {
      product.slug = title.toLowerCase().replace(/\s+/g, "-");
    }

    await product.save();
    res.status(200).json({ msg: "Product updated successfully", product });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete product (Admin only)
exports.deleteProduct = async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ msg: "Only admins can delete products" });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    res.status(200).json({ msg: "Product deleted successfully" });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ categories: category }).populate('club');
    res.status(200).json(products);
  } catch (err) {
    console.error("GET PRODUCTS BY CATEGORY ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
