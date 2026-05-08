"use strict";

const crypto = require("crypto");
const { locationShare: LocationShare, users: Users } = require("../models");

const ALLOWED_DURATIONS = [15, 30, 60, 120];

// POST /location-shares
async function createShare(req, res, next) {
  try {
    const userId = req.user.id;
    const { durationMinutes } = req.body;
    const { Op } = require("sequelize");

    if (!ALLOWED_DURATIONS.includes(Number(durationMinutes))) {
      return res.status(400).json({
        success: false,
        message: `durationMinutes must be one of: ${ALLOWED_DURATIONS.join(", ")}`,
      });
    }

    const existingActiveShare = await LocationShare.findOne({
      where: {
        userId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [["createdAt", "DESC"]],
    });

    if (existingActiveShare) {
      return res.status(200).json({
        success: true,
        token: existingActiveShare.token,
        expiresAt: existingActiveShare.expiresAt,
        durationMinutes: existingActiveShare.durationMinutes,
        alreadyActive: true,
      });
    }

    const token = crypto.randomBytes(24).toString("hex"); // 48-char hex
    const expiresAt = new Date(
      Date.now() + Number(durationMinutes) * 60 * 1000,
    );

    const share = await LocationShare.create({
      userId,
      token,
      durationMinutes: Number(durationMinutes),
      expiresAt,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      token: share.token,
      expiresAt: share.expiresAt,
      durationMinutes: share.durationMinutes,
      alreadyActive: false,
    });
  } catch (err) {
    next(err);
  }
}

// GET /location-shares/:token  (public — no auth)
async function getShare(req, res, next) {
  try {
    const { token } = req.params;
    const share = await LocationShare.findOne({
      where: { token },
      include: [
        {
          model: Users,
          as: "owner",
          attributes: ["firstName", "lastName"],
        },
      ],
    });

    if (!share) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    const firstName = share.owner?.firstName || null;
    const lastName = share.owner?.lastName || null;
    const initials = [firstName, lastName]
      .filter(Boolean)
      .map((part) => String(part).trim().charAt(0).toUpperCase())
      .join("");
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    return res.json({
      success: true,
      isActive: share.isActive && new Date(share.expiresAt) > new Date(),
      expiresAt: share.expiresAt,
      durationMinutes: share.durationMinutes,
      sharedBy: {
        firstName,
        lastName,
        fullName: fullName || null,
        initials: initials || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /location-shares/:token  (owner only)
async function stopShare(req, res, next) {
  try {
    const userId = req.user.id;
    const { token } = req.params;

    const share = await LocationShare.findOne({ where: { token } });

    if (!share) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }
    if (String(share.userId) !== String(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "Not your session" });
    }

    await share.update({ isActive: false });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// GET /location-shares/my/active  (authenticated)
async function myActiveSessions(req, res, next) {
  try {
    const userId = req.user.id;
    const { Op } = require("sequelize");

    const shares = await LocationShare.findAll({
      where: {
        userId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [["createdAt", "DESC"]],
    });

    return res.json({ success: true, sessions: shares });
  } catch (err) {
    next(err);
  }
}

module.exports = { createShare, getShare, stopShare, myActiveSessions };
