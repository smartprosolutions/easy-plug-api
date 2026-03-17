"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class locationShare extends Model {
    static associate(models) {
      this.belongsTo(models.users, {
        foreignKey: "userId",
        targetKey: "userId",
        as: "owner",
      });
    }
  }

  locationShare.init(
    {
      shareId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "locationShare",
      tableName: "location_shares",
      timestamps: true,
    },
  );

  return locationShare;
};
