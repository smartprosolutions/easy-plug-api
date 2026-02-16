const express = require("express");
const router = express.Router();
const {
  loginWithEmail,
  loginWithGoogle,
  getLoggedInUser,
  getLoggedInUserWithSellerInfo,
  registerUser,
  registerSeller,
  forgotPassword,
  resetPassword,
  sendVerificationCode,
  verifyCode
} = require("../controllers/authController");
const auth = require("../middleware/auth");

router.post("/login", loginWithEmail);
// user registration
router.post("/register", registerUser); // backward compatibility
router.post("/register/user", registerUser);
router.post("/register/seller", registerSeller);
router.post("/login/google", loginWithGoogle);
router.post("/send-code", sendVerificationCode);
router.post("/verify-code", verifyCode);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", auth, getLoggedInUser);
router.get("/me/full", auth, getLoggedInUserWithSellerInfo);

module.exports = router;
