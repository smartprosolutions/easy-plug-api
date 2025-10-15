module.exports = {
  verifyCode: ({ code, email }) => ({
    subject: "Your verification code",
    html: `<p>Hi ${
      email || "there"
    },</p><p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>`,
    text: `Hi ${
      email || "there"
    },\nYour verification code is ${code}. It expires in 15 minutes.`
  })
};
