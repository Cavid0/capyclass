import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendVerificationEmail(email: string, code: string) {
    const digits = code.split("");

    await transporter.sendMail({
        from: `"ClassFlow" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `ClassFlow - Təsdiq kodunuz: ${code}`,
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
                <tr>
                    <td align="center">
                        <table width="480" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #222222;border-radius:12px;overflow:hidden;">
                            <!-- Header -->
                            <tr>
                                <td style="padding:32px 40px 24px;border-bottom:1px solid #1f1f1f;">
                                    <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">ClassFlow</p>
                                </td>
                            </tr>
                            <!-- Body -->
                            <tr>
                                <td style="padding:32px 40px;text-align:center;">
                                    <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#ffffff;">Email təsdiq kodu</h1>
                                    <p style="margin:0 0 28px;font-size:14px;color:#888888;line-height:1.6;">
                                        Aşağıdakı 6 rəqəmli kodu qeydiyyat səhifəsindəki xanaya daxil edin.
                                    </p>
                                    <!-- Code boxes -->
                                    <div style="display:inline-flex;gap:8px;margin-bottom:28px;">
                                        ${digits.map(d => `<span style="display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;background:#1a1a1a;border:1px solid #333333;border-radius:8px;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0;">${d}</span>`).join("")}
                                    </div>
                                    <p style="margin:0 0 0;font-size:12px;color:#555555;line-height:1.6;">
                                        Bu kod 15 dəqiqə ərzində keçərlidir. Əgər siz qeydiyyatdan keçməmisinizsə, bu emaili nəzərə almayın.
                                    </p>
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="padding:20px 40px;border-top:1px solid #1f1f1f;">
                                    <p style="margin:0;font-size:12px;color:#444444;">
                                        © 2026 ClassFlow. Bütün hüquqlar qorunur.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
    });
}
