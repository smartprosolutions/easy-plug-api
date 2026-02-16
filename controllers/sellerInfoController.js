const { sellerInfo: SellerInfo, users: User } = require("../models");
const path = require("path");
const fs = require("fs");

async function getSellerInfo(req, res, next) {
  try {
    const { id } = req.params;
    const info = await SellerInfo.findByPk(id);
    if (!info)
      return res
        .status(404)
        .json({ success: false, message: "Seller info not found" });
    return res.json({ success: true, sellerInfo: info });
  } catch (err) {
    next(err);
  }
}

async function updateSellerInfo(req, res, next) {
  try {
    const { id } = req.params;
    const info = await SellerInfo.findByPk(id);
    if (!info)
      return res
        .status(404)
        .json({ success: false, message: "Seller info not found" });
    await info.update(req.body);
    return res.json({ success: true, sellerInfo: info });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSellerInfo, updateSellerInfo };

// Update the authenticated seller's info (by req.user.id)
async function updateMySellerInfo(req, res, next) {
  try {
    const info = await SellerInfo.findOne({ where: { userId: req.user.id } });
    if (!info)
      return res
        .status(404)
        .json({ success: false, message: "Seller info not found" });

    const allowed = [
      "businessName",
      "businessEmail",
      "businessRegistrationNumber",
      "taxNumber",
      "websiteURL",
      "facebookURL",
      "instagramURL",
      "twitterURL",
      "linkedInURL",
      "status"
    ];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }
    await info.update(updates);
    return res.json({ success: true, sellerInfo: info });
  } catch (err) {
    next(err);
  }
}

// Upload business/company picture for the authenticated seller
async function uploadBusinessPicture(req, res, next) {
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

    const info = await SellerInfo.findOne({ where: { userId: req.user.id } });
    if (!info)
      return res
        .status(404)
        .json({ success: false, message: "Seller info not found" });

    if (!req.files || !req.files.businessPicture) {
      return res
        .status(400)
        .json({ success: false, message: "businessPicture file is required" });
    }

    const fileObj = Array.isArray(req.files.businessPicture)
      ? req.files.businessPicture[0]
      : req.files.businessPicture;

    const destDir = path.join(process.cwd(), "uploads", "pictures", user.email);
    fs.mkdirSync(destDir, { recursive: true });
    const base = fileObj.name || "business.jpg";
    const safe = `${Date.now()}-${base.replace(/[^a-z0-9.\-_]/gi, "_")}`;
    const fullPath = path.join(destDir, safe);

    await new Promise((resolve, reject) =>
      fileObj.mv(fullPath, (err) => (err ? reject(err) : resolve()))
    );

    info.businessPicture = safe;
    await info.save();

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

module.exports.updateMySellerInfo = updateMySellerInfo;
module.exports.uploadBusinessPicture = uploadBusinessPicture;
