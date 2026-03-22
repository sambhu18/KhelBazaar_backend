const crypto = require("crypto");
const axios = require("axios");
const Order = require("../models/Order");
const Loyalty = require("../models/Loyalty");

// ──────────────────────────────────────────────────────────────────────────────
// eSewa ePay v2 Config
// ──────────────────────────────────────────────────────────────────────────────
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";

// Test URL:       https://rc-epay.esewa.com.np/api/epay/main/v2/form
// Production URL: https://epay.esewa.com.np/api/epay/main/v2/form
const ESEWA_PAYMENT_URL =
  process.env.ESEWA_PAYMENT_URL ||
  "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

// Test status:       https://rc.esewa.com.np/api/epay/transaction/status/
// Production status: https://esewa.com.np/api/epay/transaction/status/
const ESEWA_STATUS_URL =
  process.env.ESEWA_STATUS_URL ||
  "https://rc.esewa.com.np/api/epay/transaction/status/";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ──────────────────────────────────────────────────────────────────────────────
// HMAC-SHA256 Signature Generator
// Message format: "total_amount=X,transaction_uuid=Y,product_code=Z"
// ──────────────────────────────────────────────────────────────────────────────
const generateSignature = (totalAmount, transactionUuid, productCode) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const hmac = crypto.createHmac("sha256", ESEWA_SECRET_KEY);
  hmac.update(message);
  return hmac.digest("base64");
};

// ──────────────────────────────────────────────────────────────────────────────
// INITIATE PAYMENT
// POST /api/esewa/initiate
// Frontend calls this to get the signed params, then auto-submits a form to eSewa
// ──────────────────────────────────────────────────────────────────────────────
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ msg: "orderId is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.paymentStatus === "completed") {
      return res.status(400).json({ msg: "Order is already paid" });
    }

    // Use orderNumber as transaction_uuid (alphanumeric + hyphen only)
    const transactionUuid = order.orderNumber;
    const totalAmount = order.totalPrice;

    const signature = generateSignature(totalAmount, transactionUuid, ESEWA_PRODUCT_CODE);

    // Save the transaction UUID so we can verify it later
    order.transactionId = transactionUuid;
    await order.save();

    return res.status(200).json({
      paymentUrl: ESEWA_PAYMENT_URL,
      params: {
        amount: String(totalAmount),
        tax_amount: "0",
        total_amount: String(totalAmount),
        transaction_uuid: transactionUuid,
        product_code: ESEWA_PRODUCT_CODE,
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: `${FRONTEND_URL}/payment-success`,
        failure_url: `${FRONTEND_URL}/payment-failure`,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
      },
    });
  } catch (err) {
    console.error("ESEWA INITIATE ERROR:", err);
    return res.status(500).json({ msg: "Server error initiating eSewa payment" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// VERIFY PAYMENT
// POST /api/esewa/verify
// Called by frontend after eSewa redirects to success_url with ?data=<base64>
// Body: { encodedData: "<base64 string from URL>" }
// ──────────────────────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { encodedData } = req.body;

    if (!encodedData) {
      return res.status(400).json({ msg: "encodedData is required" });
    }

    // Decode the base64 response eSewa appends to success_url
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf8"));
    } catch {
      return res.status(400).json({ msg: "Invalid encoded data from eSewa" });
    }

    const {
      transaction_code,
      status,
      total_amount,
      transaction_uuid,
      signed_field_names,
      signature: receivedSignature,
    } = decoded;

    // Step 1: Verify HMAC signature integrity
    const fields = signed_field_names.split(",");
    const signatureMessage = fields.map((f) => `${f}=${decoded[f]}`).join(",");
    const hmac = crypto.createHmac("sha256", ESEWA_SECRET_KEY);
    hmac.update(signatureMessage);
    const expectedSignature = hmac.digest("base64");

    if (receivedSignature !== expectedSignature) {
      return res.status(400).json({ msg: "Signature mismatch. Payment could not be verified." });
    }

    // Step 2: Double-check with eSewa Status API
    let statusData;
    try {
      const statusRes = await axios.get(ESEWA_STATUS_URL, {
        params: {
          product_code: ESEWA_PRODUCT_CODE,
          total_amount: total_amount,
          transaction_uuid: transaction_uuid,
        },
      });
      statusData = statusRes.data;
    } catch (err) {
      console.error("eSewa status API error:", err.message);
      return res.status(502).json({ msg: "Could not verify payment with eSewa API" });
    }

    if (statusData.status !== "COMPLETE") {
      return res.status(400).json({
        msg: `Payment not complete. eSewa status: ${statusData.status}`,
        esewaStatus: statusData.status,
      });
    }

    // Step 3: Find and update our order
    const order = await Order.findOne({ orderNumber: transaction_uuid });
    if (!order) {
      return res.status(404).json({ msg: "Order not found for this transaction" });
    }

    // Idempotent guard
    if (order.paymentStatus === "completed") {
      return res.status(200).json({ msg: "Payment already recorded", order });
    }

    order.paymentStatus = "completed";
    order.transactionId = transaction_code;
    order.esewaTransactionCode = transaction_code;
    order.status = "confirmed";
    order.updatedAt = new Date();
    await order.save();

    // Step 4: Award loyalty points (1 pt per 10 NPR)
    const loyaltyPoints = Math.floor(order.totalPrice / 10);
    let loyalty = await Loyalty.findOne({ userId: order.userId });
    if (!loyalty) {
      await Loyalty.create({
        userId: order.userId,
        totalPoints: loyaltyPoints,
        transactions: [{
          type: "earned",
          points: loyaltyPoints,
          orderId: order._id,
          description: `Earned from eSewa payment for order ${order.orderNumber}`,
        }],
      });
    } else {
      loyalty.totalPoints += loyaltyPoints;
      loyalty.transactions.push({
        type: "earned",
        points: loyaltyPoints,
        orderId: order._id,
        description: `Earned from eSewa payment for order ${order.orderNumber}`,
      });
      await loyalty.save();
    }

    return res.status(200).json({
      msg: "Payment verified and order confirmed",
      order: {
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
        paymentStatus: order.paymentStatus,
        status: order.status,
        transactionId: order.transactionId,
      },
    });
  } catch (err) {
    console.error("ESEWA VERIFY ERROR:", err);
    return res.status(500).json({ msg: "Server error verifying payment" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// STATUS CHECK (admin / debug)
// GET /api/esewa/status/:orderNumber
// ──────────────────────────────────────────────────────────────────────────────
exports.statusCheck = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });

    if (!order) {
      return res.status(404).json({ msg: "Order not found" });
    }

    let esewaStatus = null;
    try {
      const statusRes = await axios.get(ESEWA_STATUS_URL, {
        params: {
          product_code: ESEWA_PRODUCT_CODE,
          total_amount: order.totalPrice,
          transaction_uuid: order.orderNumber,
        },
      });
      esewaStatus = statusRes.data;
    } catch (_) {
      // Silently ignore if eSewa unreachable
    }

    return res.status(200).json({
      orderNumber: order.orderNumber,
      localStatus: order.paymentStatus,
      esewaStatus,
    });
  } catch (err) {
    console.error("ESEWA STATUS CHECK ERROR:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};
