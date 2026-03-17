"use strict";

const crypto = require("crypto");
const { locationShare: LocationShare } = require("../models");

const ALLOWED_DURATIONS = [15, 30, 60, 120];

// POST /location-shares
async function createShare(req, res, next) {
  try {
    const userId = req.user.id;
    const { durationMinutes } = req.body;

    if (!ALLOWED_DURATIONS.includes(Number(durationMinutes))) {
      return res.status(400).json({
        success: false,
        message: `durationMinutes must be one of: ${ALLOWED_DURATIONS.join(", ")}`,
      });
    }

    const token = crypto.randomBytes(24).toString("hex"); // 48-char hex
    const expiresAt = new Date(Date.now() + Number(durationMinutes) * 60 * 1000);

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
    });
  } catch (err) {
    next(err);
  }
}

// GET /location-shares/:token  (public — no auth)
async function getShare(req, res, next) {
  try {
    const { token } = req.params;
    const share = await LocationShare.findOne({ where: { token } });

    if (!share) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    return res.json({
      success: true,
      isActive: share.isActive && new Date(share.expiresAt) > new Date(),
      expiresAt: share.expiresAt,
      durationMinutes: share.durationMinutes,
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
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (String(share.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not your session" });
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
