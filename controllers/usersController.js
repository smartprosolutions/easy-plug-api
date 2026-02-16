const { users: User } = require("../models");
const path = require("path");
const fs = require("fs");

async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["passwordHash"] }
    });
    return res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ["passwordHash"] }
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    await user.update(req.body);
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    await user.destroy();
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    next(err);
  }
}

// exports are consolidated at the end of the file

// Update the authenticated user's basic profile fields
async function updateMe(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    const user = await User.findByPk(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Whitelist updatable fields
    const allowed = ["title", "firstName", "lastName", "phone", "idNumber"];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    await user.update(updates);
    const sanitized = user.toJSON();
    delete sanitized.passwordHash;
    return res.json({ success: true, user: sanitized });
  } catch (err) {
    next(err);
  }
}

// Upload and set the authenticated user's profile picture
async function uploadProfilePicture(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    const user = await User.findByPk(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (!req.files || !req.files.profilePicture) {
      return res
        .status(400)
        .json({ success: false, message: "profilePicture file is required" });
    }

    const fileObj = Array.isArray(req.files.profilePicture)
      ? req.files.profilePicture[0]
      : req.files.profilePicture;

    const destDir = path.join(process.cwd(), "uploads", "pictures", user.email);
    fs.mkdirSync(destDir, { recursive: true });
    const base = fileObj.name || "profile.jpg";
    const safe = `${Date.now()}-${base.replace(/[^a-z0-9.\-_]/gi, "_")}`;
    const fullPath = path.join(destDir, safe);

    await new Promise((resolve, reject) =>
      fileObj.mv(fullPath, (err) => (err ? reject(err) : resolve()))
    );

    user.profilePicture = safe;
    await user.save();

    return res.json({
      success: true,
      filename: safe,
      url: `/uploads/pictures/${encodeURIComponent(
        user.email
      )}/${encodeURIComponent(safe)}`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  updateMe,
  uploadProfilePicture
};
