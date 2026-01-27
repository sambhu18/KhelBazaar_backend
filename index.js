require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/router/authRoutes");
const productsRouter = require("./src/router/productsRouter");
const ordersRouter = require("./src/router/ordersRouter");
const usersRouter = require("./src/router/usersRouter");
const clubPostRouter = require("./src/router/clubPostRouter");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

// FIXED CORS
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// IMPORTANT — Handle preflight
app.use(cors());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);
app.use("/api/club-posts", clubPostRouter);

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

