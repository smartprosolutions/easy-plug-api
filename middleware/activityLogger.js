const { activityLog: ActivityLog } = require("../models");
const UAParser = require("ua-parser-js");

/**
 * Middleware to log user activity
 * Usage: router.get('/listings/:id', activityLogger('view_listing'), getListing);
 */
function activityLogger(action, entityType = null) {
  return async (req, res, next) => {
    try {
      const userId = req.user && req.user.id;
      const userAgent = req.headers["user-agent"] || "";
      const ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        null;

      // Parse user agent
      const parser = new UAParser(userAgent);
      const ua = parser.getResult();

      // Determine entity ID from request params
      let entityId = null;
      if (req.params.id) {
        entityId = req.params.id;
      } else if (req.body.listingId) {
        entityId = req.body.listingId;
      } else if (req.body.sellerId) {
        entityId = req.body.sellerId;
      }

      // Build metadata from query params and body (excluding sensitive data)
      const metadata = {};
      if (req.query && Object.keys(req.query).length > 0) {
        metadata.query = req.query;
      }
      if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        delete sanitizedBody.password;
        delete sanitizedBody.passwordHash;
        delete sanitizedBody.confirmPassword;
        metadata.body = sanitizedBody;
      }

      // Log activity asynchronously (don't wait for it)
      ActivityLog.create({
        userId,
        action,
        entityType,
        entityId,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        ipAddress,
        userAgent,
        browser: `${ua.browser.name || "Unknown"} ${ua.browser.version || ""}`.trim(),
        device: ua.device.type || "desktop",
        os: `${ua.os.name || "Unknown"} ${ua.os.version || ""}`.trim(),
        sessionId: req.sessionID || null
      }).catch((err) => {
        console.error("Activity logging error:", err);
      });

      next();
    } catch (err) {
      // Don't fail the request if logging fails
      console.error("Activity logger middleware error:", err);
      next();
    }
  };
}

/**
 * Helper function to manually log activity from controllers
 */
async function logActivity(userId, action, entityType, entityId, req, additionalMetadata = {}) {
  try {
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      null;

    const parser = new UAParser(userAgent);
    const ua = parser.getResult();

    await ActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      metadata: additionalMetadata,
      ipAddress,
      userAgent,
      browser: `${ua.browser.name || "Unknown"} ${ua.browser.version || ""}`.trim(),
      device: ua.device.type || "desktop",
      os: `${ua.os.name || "Unknown"} ${ua.os.version || ""}`.trim(),
      sessionId: req.sessionID || null
    });
  } catch (err) {
    console.error("Log activity error:", err);
  }
}

module.exports = { activityLogger, logActivity };
