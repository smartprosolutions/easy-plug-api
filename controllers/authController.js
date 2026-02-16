const jwt = require("jsonwebtoken");
const {
  users: User,
  sellerInfo: SellerInfo,
  address: Address,
  sequelize
} = require("../models");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);
const RESET_TOKEN_EXP = process.env.RESET_TOKEN_EXP || "1h";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const sendEmail = require("../utils/email");
const templates = require("../utils/emailTemplates");
const path = require("path");
const fs = require("fs");

async function loginWithEmail(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    // verify hashed password using bcrypt
    const pwHash = user.passwordHash || "";
    const valid = await bcrypt.compare(password, pwHash);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.userId, email: user.email }, JWT_SECRET, {
      expiresIn: "7d"
    });
    // Exclude passwordHash from user details
    const { passwordHash, ...userData } = user.toJSON();
    return res.json({ success: true, token, user: userData });
  } catch (err) {
    console.log(err);
    next(err);
  }
}

async function loginWithGoogle(req, res, next) {
  try {
    // Google One Tap / Sign-In returns the JWT in `credential`.
    // Accept that and other common names, and pass it to verifyIdToken as `idToken`.
    const token =
      req.body.credential ||
      req.body.idToken ||
      req.body.id_token ||
      req.body.token;
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "credential or idToken required" });

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID || undefined
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    let user = await User.findOne({ where: { email } });
    if (!user) {
      // create a minimal user record for Google signup (no password stored)
      user = await User.create({
        userId: payload.sub,
        firstName: payload.given_name || "",
        lastName: payload.family_name || "",
        email,
        status: "active",
        userType: "user"
      });
    }

    const accessToken = jwt.sign(
      { id: user.userId, email: user.email },
      JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );
    const { passwordHash, ...userData } = user.toJSON();
    return res.json({ success: true, accessToken, user: userData });
  } catch (err) {
    next(err);
  }
}

// send a 6-digit verification code to email and return a short-lived token
async function sendVerificationCode(req, res, next) {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "email required" });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    // create a short-lived token that includes the code (not the user password)
    const verificationToken = jwt.sign({ email, code }, JWT_SECRET, {
      expiresIn: "15m"
    });
    const tpl = templates.verifyCode({ code, email });
    await sendEmail({
      email,
      subject: tpl.subject,
      html: tpl.html
    });
    return res.json({ success: true, verificationToken, message: "Code sent" });
  } catch (err) {
    next(err);
  }
}

// verify the code against the token
async function verifyCode(req, res, next) {
  try {
    const { verificationToken, code } = req.body;
    if (!verificationToken || !code)
      return res.status(400).json({
        success: false,
        message: "verificationToken and code required"
      });
    let payload;
    try {
      payload = jwt.verify(verificationToken, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }
    if (payload.code !== String(code) || payload.email !== payload.email)
      return res.status(400).json({ success: false, message: "Invalid code" });
    // issue a longer lived signed token to allow registration (include email)
    const regToken = jwt.sign(
      { email: payload.email, verified: true },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    return res.json({ success: true, regToken });
  } catch (err) {
    next(err);
  }
}

async function getLoggedInUser(req, res, next) {
  try {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "User not authorized" });
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["passwordHash"] },
      include: [
        {
          model: Address,
          separate: true,
          limit: 1,
          order: [["createdAt", "DESC"]]
        }
      ]
    });
    if (user) {
      const latestAddress =
        Array.isArray(user.addresses) && user.addresses.length > 0
          ? user.addresses[0]
          : null;
      if (latestAddress) {
        user.dataValues.location = latestAddress;
      }
      // Optionally avoid returning the addresses array if we're exposing 'location'
      delete user.dataValues.addresses;
    }
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

