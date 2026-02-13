const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");

// Create a review
exports.createReview = async (req, res) => {
  try {
    const { productId, rating, title, comment, pros, cons, size, color } = req.body;
    const userId = req.userId;

    if (!productId || !rating) {
      return res.status(400).json({ msg: "Product ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 1 and 5" });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({ msg: "You have already reviewed this product" });
    }

    // Check if user has purchased this product (for verified reviews)
    const order = await Order.findOne({
      userId,
      'items.productId': productId,
      status: 'delivered'
    });

    // Handle image uploads
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push(file.path);
      });
    }

    const review = await Review.create({
      productId,
      userId,
      orderId: order?._id,
      rating,
      title,
      comment,
      pros: pros ? pros.split(',').map(p => p.trim()) : [],
      cons: cons ? cons.split(',').map(c => c.trim()) : [],
      size,
      color,
      images,
      verified: !!order,
      status: 'pending' // Reviews need approval
    });

    // Update product rating
    await updateProductRating(productId);

    res.status(201).json({ msg: "Review submitted successfully", review });
  } catch (err) {
    console.error("CREATE REVIEW ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest', rating } = req.query;

    const filter = { 
      productId, 
      status: 'approved' 
    };

    if (rating) {
      filter.rating = parseInt(rating);
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    if (sort === 'highest') sortObj = { rating: -1, createdAt: -1 };
    if (sort === 'lowest') sortObj = { rating: 1, createdAt: -1 };
    if (sort === 'helpful') sortObj = { helpful: -1, createdAt: -1 };

    const skip = (page - 1) * limit;

    const reviews = await Review.find(filter)
      .populate('userId', 'name avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { productId: productId, status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      ratingDistribution
    });
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const reviews = await Review.find({ userId })
      .populate('productId', 'title images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ userId });

    res.status(200).json({
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("GET USER REVIEWS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update a review
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { rating, title, comment, pros, cons } = req.body;

    const review = await Review.findOne({ _id: id, userId });
    if (!review) {
      return res.status(404).json({ msg: "Review not found or not authorized" });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (pros) review.pros = pros.split(',').map(p => p.trim());
    if (cons) review.cons = cons.split(',').map(c => c.trim());

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = [];
      req.files.forEach((file) => {
        newImages.push(file.path);
      });
      review.images = newImages;
    }

    review.status = 'pending'; // Re-submit for approval
    review.updatedAt = new Date();

    await review.save();

    // Update product rating
    await updateProductRating(review.productId);

    res.status(200).json({ msg: "Review updated successfully", review });
  } catch (err) {
    console.error("UPDATE REVIEW ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const review = await Review.findOne({ _id: id, userId });
    if (!review) {
      return res.status(404).json({ msg: "Review not found or not authorized" });
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(id);

    // Update product rating
    await updateProductRating(productId);

    res.status(200).json({ msg: "Review deleted successfully" });
  } catch (err) {
    console.error("DELETE REVIEW ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Mark review as helpful
exports.markHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndUpdate(
      id,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ msg: "Review not found" });
    }

    res.status(200).json({ msg: "Review marked as helpful", helpful: review.helpful });
  } catch (err) {
    console.error("MARK HELPFUL ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Admin: Get all reviews for moderation
exports.getAllReviews = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const { page = 1, limit = 20, status, rating } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (rating) filter.rating = parseInt(rating);

    const skip = (page - 1) * limit;

    const reviews = await Review.find(filter)
      .populate('userId', 'name email')
      .populate('productId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.status(200).json({
      reviews,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("GET ALL REVIEWS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Admin: Moderate review
exports.moderateReview = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['approved', 'rejected', 'flagged'].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { 
        status,
        moderationReason: reason,
        moderatedAt: new Date(),
        moderatedBy: req.userId
      },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ msg: "Review not found" });
    }

    // Update product rating if approved/rejected
    if (status === 'approved' || status === 'rejected') {
      await updateProductRating(review.productId);
    }

    res.status(200).json({ msg: `Review ${status} successfully`, review });
  } catch (err) {
    console.error("MODERATE REVIEW ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Helper function to update product rating
async function updateProductRating(productId) {
  try {
    const reviews = await Review.find({ 
      productId, 
      status: 'approved' 
    });

    if (reviews.length === 0) {
      await Product.findByIdAndUpdate(productId, {
        averageRating: 0,
        totalReviews: 0
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length
    });
  } catch (err) {
    console.error("UPDATE PRODUCT RATING ERROR:", err);
  }
}

module.exports = {
  createReview: exports.createReview,
  getProductReviews: exports.getProductReviews,
  getUserReviews: exports.getUserReviews,
  updateReview: exports.updateReview,
  deleteReview: exports.deleteReview,
  markHelpful: exports.markHelpful,
  getAllReviews: exports.getAllReviews,
  moderateReview: exports.moderateReview
};