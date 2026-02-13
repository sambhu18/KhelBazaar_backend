const Rental = require("../models/Rental");
const Product = require("../models/Product");
const User = require("../models/User");

// Create a rental booking
exports.createRental = async (req, res) => {
  try {
    const {
      productId,
      startDate,
      endDate,
      deliveryAddress
    } = req.body;
    const userId = req.userId;

    if (!productId || !startDate || !endDate) {
      return res.status(400).json({ msg: "Product ID, start date, and end date are required" });
    }

    // Check if product exists and is rentable
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    if (!product.isRentable) {
      return res.status(400).json({ msg: "This product is not available for rental" });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      return res.status(400).json({ msg: "Start date cannot be in the past" });
    }

    if (end <= start) {
      return res.status(400).json({ msg: "End date must be after start date" });
    }

    // Check availability (no overlapping rentals)
    const overlappingRental = await Rental.findOne({
      productId,
      status: { $in: ['confirmed', 'active'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingRental) {
      return res.status(400).json({ msg: "Product is not available for the selected dates" });
    }

    // Calculate pricing
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const dailyRate = product.rentalPrice.daily;
    const totalAmount = dailyRate * totalDays;
    const deposit = product.rentalDeposit || totalAmount * 0.2; // 20% deposit if not specified

    // Generate rental number
    const rentalNumber = `RNT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const rental = await Rental.create({
      rentalNumber,
      userId,
      productId,
      startDate: start,
      endDate: end,
      dailyRate,
      totalDays,
      totalAmount,
      deposit,
      deliveryAddress,
      status: 'pending'
    });

    await rental.populate('productId', 'title images rentalPrice');
    await rental.populate('userId', 'name email phone');

    res.status(201).json({ 
      msg: "Rental booking created successfully", 
      rental 
    });
  } catch (err) {
    console.error("CREATE RENTAL ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user's rentals
exports.getUserRentals = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { userId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const rentals = await Rental.find(filter)
      .populate('productId', 'title images rentalPrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rental.countDocuments(filter);

    res.status(200).json({
      rentals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("GET USER RENTALS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get single rental details
exports.getRentalById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const rental = await Rental.findById(id)
      .populate('productId', 'title images rentalPrice description')
      .populate('userId', 'name email phone');

    if (!rental) {
      return res.status(404).json({ msg: "Rental not found" });
    }

    // Check if user owns this rental or is admin
    const user = await User.findById(userId);
    if (rental.userId._id.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({ msg: "Not authorized to view this rental" });
    }

    res.status(200).json({ rental });
  } catch (err) {
    console.error("GET RENTAL ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update rental status (Admin only)
exports.updateRentalStatus = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'confirmed', 'active', 'returned', 'overdue', 'cancelled'].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const rental = await Rental.findByIdAndUpdate(
      id,
      { 
        status,
        adminNotes: notes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('productId', 'title').populate('userId', 'name email');

    if (!rental) {
      return res.status(404).json({ msg: "Rental not found" });
    }

    res.status(200).json({ msg: `Rental status updated to ${status}`, rental });
  } catch (err) {
    console.error("UPDATE RENTAL STATUS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Return rental item
exports.returnRental = async (req, res) => {
  try {
    const { id } = req.params;
    const { conditionRating, notes, damageAssessment } = req.body;
    const userId = req.userId;

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({ msg: "Rental not found" });
    }

    // Check if user owns this rental or is admin
    const user = await User.findById(userId);
    if (rental.userId.toString() !== userId && user.role !== 'admin') {
      return res.status(403).json({ msg: "Not authorized" });
    }

    if (rental.status !== 'active') {
      return res.status(400).json({ msg: "Rental is not active" });
    }

    // Handle return images
    const returnImages = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        returnImages.push(file.path);
      });
    }

    // Calculate late fees if applicable
    const now = new Date();
    let lateFee = 0;
    if (now > rental.endDate) {
      const lateDays = Math.ceil((now - rental.endDate) / (1000 * 60 * 60 * 24));
      lateFee = lateDays * rental.dailyRate * 0.5; // 50% of daily rate as late fee
    }

    // Calculate damage fees based on condition
    let damageFee = 0;
    if (conditionRating && conditionRating < 3) {
      damageFee = rental.deposit * 0.5; // 50% of deposit for poor condition
    }

    rental.actualReturnDate = now;
    rental.lateFee = lateFee;
    rental.damageFee = damageFee;
    rental.status = 'returned';
    rental.conditionAtReturn = {
      rating: conditionRating,
      notes,
      images: returnImages,
      damageAssessment
    };

    await rental.save();

    res.status(200).json({ 
      msg: "Rental returned successfully", 
      rental,
      fees: {
        lateFee,
        damageFee,
        refundAmount: rental.deposit - damageFee
      }
    });
  } catch (err) {
    console.error("RETURN RENTAL ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get all rentals (Admin only)
exports.getAllRentals = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const { page = 1, limit = 20, status, overdue } = req.query;

    const filter = {};
    if (status) filter.status = status;
    
    // Filter overdue rentals
    if (overdue === 'true') {
      filter.endDate = { $lt: new Date() };
      filter.status = { $in: ['active', 'confirmed'] };
    }

    const skip = (page - 1) * limit;

    const rentals = await Rental.find(filter)
      .populate('productId', 'title images')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Rental.countDocuments(filter);

    // Get rental statistics
    const stats = await Rental.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.status(200).json({
      rentals,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      stats
    });
  } catch (err) {
    console.error("GET ALL RENTALS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Check product availability for rental
exports.checkAvailability = async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ msg: "Start date and end date are required" });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isRentable) {
      return res.status(404).json({ msg: "Product not found or not rentable" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for overlapping rentals
    const overlappingRentals = await Rental.find({
      productId,
      status: { $in: ['confirmed', 'active'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    const isAvailable = overlappingRentals.length === 0;

    // Calculate pricing
    let pricing = null;
    if (isAvailable) {
      const diffTime = Math.abs(end - start);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const dailyRate = product.rentalPrice.daily;
      const totalAmount = dailyRate * totalDays;
      const deposit = product.rentalDeposit || totalAmount * 0.2;

      pricing = {
        dailyRate,
        totalDays,
        totalAmount,
        deposit
      };
    }

    res.status(200).json({
      available: isAvailable,
      pricing,
      conflictingRentals: overlappingRentals.length
    });
  } catch (err) {
    console.error("CHECK AVAILABILITY ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Cancel rental
exports.cancelRental = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userId;

    const rental = await Rental.findById(id);
    if (!rental) {
      return res.status(404).json({ msg: "Rental not found" });
    }

    // Check if user owns this rental
    if (rental.userId.toString() !== userId) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    if (!['pending', 'confirmed'].includes(rental.status)) {
      return res.status(400).json({ msg: "Cannot cancel rental in current status" });
    }

    rental.status = 'cancelled';
    rental.notes = reason;
    rental.updatedAt = new Date();

    await rental.save();

    res.status(200).json({ msg: "Rental cancelled successfully", rental });
  } catch (err) {
    console.error("CANCEL RENTAL ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

module.exports = {
  createRental: exports.createRental,
  getUserRentals: exports.getUserRentals,
  getRentalById: exports.getRentalById,
  updateRentalStatus: exports.updateRentalStatus,
  returnRental: exports.returnRental,
  getAllRentals: exports.getAllRentals,
  checkAvailability: exports.checkAvailability,
  cancelRental: exports.cancelRental
};