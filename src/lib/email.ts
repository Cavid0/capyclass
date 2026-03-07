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
        // Improve deliverability
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
    });
}

function buildEmailHtml(title: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0a0908;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0908;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="background-color:#141210;border:1px solid #2a2520;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2520;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#e8a849;letter-spacing:-0.5px;">&#x1F439; CapyClass</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;text-align:center;">
            ${bodyContent}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #2a2520;">
            <p style="margin:0;font-size:12px;color:#6b6355;">&copy; 2026 CapyClass. All rights reserved.</p>
            <p style="margin:8px 0 0;font-size:11px;color:#4a4238;">This is a transactional email from CapyClass (capyclass.com). You received this because an account action was requested with your email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildOtpBody(heading: string, description: string, digits: string[]): string {
    return `<h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f0ece4;">${heading}</h1>
<p style="margin:0 0 28px;font-size:14px;color:#a8a08e;line-height:1.6;">
  ${description}
</p>
<div style="margin-bottom:28px;">
  ${digits.map(d => `<span style="display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;background-color:#1c1916;border:1px solid #3d362e;border-radius:8px;font-size:24px;font-weight:700;color:#e8a849;margin:0 3px;">${d}</span>`).join("")}
</div>
<p style="margin:0;font-size:12px;color:#6b6355;line-height:1.6;">
  This code is valid for 15 minutes. If you did not request this, please ignore this email.
</p>`;
}

function buildPlainTextOtp(heading: string, code: string): string {
    return `${heading}\n\nYour verification code: ${code}\n\nThis code is valid for 15 minutes.\nIf you did not request this, please ignore this email.\n\n---\nCapyClass (capyclass.com)`;
}

export async function sendVerificationEmail(email: string, code: string) {
    const digits = code.split("");
    const transporter = createTransporter();
    const smtpUser = process.env.SMTP_USER;

    console.log("[EMAIL] Sending verification email to:", email);

    try {
        await transporter.sendMail({
            from: {
                name: "CapyClass",
                address: smtpUser!,
            },
            replyTo: smtpUser,
            to: email,
            subject: `${code} — Your CapyClass verification code`,
            // Plain text version for better deliverability
            text: buildPlainTextOtp("Email Verification", code),
            html: buildEmailHtml(
                "CapyClass - Email Verification",
                buildOtpBody(
                    "Email Verification Code",
                    "Enter the 6-digit code below on the verification page.",
                    digits
                )
            ),
            headers: {
                "X-Mailer": "CapyClass",
                "X-Priority": "1",
                "Precedence": "bulk",
                "X-Auto-Response-Suppress": "All",
            },
        });
        console.log("[EMAIL] Verification email sent successfully to:", email);
    } catch (error: any) {
        console.error("[EMAIL] Failed to send email:", error?.message || error);
        throw new Error(`Failed to send email: ${error?.message || "Unknown error"}`);
    }
}
