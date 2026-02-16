"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class transactions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.users, {
        foreignKey: "buyerId",
        targetKey: "userId",
        as: "buyer"
      });
      this.belongsTo(models.users, {
        foreignKey: "sellerId",
        targetKey: "userId",
        as: "seller"
      });
      this.belongsTo(models.listings, {
        foreignKey: "listingId",
        targetKey: "listingId"
      });
      this.hasMany(models.payments, {
        foreignKey: "transactionId",
        sourceKey: "transactionId"
      });
    }
  }
  transactions.init(
    {
      transactionId: DataTypes.INTEGER,
      buyerId: DataTypes.UUID,
      sellerId: DataTypes.UUID,
      listingId: DataTypes.UUID,
      amount: DataTypes.DECIMAL,
      status: DataTypes.STRING,
      otpCode: DataTypes.STRING,
      releasedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: "transactions"
    }
  );
  return transactions;
};
