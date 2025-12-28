const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendVerificationEmail(email, token) {
    const verifyUrl = `${process.env.BASE_URL}/api/auth/verify/${token}`;

    const html = `
  <div style="background:#f5f8fa; padding:40px; font-family:Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:40px 30px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      
      <div style="text-align:center; margin-bottom:30px;">
        <h1 style="margin:0; font-size:28px; color:#fff; font-weight:700;">
          Verify Your Email
        </h1>
        <p style="margin-top:10px; font-size:16px; color:#555;">
          Welcome to <strong>KhelBazaar</strong>
        </p>
      </div>

      <p style="font-size:16px; color:#444; line-height:1.6;">
        Thank you for creating an account. To complete your registration, please verify your email address by clicking the button below:
      </p>

      <div style="text-align:center; margin:35px 0;">
        <a href="${verifyUrl}"
           style="background:#3B82F6; padding:14px 30px; color:#fff; text-decoration:none; font-size:16px; font-weight:bold; border-radius:8px; display:inline-block;">
          Verify Email
        </a>
      </div>

      <p style="font-size:15px; color:#666; line-height:1.6;">
        If you didn’t request this email, you can safely ignore it.  
        This verification link is valid for <strong>1 hour</strong>.
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
        subject: "Verify Your Email Address",
        html,
    });
}

module.exports = sendVerificationEmail;