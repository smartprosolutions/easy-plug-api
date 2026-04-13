module.exports = {
  verifyCode: ({ code, email }) => ({
    subject: "Your verification code",
    html: `<p>Hi ${
      email || "there"
    },</p><p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>`,
    text: `Hi ${
      email || "there"
    },\nYour verification code is ${code}. It expires in 15 minutes.`
  }),
  passwordReset: ({ email, resetLink, expiresInMinutes = 5 }) => ({
    subject: "Reset your Easy Plug password",
    html: `<p>Hi ${
      email || "there"
    },</p><p>We received a request to reset your password.</p><p><a href="${resetLink}" target="_blank" rel="noopener noreferrer">Click here to reset your password</a></p><p>This link expires in ${expiresInMinutes} minutes.</p><p>If you did not request this, you can safely ignore this email.</p>`,
    text: `Hi ${
      email || "there"
    },\nWe received a request to reset your password.\nUse this link to reset it: ${resetLink}\nThis link expires in ${expiresInMinutes} minutes.\nIf you did not request this, you can ignore this email.`,
  }),
};
