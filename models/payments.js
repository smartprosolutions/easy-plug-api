"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class payments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.transactions, {
        foreignKey: "transactionId",
        targetKey: "transactionId"
      });
    }
  }
  payments.init(
    {
      paymentId: DataTypes.INTEGER,
      transactionId: DataTypes.INTEGER,
      paymentMethod: DataTypes.STRING,
      referenceNumber: DataTypes.STRING,
      status: DataTypes.STRING,
      amount: DataTypes.DECIMAL,
      paidAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: "payments"
    }
  );
  return payments;
};
