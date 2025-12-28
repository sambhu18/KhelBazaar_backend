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
        enum: ['customer', 'club', 'player', 'admin'],
        default: 'customer'
    },
    verified: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model("User", userSchema);