// Get the authenticated user's info including associated sellerInfo
async function getLoggedInUserWithSellerInfo(req, res, next) {
  try {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "User not authorized" });
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["passwordHash"] },
      include: [
        { model: SellerInfo },
        {
          model: Address,
          separate: true,
          limit: 1,
          order: [["createdAt", "DESC"]]
        }
      ]
    });
    if (user && user.sellerInfo) {
      const latestAddress =
        Array.isArray(user.addresses) && user.addresses.length > 0
          ? user.addresses[0]
          : null;
      if (latestAddress) {
        // attach a single latest address onto sellerInfo for convenience
        user.sellerInfo.dataValues.address = latestAddress;
      }
    }
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function registerUser(req, res, next) {
  try {
    // require that the caller provide a regToken (from verifyCode) proving email ownership
    const { email, password, confirmPassword, firstName, lastName, regToken } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });

    // Validate password confirmation
    if (confirmPassword && password !== confirmPassword)
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    // if (!regToken)
    //   return res.status(400).json({
    //     success: false,
    //     message: "regToken required (verify email first)"
    //   });
    // try {
    //   const p = jwt.verify(regToken, JWT_SECRET);
    //   if (!p.verified || p.email !== email)
    //     return res
    //       .status(400)
    //       .json({ success: false, message: "Invalid registration token" });
    // } catch (err) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid or expired registration token"
    //   });
    // }

    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    // build payload from request body but ensure safe/required fields are set
    const payload = {
      ...req.body,
      passwordHash: hashed,
      status: "active",
      userType: "user"
    };

    const user = await User.create(payload);

    const token = jwt.sign({ id: user.userId, email: user.email }, JWT_SECRET, {
      expiresIn: "7d"
    });
    const { passwordHash, ...userData } = user.toJSON();
    return res.status(201).json({ success: true, token, user: userData });
  } catch (err) {
    next(err);
  }
}

