"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class notification extends Model {
    static associate(models) {
      this.belongsTo(models.users, {
        foreignKey: "userId",
        targetKey: "userId",
        as: "user"
      });
    }
  }

  notification.init(
    {
      notificationId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'message, transaction, listing, account, system'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      actionUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Deep link to relevant page/entity'
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Additional notification data'
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Optional expiration for time-sensitive notifications'
      }
    },
    {
      sequelize,
      modelName: "notification",
      tableName: "notifications",
      timestamps: true
    }
  );

  return notification;
};
