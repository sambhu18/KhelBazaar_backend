const User = require("../models/User");
const Loyalty = require("../models/Loyalty");

// Get all users (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
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
    res.status(200).json(user);
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address, city, zipCode, country, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        name,
        phone,
        address,
        city,
        zipCode,
        country,
        avatar,
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    res.status(200).json({ msg: "Profile updated successfully", user });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user cart
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("cart.productId");
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Calculate totals
    const cartItems = user.cart.map((item) => ({
      productId: item.productId._id,
      title: item.productId.title,
      price: item.productId.price,
      quantity: item.quantity,
      size: item.size,
      customization: item.customization,
      image: item.productId.images[0],
      subtotal: item.productId.price * item.quantity,
    }));

    const totalPrice = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

    res.status(200).json({ cartItems, totalPrice });
  } catch (err) {
    console.error("GET CART ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity, size, customization } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ msg: "Invalid product or quantity" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Check if item with same ID AND size AND customization exists
    const existingItemIndex = user.cart.findIndex((item) => {
      const sameProduct = item.productId.toString() === productId;
      const sameSize = item.size === size;

      // To strictly match objects:
      const itemCustomName = item.customization?.name || "";
      const itemCustomNumber = item.customization?.number || "";
      const reqCustomName = customization?.name || "";
      const reqCustomNumber = customization?.number || "";

      return sameProduct && sameSize && (itemCustomName === reqCustomName && itemCustomNumber === reqCustomNumber);
    });

    if (existingItemIndex > -1) {
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      user.cart.push({
        productId,
        quantity,
        size,
        customization: customization ? { name: customization.name, number: customization.number } : undefined
      });
    }

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
    const { productId, size, customization } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Remove specific product variant (ID + Size + Customization)
    user.cart = user.cart.filter((item) => {
      const sameProduct = item.productId.toString() === productId;
      const sameSize = item.size === size;

      const itemCustomName = item.customization?.name || "";
      const itemCustomNumber = item.customization?.number || "";
      const reqCustomName = customization?.name || "";
      const reqCustomNumber = customization?.number || "";

      const sameCustomization = itemCustomName === reqCustomName && itemCustomNumber === reqCustomNumber;

      return !(sameProduct && sameSize && sameCustomization);
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
    const { productId, quantity, size, customization } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ msg: "Invalid product or quantity" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const cartItem = user.cart.find((item) => {
      const sameProduct = item.productId.toString() === productId;
      const sameSize = item.size === size;

      const itemCustomName = item.customization?.name || "";
      const itemCustomNumber = item.customization?.number || "";
      const reqCustomName = customization?.name || "";
      const reqCustomNumber = customization?.number || "";

      return sameProduct && sameSize && (itemCustomName === reqCustomName && itemCustomNumber === reqCustomNumber);
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

// Get wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("wishlist");
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.status(200).json(user.wishlist);
  } catch (err) {
    console.error("GET WISHLIST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Add to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ msg: "Product ID required" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ msg: "Product already in wishlist" });
    }

    user.wishlist.push(productId);
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

    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    await user.save();

    res.status(200).json({ msg: "Removed from wishlist", wishlist: user.wishlist });
  } catch (err) {
    console.error("REMOVE FROM WISHLIST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get loyalty points
exports.getLoyaltyPoints = async (req, res) => {
  try {
    let loyalty = await Loyalty.findOne({ userId: req.userId });

    if (!loyalty) {
      loyalty = await Loyalty.create({ userId: req.userId });
    }

    res.status(200).json(loyalty);
  } catch (err) {
    console.error("GET LOYALTY ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete user (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

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

    if (!["customer", "club", "player", "admin"].includes(role)) {
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
