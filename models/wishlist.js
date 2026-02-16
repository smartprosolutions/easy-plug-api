"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class wishlist extends Model {
    static associate(models) {
      this.belongsTo(models.users, {
        foreignKey: "userId",
        targetKey: "userId",
        as: "user"
      });
      this.belongsTo(models.listings, {
        foreignKey: "listingId",
        targetKey: "listingId",
        as: "listing"
      });
    }
  }

  wishlist.init(
    {
      wishlistId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "wishlist",
      tableName: "wishlists",
      timestamps: true
    }
  );

  return wishlist;
};
