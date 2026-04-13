"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class priceHistory extends Model {
    static associate(models) {
      this.belongsTo(models.listings, {
        foreignKey: "listingId",
        targetKey: "listingId",
        as: "listing"
      });
      this.belongsTo(models.users, {
        foreignKey: "changedBy",
        targetKey: "userId",
        as: "user"
      });
    }
  }

  priceHistory.init(
    {
      priceHistoryId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      oldPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      newPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      changedBy: {
        type: DataTypes.UUID,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "priceHistory",
      tableName: "priceHistories",
      timestamps: true
    }
  );

  return priceHistory;
};
