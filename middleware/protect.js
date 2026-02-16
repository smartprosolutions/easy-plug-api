const { users } = require("../models");

/**
 * protect(allowed)
 * allowed: string or array of strings representing allowed userType values
 * Usage: app.get('/seller', auth, protect('seller'), handler)
 */
function protect(allowed) {
  const allowedArr = Array.isArray(allowed) ? allowed : [allowed];

  return async function (req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return res
          .status(401)
          .json({ success: false, message: "User not authenticated" });
      }

      const user = await users.findByPk(req.user.id);
      if (!user)
        return res
          .status(401)
          .json({ success: false, message: "User not found" });

      const userType = user.userType || "";
      if (!allowedArr.includes(userType)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: insufficient privileges"
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = protect;
