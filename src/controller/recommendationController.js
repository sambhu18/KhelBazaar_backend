const Recommendation = require("../models/Recommendation");
const Product = require("../models/Product");
const User = require("../models/User");
const Order = require("../models/Order");

// Generate personalized recommendations for a user
exports.generateRecommendations = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Clear old recommendations
    await Recommendation.deleteMany({ userId, expiresAt: { $lt: new Date() } });

    const recommendations = [];

    // 1. Based on viewed products (similar categories)
    if (user.behavior?.viewedProducts?.length > 0) {
      const recentViews = user.behavior.viewedProducts.slice(-10);
      const viewedProductIds = recentViews.map(v => v.productId);
      
      const viewedProducts = await Product.find({ 
        _id: { $in: viewedProductIds },
        status: 'approved'
      });
      
      const categories = [...new Set(viewedProducts.flatMap(p => p.categories))];
      
      const similarProducts = await Product.find({
        _id: { $nin: viewedProductIds },
        categories: { $in: categories },
        status: 'approved'
      }).limit(5);

      for (const product of similarProducts) {
        recommendations.push({
          userId,
          productId: product._id,
          type: 'viewed_similar',
          reason: `Because you viewed ${viewedProducts.find(p => p.categories.some(c => product.categories.includes(c)))?.title || 'similar products'}`,
          score: 0.8,
          confidence: 0.7,
          basedOnProducts: viewedProductIds.slice(0, 3)
        });
      }
    }

    // 2. Based on purchase history
    const orders = await Order.find({ userId, status: 'delivered' }).limit(5);
    if (orders.length > 0) {
      const purchasedProductIds = orders.flatMap(o => o.items.map(i => i.productId));
      const purchasedProducts = await Product.find({ 
        _id: { $in: purchasedProductIds },
        status: 'approved'
      });
      
      const purchasedCategories = [...new Set(purchasedProducts.flatMap(p => p.categories))];
      
      const relatedProducts = await Product.find({
        _id: { $nin: purchasedProductIds },
        categories: { $in: purchasedCategories },
        status: 'approved'
      }).limit(3);

      for (const product of relatedProducts) {
        recommendations.push({
          userId,
          productId: product._id,
          type: 'category_match',
          reason: `Based on your previous purchases in ${product.categories[0]}`,
          score: 0.9,
          confidence: 0.8,
          basedOnCategories: purchasedCategories.slice(0, 2)
        });
      }
    }

    // 3. Trending products in user's area/preferences
    const trendingProducts = await Product.find({
      status: 'approved',
      trending: true,
      categories: { $in: user.behavior?.categoryInterests?.map(c => c.category) || [] }
    }).limit(3);

    for (const product of trendingProducts) {
      recommendations.push({
        userId,
        productId: product._id,
        type: 'trending_local',
        reason: 'Trending among sports fans in your area',
        score: 0.7,
        confidence: 0.6,
        location: user.city || 'your area'
      });
    }

    // 4. Price range based recommendations
    if (orders.length > 0) {
      const avgOrderValue = orders.reduce((sum, o) => sum + o.totalPrice, 0) / orders.length;
      const priceRange = {
        min: avgOrderValue * 0.7,
        max: avgOrderValue * 1.3
      };

      const priceMatchProducts = await Product.find({
        status: 'approved',
        price: { $gte: priceRange.min, $lte: priceRange.max }
      }).limit(3);

      for (const product of priceMatchProducts) {
        recommendations.push({
          userId,
          productId: product._id,
          type: 'price_range',
          reason: `Matches your typical spending range (NPR ${Math.round(priceRange.min)} - ${Math.round(priceRange.max)})`,
          score: 0.6,
          confidence: 0.5
        });
      }
    }

    // 5. New arrivals in interested categories
    const newArrivals = await Product.find({
      status: 'approved',
      newArrival: true,
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } // Last 2 weeks
    }).limit(3);

    for (const product of newArrivals) {
      recommendations.push({
        userId,
        productId: product._id,
        type: 'new_arrival',
        reason: 'New arrival this week',
        score: 0.5,
        confidence: 0.4
      });
    }

    // Save recommendations to database
    if (recommendations.length > 0) {
      await Recommendation.insertMany(recommendations);
    }

    // Get saved recommendations with product details
    const savedRecommendations = await Recommendation.find({ userId, active: true })
      .populate('productId', 'title price images averageRating')
      .sort({ score: -1 })
      .limit(20);

    res.status(200).json({
      msg: "Recommendations generated successfully",
      recommendations: savedRecommendations,
      count: savedRecommendations.length
    });
  } catch (err) {
    console.error("GENERATE RECOMMENDATIONS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get user's recommendations
exports.getUserRecommendations = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, limit = 10 } = req.query;

    const filter = { userId, active: true };
    if (type) filter.type = type;

    const recommendations = await Recommendation.find(filter)
      .populate('productId', 'title price images averageRating categories')
      .sort({ score: -1 })
      .limit(parseInt(limit));

    res.status(200).json({ recommendations });
  } catch (err) {
    console.error("GET RECOMMENDATIONS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Track recommendation interaction
exports.trackRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'shown', 'clicked', 'purchased'

    if (!['shown', 'clicked', 'purchased'].includes(action)) {
      return res.status(400).json({ msg: "Invalid action" });
    }

    const updateField = {};
    updateField[action] = 1;

    const recommendation = await Recommendation.findByIdAndUpdate(
      id,
      { $inc: updateField },
      { new: true }
    );

    if (!recommendation) {
      return res.status(404).json({ msg: "Recommendation not found" });
    }

    res.status(200).json({ msg: `Recommendation ${action} tracked`, recommendation });
  } catch (err) {
    console.error("TRACK RECOMMENDATION ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get recommendation analytics (Admin)
exports.getRecommendationAnalytics = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: "Admin access required" });
    }

    // Performance by type
    const performanceByType = await Recommendation.aggregate([
      {
        $group: {
          _id: '$type',
          totalShown: { $sum: '$shown' },
          totalClicked: { $sum: '$clicked' },
          totalPurchased: { $sum: '$purchased' },
          avgScore: { $avg: '$score' },
          count: { $sum: 1 }
        }
      },
      {
        $addFields: {
          clickRate: { 
            $cond: [
              { $eq: ['$totalShown', 0] },
              0,
              { $divide: ['$totalClicked', '$totalShown'] }
            ]
          },
          conversionRate: {
            $cond: [
              { $eq: ['$totalClicked', 0] },
              0,
              { $divide: ['$totalPurchased', '$totalClicked'] }
            ]
          }
        }
      }
    ]);

    // Top performing products
    const topProducts = await Recommendation.aggregate([
      {
        $group: {
          _id: '$productId',
          totalShown: { $sum: '$shown' },
          totalClicked: { $sum: '$clicked' },
          totalPurchased: { $sum: '$purchased' },
          avgScore: { $avg: '$score' }
        }
      },
      { $sort: { totalPurchased: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      }
    ]);

    // Overall stats
    const overallStats = await Recommendation.aggregate([
      {
        $group: {
          _id: null,
          totalRecommendations: { $sum: 1 },
          totalShown: { $sum: '$shown' },
          totalClicked: { $sum: '$clicked' },
          totalPurchased: { $sum: '$purchased' },
          avgScore: { $avg: '$score' }
        }
      }
    ]);

    res.status(200).json({
      performanceByType,
      topProducts,
      overallStats: overallStats[0] || {}
    });
  } catch (err) {
    console.error("GET ANALYTICS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Generate recommendations for all users (Admin/Cron job)
exports.generateBulkRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: "Admin access required" });
    }

    const users = await User.find({ role: 'customer' }).limit(100);
    let processedCount = 0;

    for (const targetUser of users) {
      try {
        // Clear old recommendations
        await Recommendation.deleteMany({ 
          userId: targetUser._id, 
          expiresAt: { $lt: new Date() } 
        });

        // Generate new recommendations (simplified version)
        const recommendations = [];

        // Trending products
        const trendingProducts = await Product.find({
          status: 'approved',
          trending: true
        }).limit(3);

        for (const product of trendingProducts) {
          recommendations.push({
            userId: targetUser._id,
            productId: product._id,
            type: 'trending_local',
            reason: 'Trending among sports fans',
            score: 0.7,
            confidence: 0.6
          });
        }

        // New arrivals
        const newArrivals = await Product.find({
          status: 'approved',
          newArrival: true,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }).limit(2);

        for (const product of newArrivals) {
          recommendations.push({
            userId: targetUser._id,
            productId: product._id,
            type: 'new_arrival',
            reason: 'New arrival this week',
            score: 0.5,
            confidence: 0.4
          });
        }

        if (recommendations.length > 0) {
          await Recommendation.insertMany(recommendations);
          processedCount++;
        }
      } catch (err) {
        console.error(`Error processing user ${targetUser._id}:`, err);
      }
    }

    res.status(200).json({
      msg: "Bulk recommendations generated successfully",
      processedUsers: processedCount,
      totalUsers: users.length
    });
  } catch (err) {
    console.error("BULK RECOMMENDATIONS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

module.exports = {
  generateRecommendations: exports.generateRecommendations,
  getUserRecommendations: exports.getUserRecommendations,
  trackRecommendation: exports.trackRecommendation,
  getRecommendationAnalytics: exports.getRecommendationAnalytics,
  generateBulkRecommendations: exports.generateBulkRecommendations
};