import nodemailer from "nodemailer";

function createTransporter() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        console.error("[EMAIL] SMTP_USER or SMTP_PASS is missing!", { user: !!user, pass: !!pass });
        throw new Error("SMTP configuration not found. SMTP_USER and SMTP_PASS must be set in the .env file.");
    }

    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
    });
}

export async function sendVerificationEmail(email: string, code: string) {
    const digits = code.split("");
    const transporter = createTransporter();

    console.log("[EMAIL] Sending verification email to:", email);

    try {
        await transporter.sendMail({
            from: `"CapyClass" <${process.env.SMTP_USER}>`,
            replyTo: process.env.SMTP_USER,
            to: email,
            subject: `CapyClass - Your verification code: ${code}`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0908;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0908;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#141210;border:1px solid #2a2520;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2520;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#e8a849;letter-spacing:-0.5px;">🐹 CapyClass</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:center;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f0ece4;">Email Verification Code</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#a8a08e;line-height:1.6;">
              Enter the 6-digit code below on the verification page.
            </p>
            <div style="display:inline-flex;gap:8px;margin-bottom:28px;">
              ${digits.map(d => `<span style="display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;background:#1c1916;border:1px solid #3d362e;border-radius:8px;font-size:24px;font-weight:700;color:#e8a849;">${d}</span>`).join("")}
            </div>
            <p style="margin:0;font-size:12px;color:#6b6355;line-height:1.6;">
              This code is valid for 15 minutes. If you did not sign up, please ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2520;">
            <p style="margin:0;font-size:12px;color:#6b6355;">© 2026 CapyClass. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        });
        console.log("[EMAIL] Verification email sent successfully to:", email);
    } catch (error: any) {
        console.error("[EMAIL] Failed to send email:", error?.message || error);
        throw new Error(`Failed to send email: ${error?.message || "Unknown error"}`);
    }
}
