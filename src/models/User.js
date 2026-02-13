const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['customer', 'club', 'player', 'admin', 'vendor'],
        default: 'customer'
    },
    verified: {
        type: Boolean,
        default: false
    },

    // Enhanced Profile
    profile: {
        bio: String,
        dateOfBirth: Date,
        gender: { type: String, enum: ['male', 'female', 'other'] },
        favoriteTeams: [String],
        favoriteSports: [String],
        playerPosition: String, // for players
        experienceLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'professional'] },
        socialLinks: {
            instagram: String,
            twitter: String,
            facebook: String
        }
    },

    // Shopping Preferences
    preferences: {
        language: { type: String, default: 'en', enum: ['en', 'ne'] },
        currency: { type: String, default: 'NPR' },
        sizePreferences: {
            clothing: String, // S, M, L, XL
            shoes: String // 40, 41, 42, etc.
        },
        brandPreferences: [String],
        priceRange: {
            min: Number,
            max: Number
        },
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true },
            marketing: { type: Boolean, default: false }
        }
    },

    // Shopping Behavior (for recommendations)
    behavior: {
        viewedProducts: [{
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            viewedAt: { type: Date, default: Date.now },
            timeSpent: Number // seconds
        }],
        searchHistory: [{
            query: String,
            searchedAt: { type: Date, default: Date.now }
        }],
        categoryInterests: [{
            category: String,
            score: { type: Number, default: 1 }
        }]
    },

    cart: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, default: 1 },
            size: { type: String },
            color: String,
            customization: {
                name: String,
                number: String,
                additionalText: String
            },
            addedAt: { type: Date, default: Date.now }
        }
    ],

    wishlist: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            addedAt: { type: Date, default: Date.now },
            notes: String
        }
    ],

    // Addresses
    addresses: [{
        type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
        name: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'Nepal' },
        isDefault: { type: Boolean, default: false }
    }],

    // Legacy fields (for backward compatibility)
    avatar: String,
    phone: String,
    address: String,
    city: String,
    zipCode: String,
    country: String,

    // Security
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // Vendor specific fields
    vendorInfo: {
        businessName: String,
        businessType: String,
        taxId: String,
        bankDetails: {
            accountName: String,
            accountNumber: String,
            bankName: String,
            routingNumber: String
        },
        approved: { type: Boolean, default: false },
        approvedAt: Date
    },

    // Analytics
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'vendorInfo.approved': 1 });
userSchema.index({ verified: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', function () {
    this.updatedAt = new Date();

    // Ensure only one default address
    if (this.addresses && this.addresses.length > 0) {
        const defaultAddresses = this.addresses.filter(addr => addr.isDefault);
        if (defaultAddresses.length > 1) {
            // Keep only the first default, set others to false
            this.addresses.forEach((addr, index) => {
                if (index > 0 && addr.isDefault) {
                    addr.isDefault = false;
                }
            });
        }
    }
});

module.exports = mongoose.model("User", userSchema);