const ClubPost = require("../models/ClubPost");
const Club = require("../models/Club");
const User = require("../models/User");

// Get all club posts (with filters)
exports.getAllPosts = async (req, res) => {
  try {
    const { category, postType, clubId, status, sort } = req.query;
    let filter = {};

    if (category) filter.category = category;
    if (postType) filter.postType = postType;
    if (clubId) filter.clubId = clubId;
    if (status) filter.status = status;
    else filter.status = "active"; // Default to active

    let sortOption = { createdAt: -1 };
    if (sort === "likes") sortOption = { likes: -1, createdAt: -1 };

    const posts = await ClubPost.find(filter)
      .populate("clubId", "name logo")
      .populate("createdBy", "name avatar")
      .sort(sortOption);

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

// Create post (Club/Admin/Any logged-in user for community)
exports.createPost = async (req, res) => {
  try {
    const { clubId, title, description, category, price, quantity, tags, specifications, postType } = req.body;

    if (!title || !category) {
      return res.status(400).json({ msg: "Missing required fields: title, category" });
    }

    if (clubId) {
      const club = await Club.findById(clubId);
      if (!club) return res.status(404).json({ msg: "Club not found" });

      const user = await User.findById(req.userId);
      if (user.role !== "admin" && user.role !== "club") {
        return res.status(403).json({ msg: "Only club members and admins can post for a club" });
      }
    }

    // Extract image URLs from multer/Cloudinary uploaded files
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => file.path || file.secure_url || file.url);
    }

    // Parse tags if it's a string
    let parsedTags = tags || [];
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Parse specifications if it's a string
    let parsedSpecs = specifications || {};
    if (typeof specifications === 'string') {
      try { parsedSpecs = JSON.parse(specifications); } catch (e) { parsedSpecs = {}; }
    }

    const post = await ClubPost.create({
      clubId: clubId || undefined,
      createdBy: req.userId,
      postType: postType || "announcement",
      title,
      description,
      category,
      price: price || 0,
      quantity: quantity || 1,
      images: imageUrls,
      tags: parsedTags,
      specifications: parsedSpecs,
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

    const { title, description, category, price, quantity, tags, specifications, status, postType } = req.body;

    if (title) post.title = title;
    if (description) post.description = description;
    if (category) post.category = category;
    if (postType) post.postType = postType;
    if (price !== undefined) post.price = price;
    if (quantity !== undefined) post.quantity = quantity;
    if (status) post.status = status;

    // Handle image uploads from multer/Cloudinary
    if (req.files && req.files.length > 0) {
      const newImageUrls = req.files.map(file => file.path || file.secure_url || file.url);
      post.images = [...post.images, ...newImageUrls];
    }

    // Parse tags if string
    if (tags) {
      post.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags;
    }

    // Parse specifications if string
    if (specifications) {
      if (typeof specifications === 'string') {
        try { post.specifications = JSON.parse(specifications); } catch (e) {}
      } else {
        post.specifications = specifications;
      }
    }

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
