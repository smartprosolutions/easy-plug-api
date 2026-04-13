const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    const err = new Error(
      "Email is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD in config/config.env (for Gmail use an App Password).",
    );
    err.status = 500;
    throw err;
  }

  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

  const transporterConfig = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  };

  if (process.env.SMTP_REJECT_UNAUTHORIZED !== undefined) {
    transporterConfig.tls = {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === "true",
    };
  }

  const transporter = nodemailer.createTransport(transporterConfig);

  const emailInfo = await transporter.sendMail({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  });

  console.log(`Email sent: ${emailInfo.messageId}`);
};

module.exports = sendEmail;
