"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class subscriptions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // subscription can be applied to many sellerSubscription records
      this.hasMany(models.sellerSubscription, {
        foreignKey: "subscriptionId",
        sourceKey: "subscriptionId"
      });
      // through sellerSubscription, a subscription can be associated with many listings
      this.belongsToMany(models.listings, {
        through: models.sellerSubscription,
        foreignKey: "subscriptionId",
        otherKey: "listingId"
      });
    }
  }
  subscriptions.init(
    {
      subscriptionId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      name: {
        type: DataTypes.STRING
      },
      durationInHours: {
        type: DataTypes.INTEGER
      },
      price: {
        type: DataTypes.DECIMAL
      },
      description: {
        type: DataTypes.TEXT
      },
      status: {
        type: DataTypes.STRING
      },
      createdAt: {
        type: DataTypes.DATE
      },
      updatedAt: {
        type: DataTypes.DATE
      }
    },
    {
      sequelize,
      modelName: "subscriptions",
      timestamps: true
    }
  );
  return subscriptions;
};
