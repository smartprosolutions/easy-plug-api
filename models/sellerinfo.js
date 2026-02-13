"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class sellerInfo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.users, {
        foreignKey: "userId",
        targetKey: "userId"
      });
    }
  }
  sellerInfo.init(
    {
      sellerId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      userId: DataTypes.UUID,
      businessName: DataTypes.STRING,
      businessEmail: DataTypes.STRING,
      businessRegistrationNumber: DataTypes.STRING,
      taxNumber: DataTypes.STRING,
      businessPicture: DataTypes.STRING,
      websiteURL: DataTypes.STRING,
      facebookURL: DataTypes.STRING,
      instagramURL: DataTypes.STRING,
      twitterURL: DataTypes.STRING,
      linkedInURL: DataTypes.STRING,
      verified: DataTypes.BOOLEAN,
      status: DataTypes.STRING,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: "sellerInfo",
      timestamps: true
    }
  );
  return sellerInfo;
};
