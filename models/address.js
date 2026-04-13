"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class address extends Model {
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
  address.init(
    {
      addressId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      userId: DataTypes.UUID,
      latitude: DataTypes.DECIMAL,
      longitude: DataTypes.DECIMAL,
      accuracy: DataTypes.DECIMAL,
      radius: DataTypes.DECIMAL,
      streetNumber: DataTypes.STRING,
      streetName: DataTypes.STRING,
      suburb: DataTypes.STRING,
      city: DataTypes.STRING,
      province: DataTypes.STRING,
      country: DataTypes.STRING,
      postalCode: DataTypes.STRING,
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    },
    {
      sequelize,
      modelName: "address",
      timestamps: true
    }
  );
  return address;
};
