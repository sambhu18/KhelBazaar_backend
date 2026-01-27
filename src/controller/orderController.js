const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Loyalty = require("../models/Loyalty");

// Generate unique order number
const generateOrderNumber = () => {
  return "ORD-" + Date.now() + Math.floor(Math.random() * 1000);
};

// Get all orders (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email phone")
      .populate("items.productId")
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    console.error("GET ORDERS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId })
      .populate("items.productId")
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    console.error("GET USER ORDERS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "name email phone")
      .populate("items.productId");
    if (!order) return res.status(404).json({ msg: "Order not found" });
    res.status(200).json(order);
  } catch (err) {
    console.error("GET ORDER ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Create order
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ msg: "Cart is empty" });
    }

    let totalPrice = 0;
    const orderItems = [];

    // Calculate total and verify products
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ msg: `Product ${item.productId} not found` });
      }

      const itemTotal = product.price * item.quantity;
      totalPrice += itemTotal;

      orderItems.push({
        productId: product._id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0] || "",
        size: item.size,
        customization: item.customization,
      });
    }

    const order = await Order.create({
      userId: req.userId,
      orderNumber: generateOrderNumber(),
      items: orderItems,
      totalPrice,
      shippingAddress,
      paymentMethod,
      status: "pending",
      paymentStatus: "pending",
    });

    res.status(201).json({ msg: "Order created successfully", order });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update order status (Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!order) return res.status(404).json({ msg: "Order not found" });

    res.status(200).json({ msg: "Order updated successfully", order });
  } catch (err) {
    console.error("UPDATE ORDER ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update payment status (Admin/Webhook)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, transactionId } = req.body;

    if (!["pending", "completed", "failed"].includes(paymentStatus)) {
      return res.status(400).json({ msg: "Invalid payment status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus, transactionId, updatedAt: new Date() },
      { new: true }
    );

    if (!order) return res.status(404).json({ msg: "Order not found" });

    // Award loyalty points if payment completed
    if (paymentStatus === "completed") {
      const loyaltyPoints = Math.floor(order.totalPrice / 10); // 1 point per 10 currency units
      let loyalty = await Loyalty.findOne({ userId: order.userId });

      if (!loyalty) {
        loyalty = await Loyalty.create({
          userId: order.userId,
          totalPoints: loyaltyPoints,
        });
      } else {
        loyalty.totalPoints += loyaltyPoints;
        loyalty.transactions.push({
          type: "earned",
          points: loyaltyPoints,
          orderId: order._id,
          description: `Earned from order ${order.orderNumber}`,
        });
        await loyalty.save();
      }

      order.loyaltyPointsEarned = loyaltyPoints;
      await order.save();
    }

    res.status(200).json({ msg: "Payment updated successfully", order });
  } catch (err) {
    console.error("UPDATE PAYMENT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete order (Admin)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ msg: "Order not found" });

    res.status(200).json({ msg: "Order deleted successfully" });
  } catch (err) {
    console.error("DELETE ORDER ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
