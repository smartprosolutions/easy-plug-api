const jwt = require("jsonwebtoken");
const { users } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.cookies.token;
    if (!authHeader)
      return res
        .status(401)
        .json({ success: false, message: "User not authorized 1" });

    let token = authHeader;
    if (authHeader.startsWith("Bearer ")) token = authHeader.slice(7);

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload)
      return res
        .status(401)
        .json({ success: false, message: "User not authorized 2" });

        console.log("Payload:", payload); // Debugging line

    const user = await users.findByPk(payload.id);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not authorized 3" });

    req.user = { id: user.userId, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "User not authorized 4",
      error: err.message
    });
  }
}

module.exports = authMiddleware;
