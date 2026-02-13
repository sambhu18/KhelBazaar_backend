const Product = require("../models/Product");
const User = require("../models/User");
const Club = require("../models/Club");
const Review = require("../models/Review");
const Recommendation = require("../models/Recommendation");

// Get all products with advanced filtering and discovery
exports.getAllProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      size,
      brand,
      color,
      rating,
      sort,
      page = 1,
      limit = 20,
      search,
      featured,
      trending,
      newArrival,
      isRentable,
      status = 'approved'
    } = req.query;

    // Build filter object
    const filter = { status };

    if (category) filter.categories = { $in: [category] };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (size) filter['variants.size'] = size;
    if (brand) filter.brand = new RegExp(brand, 'i');
    if (color) filter.color = new RegExp(color, 'i');
    if (rating) filter.averageRating = { $gte: parseFloat(rating) };
    if (featured === 'true') filter.featured = true;
    if (trending === 'true') filter.trending = true;
    if (newArrival === 'true') filter.newArrival = true;
    if (isRentable === 'true') filter.isRentable = true;

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'price_asc':
        sortObj = { price: 1 };
        break;
      case 'price_desc':
        sortObj = { price: -1 };
        break;
      case 'rating':
        sortObj = { averageRating: -1 };
        break;
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'popular':
        sortObj = { purchases: -1 };
        break;
      default:
        sortObj = { featured: -1, trending: -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .populate('club', 'name logo')
      .populate('vendor', 'name profile.businessName')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      products,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get product discovery feed (trending, new arrivals, recommendations)
exports.getProductDiscovery = async (req, res) => {
  try {
    const userId = req.userId;

    // Get trending products
    const trending = await Product.find({
      status: 'approved',
      trending: true
    })
      .populate('club', 'name logo')
      .limit(10)
      .sort({ purchases: -1 });

    // Get new arrivals
    const newArrivals = await Product.find({
      status: 'approved',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    })
      .populate('club', 'name logo')
      .limit(10)
      .sort({ createdAt: -1 });

    // Get featured products
    const featured = await Product.find({
      status: 'approved',
      featured: true
    })
      .populate('club', 'name logo')
      .limit(10)
      .sort({ averageRating: -1 });

    // Get personalized recommendations if user is logged in
    let recommendations = [];
    if (userId) {
      const userRecommendations = await Recommendation.find({
        userId,
        active: true
      })
        .populate('productId')
        .sort({ score: -1 })
        .limit(10);

      recommendations = userRecommendations.map(rec => ({
        product: rec.productId,
        reason: rec.reason,
        type: rec.type
      }));
    }

    res.status(200).json({
      trending: trending.map(p => ({ ...p.toObject(), reason: "Trending among sports fans" })),
      newArrivals: newArrivals.map(p => ({ ...p.toObject(), reason: "New arrival this month" })),
      featured: featured.map(p => ({ ...p.toObject(), reason: "Featured by our experts" })),
      recommendations
    });
  } catch (err) {
    console.error("GET DISCOVERY ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get single product with enhanced details
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('club', 'name logo email phone')
      .populate('vendor', 'name profile.businessName');

    if (!product) return res.status(404).json({ msg: "Product not found" });

    // Increment view count
    product.views += 1;
    await product.save();

    // Get reviews
    const reviews = await Review.find({
      productId: req.params.id,
      status: 'approved'
    })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get related products
    const relatedProducts = await Product.find({
      _id: { $ne: req.params.id },
      categories: { $in: product.categories },
      status: 'approved'
    })
      .limit(6)
      .populate('club', 'name logo');

    // Track user behavior if logged in
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          'behavior.viewedProducts': {
            $each: [{ productId: req.params.id, viewedAt: new Date() }],
            $slice: -50 // Keep only last 50 views
          }
        }
      });
    }

    res.status(200).json({
      product,
      reviews,
      relatedProducts
    });
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Create product with enhanced features
exports.createProduct = async (req, res) => {
  try {
    // Check if user is admin or approved vendor
    const user = await User.findById(req.userId);
    const isApprovedVendor = (user.role === "vendor" || user.role === "club") && user.vendorInfo?.approved;

    if (!user || (user.role !== "admin" && !isApprovedVendor)) {
      return res.status(403).json({ msg: "Only admins and approved vendors/clubs can add products" });
    }

    const {
      title,
      description,
      shortDescription,
      price,
      originalPrice,
      currency,
      variants,
      categories,
      tags,
      brand,
      material,
      color,
      weight,
      dimensions,
      sizeChart,
      isRentable,
      rentalPrice,
      rentalDeposit,
      customizable,
      customizationOptions,
      metaTitle,
      metaDescription,
      keywords,
      sku,
      club,
      sizes
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({ msg: "Title and price are required" });
    }

    // Handle image uploads
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push(file.path);
      });
    }

    // Create slug from title
    const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, '');

    // Parse variants if provided
    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (e) {
        return res.status(400).json({ msg: "Invalid variants format" });
      }
    }

    const productData = {
      title,
      slug,
      description,
      shortDescription,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      currency: currency || 'NPR',
      images,
      variants: parsedVariants,
      categories: Array.isArray(categories) ? categories : (categories ? (typeof categories === 'string' ? categories.split(",").map(c => c.trim()) : [categories]) : []),
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      brand,
      material,
      color,
      weight: weight ? parseFloat(weight) : null,
      dimensions: dimensions ? JSON.parse(dimensions) : null,
      sizeChart: sizeChart ? JSON.parse(sizeChart) : null,
      isRentable: isRentable === 'true',
      rentalPrice: rentalPrice ? JSON.parse(rentalPrice) : null,
      rentalDeposit: rentalDeposit ? parseFloat(rentalDeposit) : null,
      customizable: customizable === 'true',
      customizationOptions: customizationOptions ? JSON.parse(customizationOptions) : null,
      metaTitle,
      metaDescription,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      sku,
      club: club || null,
      sizes: Array.isArray(sizes) ? sizes : (sizes ? (typeof sizes === 'string' ? sizes.split(",") : [sizes]) : []),
      vendor: user.role === 'vendor' ? req.userId : null,
      status: user.role === 'admin' ? 'approved' : 'pending',
      newArrival: true
    };

    const product = await Product.create(productData);

    res.status(201).json({ msg: "Product created successfully", product });
  } catch (err) {
    console.error("CREATE PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update product with enhanced features
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    // Check permissions
    // Check if user is admin or the owner (vendor/club)
    const user = await User.findById(req.userId);
    const isOwner = product.vendor?.toString() === req.userId;

    if (!user || (user.role !== "admin" && !isOwner)) {
      return res.status(403).json({ msg: "Not authorized to update this product" });
    }

    const updateData = { ...req.body };

    // Handle arrays and objects
    if (updateData.categories) {
      if (typeof updateData.categories === 'string') {
        updateData.categories = updateData.categories.split(",").map((c) => c.trim());
      } else if (!Array.isArray(updateData.categories)) {
        updateData.categories = [updateData.categories];
      }
    }
    if (updateData.sizes) {
      if (typeof updateData.sizes === 'string') {
        updateData.sizes = updateData.sizes.split(",").map((s) => s.trim());
      } else if (!Array.isArray(updateData.sizes)) {
        updateData.sizes = [updateData.sizes];
      }
    }
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(",").map((t) => t.trim());
    }
    if (updateData.keywords && typeof updateData.keywords === 'string') {
      updateData.keywords = updateData.keywords.split(",").map((k) => k.trim());
    }

    // Parse JSON fields
    ['variants', 'dimensions', 'sizeChart', 'rentalPrice', 'customizationOptions'].forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string') {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch (e) {
          delete updateData[field];
        }
      }
    });

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = [];
      req.files.forEach((file) => {
        newImages.push(file.path);
      });
      updateData.images = newImages;
    }

    // Update slug if title changed
    if (updateData.title) {
      updateData.slug = updateData.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, '');
    }

    // If vendor/club is updating, set status to pending (except for basic info)
    if ((user.role === 'vendor' || user.role === 'club') && !['description', 'shortDescription', 'images'].includes(Object.keys(updateData)[0])) {
      updateData.status = 'pending';
    }

    Object.assign(product, updateData);
    await product.save();

    res.status(200).json({ msg: "Product updated successfully", product });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: "Product not found" });

    // Check permissions - ONLY ADMIN CAN DELETE
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ msg: "Only administrators can delete products. For removal requests, please contact support." });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ msg: "Product deleted successfully" });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get products by category with enhanced filtering
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { sort, minPrice, maxPrice, size, brand, page = 1, limit = 20 } = req.query;

    const filter = {
      categories: category,
      status: 'approved'
    };

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (size) filter['variants.size'] = size;
    if (brand) filter.brand = new RegExp(brand, 'i');

    let sortObj = { featured: -1, createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    if (sort === 'price_desc') sortObj = { price: -1 };
    if (sort === 'rating') sortObj = { averageRating: -1 };

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
      .populate('club', 'name logo')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      products,
      category,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("GET PRODUCTS BY CATEGORY ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Admin: Approve/Reject products
exports.moderateProduct = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ msg: "Only admins can moderate products" });
    }

    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        status,
        moderationReason: reason,
        moderatedAt: new Date(),
        moderatedBy: req.userId
      },
      { new: true }
    );

    if (!product) return res.status(404).json({ msg: "Product not found" });

    res.status(200).json({ msg: `Product ${status} successfully`, product });
  } catch (err) {
    console.error("MODERATE PRODUCT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get product variants and stock
exports.getProductVariants = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('variants title');
    if (!product) return res.status(404).json({ msg: "Product not found" });

    res.status(200).json({
      productId: product._id,
      title: product.title,
      variants: product.variants
    });
  } catch (err) {
    console.error("GET VARIANTS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Search products with autocomplete
exports.searchProducts = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ msg: "Search query must be at least 2 characters" });
    }

    const products = await Product.find({
      $and: [
        { status: 'approved' },
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } },
            { categories: { $in: [new RegExp(q, 'i')] } },
            { brand: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
      .select('title price images averageRating')
      .limit(parseInt(limit));

    // Track search if user is logged in
    if (req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        $push: {
          'behavior.searchHistory': {
            $each: [{ query: q, searchedAt: new Date() }],
            $slice: -20 // Keep only last 20 searches
          }
        }
      });
    }

    res.status(200).json({ products, query: q });
  } catch (err) {
    console.error("SEARCH PRODUCTS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
