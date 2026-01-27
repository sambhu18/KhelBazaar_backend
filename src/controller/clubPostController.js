const ClubPost = require("../models/ClubPost");
const Club = require("../models/Club");
const User = require("../models/User");

// Get all club posts (with filters)
exports.getAllPosts = async (req, res) => {
  try {
    const { category, postType, clubId, status } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (postType) filter.postType = postType;
    if (clubId) filter.clubId = clubId;
    if (status) filter.status = status;
    else filter.status = "active"; // Default to active

    const posts = await ClubPost.find(filter)
      .populate("clubId", "name logo")
      .populate("createdBy", "name avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get single post
exports.getPostById = async (req, res) => {
  try {
    const post = await ClubPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("clubId", "name logo")
      .populate("createdBy", "name avatar")
      .populate("comments.userId", "name avatar");

    if (!post) return res.status(404).json({ msg: "Post not found" });

    res.status(200).json(post);
  } catch (err) {
    console.error("GET POST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Create post (Club/Admin)
exports.createPost = async (req, res) => {
  try {
    const { clubId, title, description, category, price, quantity, images, tags, specifications } = req.body;

    if (!title || !category || !clubId) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // Verify user is part of the club or is admin
    const user = await User.findById(req.userId);
    const club = await Club.findById(clubId);

    if (!club) return res.status(404).json({ msg: "Club not found" });
    if (user.role !== "admin" && user.role !== "club") {
      return res.status(403).json({ msg: "Only club members and admins can post" });
    }

    const post = await ClubPost.create({
      clubId,
      createdBy: req.userId,
      title,
      description,
      category,
      price: price || 0,
      quantity: quantity || 1,
      images: images || [],
      tags: tags || [],
      specifications: specifications || {},
      status: "active",
    });

    const populatedPost = await ClubPost.findById(post._id)
      .populate("clubId", "name logo")
      .populate("createdBy", "name avatar");

    res.status(201).json({ msg: "Post created successfully", post: populatedPost });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Update post (Owner/Admin)
exports.updatePost = async (req, res) => {
  try {
    const post = await ClubPost.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: "Post not found" });

    // Check if user is owner or admin
    const user = await User.findById(req.userId);
    if (post.createdBy.toString() !== req.userId && user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized to update this post" });
    }

    const { title, description, category, price, quantity, images, tags, specifications, status } = req.body;

    if (title) post.title = title;
    if (description) post.description = description;
    if (category) post.category = category;
    if (price !== undefined) post.price = price;
    if (quantity !== undefined) post.quantity = quantity;
    if (images) post.images = images;
    if (tags) post.tags = tags;
    if (specifications) post.specifications = specifications;
    if (status) post.status = status;

    post.updatedAt = new Date();
    await post.save();

    const updatedPost = await ClubPost.findById(post._id)
      .populate("clubId", "name logo")
      .populate("createdBy", "name avatar");

    res.status(200).json({ msg: "Post updated successfully", post: updatedPost });
  } catch (err) {
    console.error("UPDATE POST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Delete post (Owner/Admin)
exports.deletePost = async (req, res) => {
  try {
    const post = await ClubPost.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: "Post not found" });

    // Check if user is owner or admin
    const user = await User.findById(req.userId);
    if (post.createdBy.toString() !== req.userId && user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized to delete this post" });
    }

    await ClubPost.findByIdAndDelete(req.params.id);

    res.status(200).json({ msg: "Post deleted successfully" });
  } catch (err) {
    console.error("DELETE POST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Like post
exports.likePost = async (req, res) => {
  try {
    const post = await ClubPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!post) return res.status(404).json({ msg: "Post not found" });

    res.status(200).json({ msg: "Post liked", post });
  } catch (err) {
    console.error("LIKE POST ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Comment on post
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ msg: "Comment text required" });
    }

    const post = await ClubPost.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            userId: req.userId,
            text,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate("comments.userId", "name avatar");

    if (!post) return res.status(404).json({ msg: "Post not found" });

    res.status(200).json({ msg: "Comment added", post });
  } catch (err) {
    console.error("ADD COMMENT ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// Get posts by club
exports.getPostsByClub = async (req, res) => {
  try {
    const posts = await ClubPost.find({ clubId: req.params.clubId, status: "active" })
      .populate("clubId", "name logo")
      .populate("createdBy", "name avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    console.error("GET CLUB POSTS ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
