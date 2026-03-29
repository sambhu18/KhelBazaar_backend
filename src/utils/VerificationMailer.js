const nodemailer = require("nodemailer");

// ✅ Create transporter (EXPLICIT CONFIG — no shortcuts)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Verify SMTP connection properly
(async () => {
  try {
    await transporter.verify();
    console.log("SMTP server is ready to send emails");
  } catch (err) {
    console.error("SMTP ERROR:", {
      message: err.message,
      response: err.response,
      code: err.code,
    });
  }
})();


// ✅ Send Verification Email
async function sendVerificationEmail(email, token) {
  console.log("📧 Sending verification email to:", email);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials are missing in .env");
  }

  const verifyUrl = `${process.env.BASE_URL}/api/auth/verify/${token}`;

  const html = `
  <div style="background:#f5f8fa; padding:40px; font-family:Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:40px 30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      
      <div style="text-align:center; margin-bottom:30px;">
        <h1 style="margin:0; font-size:28px; color:#111; font-weight:700;">
          Verify Your Email
        </h1>
        <p style="margin-top:10px; font-size:16px; color:#555;">
          Welcome to <strong>KhelBazaar</strong>
        </p>
      </div>

      <p style="font-size:16px; color:#444; line-height:1.6;">
        Thank you for creating an account. Click the button below to verify your email:
      </p>

      <div style="text-align:center; margin:35px 0;">
        <a href="${verifyUrl}"
           style="background:#3B82F6; padding:14px 30px; color:#fff; text-decoration:none; font-size:16px; font-weight:bold; border-radius:8px; display:inline-block;">
          Verify Email
        </a>
      </div>

      <p style="font-size:15px; color:#666;">
        If you didn’t request this, ignore this email.
      </p>

      <hr style="border:none; border-top:1px solid #eee; margin:30px 0;" />

      <p style="text-align:center; font-size:13px; color:#888;">
        © ${new Date().getFullYear()} KhelBazaar
      </p>
    </div>
  </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Khel Bazaar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email Address",
      html,
    });

    console.log("✅ Email sent:", info.response);

  } catch (err) {
    console.error("❌ MAIL ERROR:", {
      message: err.message,
      response: err.response,
      code: err.code,
    });
    throw err;
  }
}

module.exports = sendVerificationEmail;