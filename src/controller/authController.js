const User = require("../models/User");
const { hashPassword, comparePassword } = require("../utils/hashPassword");
const generateToken = require("../utils/generateToken");
const sendVerificationEmail = require("../utils/VerificationMailer");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
const crypto = require("crypto");
const sendPasswordResetEmail = require("../utils/PasswordResetMailer");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//this is Signup page
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Please fill in all fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already exists" });
    }

    const hashed = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || 'customer'
    });

    const token = generateToken(user._id);

    try {
      await sendVerificationEmail(email, token);
    } catch (mailErr) {
      console.error("VERIFICATION EMAIL FAILED:", mailErr);
      return res.status(201).json({
        msg: "Signup successful, but verification email could not be sent. Please check your email settings.",
        user: { id: user._id, name: user.name, email: user.email },
        mailError: mailErr.message
      });
    }

    res.status(201).json({ msg: "Signup successful", user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      msg: "Server configuration error during registration",
      error: err.message
    });
  }
};
//this is Login page
exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("LOGIN ATTEMPT:", email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log("LOGIN FAILED: User not found");
      return res.status(400).json({ msg: "User not found" });
    }
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      console.log("LOGIN FAILED: Invalid Password");
      return res.status(400).json({ msg: "Invalid Password" });
    }
    if (!user.verified) {
      console.log("LOGIN FAILED: Email not verified");
      return res.status(400).json({ msg: "Please verify your email first" });
    }
    const token = generateToken(user._id);
    console.log("LOGIN SUCCESS:", email, "Role:", user.role);
    res.status(201).json({ msg: "Login Sucessful", token, role: user.role, userId: user._id });
  }
  catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err });
  }
}
exports.Verify = async (req, res) => {
  try {
    const data = jwt.verify(req.params.token, process.env.JWT_SECRET);

    await User.findByIdAndUpdate(data.id, { verified: true });

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified</title>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #ffffff; /* plain white background */
            margin: 0;
          }
          .container {
            background: #fff;
            padding: 40px 60px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
          }
          h1 {
            color: #10B981;
            margin-bottom: 20px;
          }
          p {
            color: #374151;
            font-size: 18px;
          }
          a {
            display: inline-block;
            margin-top: 25px;
            padding: 10px 25px;
            background: #3B82F6;
            color: white;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            transition: 0.3s;
          }
          a:hover {
            background: #2563EB;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✔ Email Verified!</h1>
          <p>Thank you for verifying your email. You can now log in to your account.</p>
          <a href="http://localhost:3000/auth/login">Go to Login</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification Failed</title>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #ffffff; /* plain white background */
            margin: 0;
          }
          .container {
            background: #fff;
            padding: 40px 60px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
          }
          h1 {
            color: #EF4444;
            margin-bottom: 20px;
          }
          p {
            color: #374151;
            font-size: 18px;
          }
          a {
            display: inline-block;
            margin-top: 25px;
            padding: 10px 25px;
            background: #EF4444;
            color: white;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            transition: 0.3s;
          }
          a:hover {
            background: #B91C1C;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Verification Failed</h1>
          <p>The verification link is invalid or has expired.</p>
          <a href="http://localhost:3000/signup">Try Again</a>
        </div>
      </body>
      </html>
    `);
  }
};

// Google Sign-In / Verify
exports.googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ msg: 'idToken is required' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, email_verified } = payload;

    if (!email || !email_verified) return res.status(400).json({ msg: 'Google account not verified' });

    const token = generateToken(user._id);
    res.status(200).json({ msg: 'Login successful', token });
  } catch (err) {
    console.error('GOOGLE SIGNIN ERROR:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User with this email does not exist" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    await sendPasswordResetEmail(email, resetToken);

    res.status(200).json({ msg: "Password reset link sent to your email" });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ msg: "Invalid or expired reset token" });

    const hashed = await hashPassword(password);
    user.password = hashed;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ msg: "Password reset successful" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