// Register a seller user (forces userType = 'seller'). Could optionally create related sellerInfo.
async function registerSeller(req, res, next) {
  // helpers
  const toBool = (v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.toLowerCase();
      if (["yes", "true", "1"].includes(s)) return true;
      if (["no", "false", "0"].includes(s)) return false;
    }
    return false;
  };
  const getBusinessFlag = (body) => {
    const { sellerType, accountType, registrationType, isBusiness } = body;
    const typeStr = (sellerType || accountType || registrationType || "")
      .toString()
      .toLowerCase();
    return typeof isBusiness === "boolean"
      ? isBusiness
      : typeStr === "business";
  };
  const moveOneFile = async (fileObj, destDir, savedPaths) => {
    const base = fileObj.name || "file";
    const safe = `${Date.now()}-${base.replace(/[^a-z0-9.\-_]/gi, "_")}`;
    const full = path.join(destDir, safe);
    await new Promise((resolve, reject) =>
      fileObj.mv(full, (err) => (err ? reject(err) : resolve()))
    );
    savedPaths.push(full);
    return safe;
  };

  const savedPaths = [];

  try {
    const {
      email,
      password,
      alreadyHasAccount,
      ifAlreadyHasAccount,
      existingEmail
    } = req.body;

    const hasExisting =
      toBool(alreadyHasAccount) || toBool(ifAlreadyHasAccount);
    const businessFlag = getBusinessFlag(req.body);

    if (hasExisting) {
      const lookupEmail = existingEmail || email;
      if (!lookupEmail) {
        return res.status(400).json({
          success: false,
          message: "existingEmail is required when alreadyHasAccount is yes"
        });
      }

      // Validate user exists
      const existingUser = await User.findOne({
        where: { email: lookupEmail }
      });
      if (!existingUser) {
        return res
          .status(404)
          .json({ success: false, message: "User account not found" });
      }

      // If sellerInfo already exists, block registering business again
      const existingInfo = await SellerInfo.findOne({
        where: { userId: existingUser.userId }
      });
      if (existingInfo) {
        return res.status(409).json({
          success: false,
          message: "A business is already linked to this account"
        });
      }

      // Handle file uploads only after validations
      let profileFilename = null;
      let businessFilename = null;
      if (req.files) {
        const destDir = path.join(
          process.cwd(),
          "uploads",
          "pictures",
          lookupEmail
        );
        fs.mkdirSync(destDir, { recursive: true });
        if (req.files.profilePicture) {
          const f = Array.isArray(req.files.profilePicture)
            ? req.files.profilePicture[0]
            : req.files.profilePicture;
          profileFilename = await moveOneFile(f, destDir, savedPaths);
        }
        if (req.files.businessPicture) {
          const f = Array.isArray(req.files.businessPicture)
            ? req.files.businessPicture[0]
            : req.files.businessPicture;
          businessFilename = await moveOneFile(f, destDir, savedPaths);
        }
      }

      const result = await sequelize.transaction(async (t) => {
        // upgrade user to seller if needed
        if (existingUser.userType !== "seller") {
          existingUser.userType = "seller";
          existingUser.status = existingUser.status || "active";
          await existingUser.save({ transaction: t });
        }

        // create sellerInfo
        const sellerInfoPayload = {
          userId: existingUser.userId,
          sellerId: existingUser.userId,
          businessName:
            req.body.businessName ||
            `${existingUser.firstName || ""} ${
              existingUser.lastName || ""
            }`.trim() ||
            null,
          businessEmail: req.body.businessEmail || existingUser.email,
          businessPicture: businessFilename || null,
          verified: false,
          status: "active"
        };
        const info = await SellerInfo.create(sellerInfoPayload, {
          transaction: t
        });
        // persist profile picture onto user if provided
        if (profileFilename) {
          existingUser.profilePicture = profileFilename;
          await existingUser.save({ transaction: t });
        }
        return { user: existingUser, info, profileFilename, businessFilename };
      });

      const token = jwt.sign(
        { id: result.user.userId, email: result.user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.status(201).json({
        success: true,
        token,
        sellerInfo: result.info,
        profilePicture: result.profileFilename,
        businessPicture: result.businessFilename,
        user: {
          id: result.user.userId,
          email: result.user.email,
          userType: result.user.userType
        }
      });
    }

    // New seller registration path
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // Validate password confirmation
    const { confirmPassword } = req.body;
    if (confirmPassword && password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    // Move files only after basic validations above
    let profileFilename = null;
    let businessFilename = null;
    if (req.files) {
      const destDir = path.join(process.cwd(), "uploads", "pictures", email);
      fs.mkdirSync(destDir, { recursive: true });
      if (req.files.profilePicture) {
        const f = Array.isArray(req.files.profilePicture)
          ? req.files.profilePicture[0]
          : req.files.profilePicture;
        profileFilename = await moveOneFile(f, destDir, savedPaths);
      }
      if (req.files.businessPicture) {
        const f = Array.isArray(req.files.businessPicture)
          ? req.files.businessPicture[0]
          : req.files.businessPicture;
        businessFilename = await moveOneFile(f, destDir, savedPaths);
      }
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const payload = {
      ...req.body,
      passwordHash: hashed,
      status: "active",
      userType: "seller"
    };

    const result = await sequelize.transaction(async (t) => {
      const user = await User.create(payload, { transaction: t });
      const sellerInfoPayload = {
        userId: user.userId,
        sellerId: user.userId,
        businessName:
          req.body.businessName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          null,
        businessEmail: req.body.businessEmail || user.email,
        businessPicture: businessFilename || null,
        verified: false,
        status: "active"
      };
      const info = await SellerInfo.create(sellerInfoPayload, {
        transaction: t
      });
      // persist profile picture onto user if provided
      if (profileFilename) {
        user.profilePicture = profileFilename;
        await user.save({ transaction: t });
      }
      return { user, info };
    });

    const token = jwt.sign(
      { id: result.user.userId, email: result.user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.status(201).json({
      success: true,
      token,
      sellerInfo: result.info,
      profilePicture: profileFilename,
      businessPicture: businessFilename
    });
  } catch (err) {
    // cleanup any files saved before failing
    try {
      for (const p of savedPaths || []) {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch (_) {}
      }
    } catch (_) {}
    next(err);
  }
}

// Generate a password reset token (stateless JWT) and return it.
// In production, you should email this token (or a link containing it) to the user.
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email required" });

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const resetToken = jwt.sign(
      { id: user.id, email: user.email, reset: true },
      JWT_SECRET,
      { expiresIn: RESET_TOKEN_EXP }
    );

    // TODO: send resetToken via email to the user. For now, return in response for manual testing.
    return res.json({ success: true, resetToken, expiresIn: RESET_TOKEN_EXP });
  } catch (err) {
    next(err);
  }
}

// Reset password using the reset token
async function resetPassword(req, res, next) {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword)
      return res.status(400).json({
        success: false,
        message: "resetToken and newPassword required"
      });

    let payload;
    try {
      payload = jwt.verify(resetToken, JWT_SECRET);
    } catch (err) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    if (!payload.reset || !payload.id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid reset token" });

    const user = await User.findByPk(payload.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.passwordHash = hashed;
    await user.save();

    return res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
}
module.exports = {
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
};
