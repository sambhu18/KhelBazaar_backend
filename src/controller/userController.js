const User = require("../models/User");
const Loyalty = require("../models/Loyalty");
const Product = require("../models/Product");

// Get all users (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, verified, search } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (verified !== undefined) filter.verified = verified === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Get loyalty info
    const loyalty = await Loyalty.findOne({ userId: req.userId });

    res.status(200).json({
      user,
      loyalty: loyalty || { totalPoints: 0, currentTier: 'bronze' }
    });
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      city,
      zipCode,
      country,
      avatar,
      profile,
      preferences,
      addresses
    } = req.body;

    const updateData = {
      name,
      phone,
      address,
      city,
      zipCode,
      country,
      avatar,
      updatedAt: new Date()
    };

    // Handle nested objects
    if (profile) updateData.profile = profile;
    if (preferences) updateData.preferences = preferences;
    if (addresses) updateData.addresses = addresses;

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    ).select("-password");

    res.status(200).json({ msg: "Profile updated successfully", user });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user cart with enhanced details
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("cart.productId");
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Calculate totals with variant pricing
    const cartItems = user.cart.map((item) => {
      const product = item.productId;
      let price = product.price;
      let stock = product.stock;

      // Check variant pricing and stock
      if (item.size && product.variants && product.variants.length > 0) {
        const variant = product.variants.find(v => v.size === item.size);
        if (variant) {
          price = variant.price || product.price;
          stock = variant.stock;
        }
      }

      // Add customization cost
      if (item.customization && product.customizable && product.customizationOptions?.customizationPrice) {
        price += product.customizationOptions.customizationPrice;
      }

      return {
        cartItemId: item._id,
        productId: product._id,
        title: product.title,
        price,
        originalPrice: product.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        customization: item.customization,
        image: product.images[0],
        subtotal: price * item.quantity,
        stock,
        available: stock >= item.quantity,
        addedAt: item.addedAt
      };
    });

    const totalPrice = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    res.status(200).json({
      cartItems,
      totalPrice,
      totalItems,
      currency: user.preferences?.currency || 'NPR'
    });
  } catch (err) {
    console.error("GET CART ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Add to cart with enhanced validation
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity, size, color, customization } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ msg: "Invalid product or quantity" });
    }

    // Validate product exists and is available
    const product = await Product.findById(productId);
    if (!product || product.status !== 'approved') {
      return res.status(404).json({ msg: "Product not found or not available" });
    }

    // Check stock availability
    let availableStock = product.stock;
    if (size && product.variants && product.variants.length > 0) {
      const variant = product.variants.find(v => v.size === size);
      if (!variant) {
        return res.status(400).json({ msg: "Selected size not available" });
      }
      availableStock = variant.stock;
    }

    if (availableStock < quantity) {
      const stockMsg = availableStock === 0 ? "Product is currently out of stock" : `Only ${availableStock} items left in stock`;
      return res.status(400).json({ msg: stockMsg });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Check if item with same specifications exists
    const existingItemIndex = user.cart.findIndex((item) => {
      const sameProduct = item.productId.toString() === productId;
      const sameSize = (item.size || "") === (size || "");
      const sameColor = (item.color || "") === (color || "");

      const itemCustomName = item.customization?.name || "";
      const itemCustomNumber = item.customization?.number || "";
      const reqCustomName = customization?.name || "";
      const reqCustomNumber = customization?.number || "";

      return sameProduct && sameSize && sameColor &&
        (itemCustomName === reqCustomName && itemCustomNumber === reqCustomNumber);
    });

    if (existingItemIndex > -1) {
      const newQuantity = user.cart[existingItemIndex].quantity + quantity;
      if (newQuantity > availableStock) {
        return res.status(400).json({ msg: `Cannot add more. Only ${availableStock} items available` });
      }
      user.cart[existingItemIndex].quantity = newQuantity;
    } else {
      user.cart.push({
        productId,
        quantity,
        size,
        color,
        customization: customization ? {
          name: customization.name,
          number: customization.number,
          additionalText: customization.additionalText
        } : undefined,
        addedAt: new Date()
      });
    }

    await user.save();

    // Track user behavior
    if (!user.behavior) user.behavior = {};
    if (!user.behavior.categoryInterests) user.behavior.categoryInterests = [];

    // Update category interests
    product.categories.forEach(category => {
      const existingInterest = user.behavior.categoryInterests.find(c => c.category === category);
      if (existingInterest) {
        existingInterest.score += 1;
      } else {
        user.behavior.categoryInterests.push({ category, score: 1 });
      }
    });

    await user.save();

    res.status(200).json({ msg: "Added to cart", cart: user.cart });
  } catch (err) {
    console.error("ADD TO CART ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Remove from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId, size, color, customization } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Remove specific product variant
    user.cart = user.cart.filter((item) => {
      const sameProduct = item.productId.toString() === productId;
      const sameSize = (item.size || "") === (size || "");
      const sameColor = (item.color || "") === (color || "");

      const itemCustomName = item.customization?.name || "";
      const itemCustomNumber = item.customization?.number || "";
      const reqCustomName = customization?.name || "";
      const reqCustomNumber = customization?.number || "";

      const sameCustomization = itemCustomName === reqCustomName && itemCustomNumber === reqCustomNumber;

      return !(sameProduct && sameSize && sameColor && sameCustomization);
    });

    await user.save();
    res.status(200).json({ msg: "Removed from cart", cart: user.cart });
  } catch (err) {
    console.error("REMOVE FROM CART ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update cart item quantity
exports.updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity, size, color, customization } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ msg: "Invalid product or quantity" });
    }

    // Check stock availability
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    let availableStock = product.stock;
    if (size && product.variants && product.variants.length > 0) {
      const variant = product.variants.find(v => v.size === size);
      if (variant) {
        availableStock = variant.stock;
      }
    }

    if (availableStock < quantity) {
      return res.status(400).json({ msg: `Only ${availableStock} items available` });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const cartItem = user.cart.find((item) => {
      const sameProduct = item.productId.toString() === productId;
      const sameSize = (item.size || "") === (size || "");
      const sameColor = (item.color || "") === (color || "");

      const itemCustomName = item.customization?.name || "";
      const itemCustomNumber = item.customization?.number || "";
      const reqCustomName = customization?.name || "";
      const reqCustomNumber = customization?.number || "";

      return sameProduct && sameSize && sameColor &&
        (itemCustomName === reqCustomName && itemCustomNumber === reqCustomNumber);
    });

    if (!cartItem) return res.status(404).json({ msg: "Product not in cart" });

    cartItem.quantity = quantity;
    await user.save();

    res.status(200).json({ msg: "Cart updated", cart: user.cart });
  } catch (err) {
    console.error("UPDATE CART ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { cart: [] },
      { new: true }
    );

    if (!user) return res.status(404).json({ msg: "User not found" });
    res.status(200).json({ msg: "Cart cleared", cart: [] });
  } catch (err) {
    console.error("CLEAR CART ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get wishlist with enhanced details
exports.getWishlist = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.userId)
      .populate({
        path: 'wishlist.productId',
        select: 'title price images averageRating stock status',
        match: { status: 'approved' }
      });

    if (!user) return res.status(404).json({ msg: "User not found" });

    // Filter out null products (deleted or unapproved)
    const validWishlistItems = user.wishlist
      .filter(item => item.productId)
      .slice(skip, skip + parseInt(limit));

    const total = user.wishlist.filter(item => item.productId).length;

    res.status(200).json({
      wishlist: validWishlistItems,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("GET WISHLIST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Add to wishlist with enhanced tracking
exports.addToWishlist = async (req, res) => {
  try {
    const { productId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ msg: "Product ID required" });
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product || product.status !== 'approved') {
      return res.status(404).json({ msg: "Product not found or not available" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Check if already in wishlist
    const existingItem = user.wishlist.find(item =>
      item.productId && item.productId.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({ msg: "Product already in wishlist" });
    }

    user.wishlist.push({
      productId,
      addedAt: new Date(),
      notes
    });

    await user.save();

    res.status(200).json({ msg: "Added to wishlist", wishlist: user.wishlist });
  } catch (err) {
    console.error("ADD TO WISHLIST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.wishlist = user.wishlist.filter((item) =>
      item.productId && item.productId.toString() !== productId
    );

    await user.save();
    res.status(200).json({ msg: "Removed from wishlist", wishlist: user.wishlist });
  } catch (err) {
    console.error("REMOVE FROM WISHLIST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Move wishlist item to cart
exports.moveToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;

    // First add to cart
    await exports.addToCart({
      ...req,
      body: { productId, quantity, size, color }
    }, {
      status: () => ({ json: () => { } })
    });

    // Then remove from wishlist
    await exports.removeFromWishlist({
      ...req,
      body: { productId }
    }, res);

  } catch (err) {
    console.error("MOVE TO CART ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get loyalty points with detailed history
exports.getLoyaltyPoints = async (req, res) => {
  try {
    let loyalty = await Loyalty.findOne({ userId: req.userId })
      .populate('transactions.orderId', 'orderNumber totalPrice');

    if (!loyalty) {
      loyalty = await Loyalty.create({ userId: req.userId });
    }

    // Calculate tier benefits
    const tierBenefits = {
      bronze: { discount: 0, pointMultiplier: 1 },
      silver: { discount: 5, pointMultiplier: 1.2 },
      gold: { discount: 10, pointMultiplier: 1.5 },
      platinum: { discount: 15, pointMultiplier: 2 }
    };

    res.status(200).json({
      ...loyalty.toObject(),
      benefits: tierBenefits[loyalty.currentTier],
      pointsToNextTier: Math.max(0, loyalty.nextTierThreshold - loyalty.totalPoints)
    });
  } catch (err) {
    console.error("GET LOYALTY ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user addresses
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('addresses');
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.status(200).json({ addresses: user.addresses || [] });
  } catch (err) {
    console.error("GET ADDRESSES ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Add address
exports.addAddress = async (req, res) => {
  try {
    const { type, name, phone, address, city, state, zipCode, country, isDefault } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // If this is set as default, unset others
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push({
      type: type || 'home',
      name,
      phone,
      address,
      city,
      state,
      zipCode,
      country: country || 'Nepal',
      isDefault: isDefault || user.addresses.length === 0 // First address is default
    });

    await user.save();
    res.status(201).json({ msg: "Address added successfully", addresses: user.addresses });
  } catch (err) {
    console.error("ADD ADDRESS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const updateData = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const address = user.addresses.id(addressId);
    if (!address) return res.status(404).json({ msg: "Address not found" });

    // If setting as default, unset others
    if (updateData.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, updateData);
    await user.save();

    res.status(200).json({ msg: "Address updated successfully", addresses: user.addresses });
  } catch (err) {
    console.error("UPDATE ADDRESS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.addresses.id(addressId).remove();
    await user.save();

    res.status(200).json({ msg: "Address deleted successfully", addresses: user.addresses });
  } catch (err) {
    console.error("DELETE ADDRESS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete user (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Also delete related data
    await Loyalty.deleteOne({ userId: req.params.id });

    res.status(200).json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update user role (Admin)
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["customer", "club", "player", "admin", "vendor"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ msg: "User not found" });

    res.status(200).json({ msg: "User role updated", user });
  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user analytics (Admin)
exports.getUserAnalytics = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: "Admin access required" });
    }

    // User statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          verified: { $sum: { $cond: ['$verified', 1, 0] } }
        }
      }
    ]);

    // Registration trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const registrationTrends = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      userStats,
      registrationTrends,
      totalUsers: await User.countDocuments()
    });
  } catch (err) {
    console.error("GET USER ANALYTICS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
