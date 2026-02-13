const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            req.userId = decoded.id;
            next();
        } catch (err) {
            return res.status(401).json({ msg: "Not authorized, token failed" });
        }
    }
    if (!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }
};

// Alternative name for the same function (used in new routers)
const verifyToken = protect;

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ msg: "Not authorized for this action" });
        }
        next();
    };
};

// Optional auth middleware (doesn't require token)
const optionalAuth = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            req.userId = decoded.id;
        } catch (err) {
            // Continue without authentication
        }
    }
    next();
};

module.exports = { protect, verifyToken, authorizeRoles, optionalAuth };