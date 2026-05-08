const {
  users: User,
  sellerInfo: SellerInfo,
  listings: Listing,
  transactions: Transaction,
} = require("../models");
const { fn, col } = require("sequelize");
const path = require("path");
const fs = require("fs");

async function getUserManagementData(req, res, next) {
  try {
    const [users, sellerInfos, listingCounts, buyerOrderCounts] =
      await Promise.all([
        User.findAll({
          attributes: { exclude: ["passwordHash"] },
          order: [["createdAt", "DESC"]],
        }),
        SellerInfo.findAll({ raw: true }),
        Listing.findAll({
          attributes: ["sellerId", [fn("COUNT", col("listingId")), "count"]],
          group: ["sellerId"],
          raw: true,
        }),
        Transaction.findAll({
          attributes: ["buyerId", [fn("COUNT", col("transactionId")), "count"]],
          group: ["buyerId"],
          raw: true,
        }),
      ]);

    const sellerInfoByUserId = new Map(
      sellerInfos.map((info) => [String(info.userId), info]),
    );

    const listingCountBySellerId = new Map(
      listingCounts.map((item) => [
        String(item.sellerId),
        Number(item.count || 0),
      ]),
    );

    const orderCountByBuyerId = new Map(
      buyerOrderCounts.map((item) => [
        String(item.buyerId),
        Number(item.count || 0),
      ]),
    );

    const admins = [];
    const sellers = [];
    const buyers = [];

    for (const user of users) {
      const userType = String(user.userType || "").toLowerCase();
      const userId = String(user.userId);
      const base = {
        id: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: String(user.status || "inactive").toLowerCase(),
        dateCreated: user.createdAt,
        dateUpdated: user.updatedAt,
      };

      if (userType.includes("admin")) {
        admins.push({
          ...base,
          role: user.userType || "Admin",
        });
        continue;
      }

      if (userType.includes("seller")) {
        const info = sellerInfoByUserId.get(userId);
        sellers.push({
          ...base,
          businessName:
            info?.businessName ||
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            "Business",
          verified: Boolean(info?.verified),
          status: String(
            info?.status || user.status || "pending",
          ).toLowerCase(),
          listings: listingCountBySellerId.get(userId) || 0,
        });
        continue;
      }

      buyers.push({
        ...base,
        phone: user.phone || "-",
        orders: orderCountByBuyerId.get(userId) || 0,
      });
    }

    return res.json({
      success: true,
      data: {
        admins,
        sellers,
        users: buyers,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["passwordHash"] },
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
      attributes: { exclude: ["passwordHash"] },
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

async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || typeof status !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "status is required" });
    }

    const normalizedStatus = status.trim().toLowerCase();
    const user = await User.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await user.update({ status: normalizedStatus });

    const userType = String(user.userType || "").toLowerCase();
    if (userType.includes("seller")) {
      const info = await SellerInfo.findOne({ where: { userId: id } });
      if (info) {
        await info.update({ status: normalizedStatus });
      }
    }

    const sanitized = user.toJSON();
    delete sanitized.passwordHash;

    return res.json({ success: true, user: sanitized });
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
      fileObj.mv(fullPath, (err) => (err ? reject(err) : resolve())),
    );

    user.profilePicture = safe;
    await user.save();

    return res.json({
      success: true,
      filename: safe,
      url: `/uploads/pictures/${encodeURIComponent(
        user.email,
      )}/${encodeURIComponent(safe)}`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserManagementData,
  listUsers,
  getUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  updateMe,
  uploadProfilePicture,
};
