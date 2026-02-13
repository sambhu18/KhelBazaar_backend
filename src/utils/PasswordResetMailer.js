const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendPasswordResetEmail(email, token) {
    const resetUrl = `http://localhost:3000/auth/reset-password/${token}`;

    const html = `
  <div style="background:#f5f8fa; padding:40px; font-family:Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:40px 30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      
      <div style="text-align:center; margin-bottom:30px;">
        <h1 style="margin:0; font-size:28px; color:#3B82F6; font-weight:700;">
          Reset Your Password
        </h1>
        <p style="margin-top:10px; font-size:16px; color:#555;">
          <strong>KhelBazaar</strong> Password Recovery
        </p>
      </div>

      <p style="font-size:16px; color:#444; line-height:1.6;">
        You are receiving this because you (or someone else) have requested the reset of the password for your account. Please click on the following button, or paste this into your browser to complete the process:
      </p>

      <div style="text-align:center; margin:35px 0;">
        <a href="${resetUrl}"
           style="background:#3B82F6; padding:14px 30px; color:#fff; text-decoration:none; font-size:16px; font-weight:bold; border-radius:8px; display:inline-block;">
          Reset Password
        </a>
      </div>

      <p style="font-size:15px; color:#666; line-height:1.6;">
        If you did not request this, please ignore this email and your password will remain unchanged.
        This reset link is valid for <strong>1 hour</strong>.
      </p>

      <hr style="border:none; border-top:1px solid #eee; margin:30px 0;" />

      <p style="text-align:center; font-size:13px; color:#888;">
        © ${new Date().getFullYear()} KhelBazaar — All Rights Reserved.
      </p>
    </div>
  </div>
`;

    await transporter.sendMail({
        from: `"Khelbazaar" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Password Reset Request - KhelBazaar",
        html,
    });
}

module.exports = sendPasswordResetEmail;
