"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class activityLog extends Model {
    static associate(models) {
      this.belongsTo(models.users, {
        foreignKey: "userId",
        targetKey: "userId",
        as: "user"
      });
    }
  }

  activityLog.init(
    {
      activityId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'e.g., view_listing, search, add_to_wishlist, send_message'
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'listing, user, chat, etc.'
      },
      entityId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID of the entity being acted upon'
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Flexible storage for action-specific data'
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      browser: {
        type: DataTypes.STRING,
        allowNull: true
      },
      device: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'mobile, tablet, desktop'
      },
      os: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Operating system'
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "activityLog",
      tableName: "activityLogs",
      timestamps: true
    }
  );

  return activityLog;
};
