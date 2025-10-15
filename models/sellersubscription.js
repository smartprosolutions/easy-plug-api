"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class sellerSubscription extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.subscriptions, {
        foreignKey: "subscriptionId",
        targetKey: "subscriptionId"
      });
      this.belongsTo(models.listings, {
        foreignKey: "listingId",
        targetKey: "listingId"
      });
      this.belongsTo(models.users, {
        foreignKey: "sellerId",
        targetKey: "userId",
        as: "seller"
      });
    }
  }
  sellerSubscription.init(
    {
      sellerSubscriptionId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      sellerId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      subscriptionId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "sellerSubscription",
      timestamps: true
    }
  );
  return sellerSubscription;
};
