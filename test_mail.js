require("dotenv").config({ path: "e:/FinalYearProject/backend/.env" });
const nodemailer = require("nodemailer");

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded" : "Not Loaded");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail({
  from: `"Khel Bazaar" <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER,
  subject: "Test Email",
  text: "This is a test email.",
}, (err, info) => {
  if (err) {
    console.error("Failed to send email:", err);
  } else {
    console.log("Email sent successfully:", info.response);
  }
});
