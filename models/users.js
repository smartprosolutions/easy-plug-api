"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // a user can have many listings (sellerId on listings stores user.userId)
      this.hasMany(models.listings, {
        foreignKey: "sellerId",
        sourceKey: "userId"
      });
      // a user may have seller info
      this.hasOne(models.sellerInfo, {
        foreignKey: "userId",
        sourceKey: "userId"
      });
      // a user can have many addresses
      this.hasMany(models.address, {
        foreignKey: "userId",
        sourceKey: "userId"
      });
      // transactions as buyer and seller
      this.hasMany(models.transactions, {
        foreignKey: "buyerId",
        sourceKey: "userId",
        as: "purchases"
      });
      this.hasMany(models.transactions, {
        foreignKey: "sellerId",
        sourceKey: "userId",
        as: "sales"
      });
    }
  }
  users.init(
    {
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      idNumber: {
        type: DataTypes.STRING,
        unique: true
      },
      profilePicture: {
        type: DataTypes.STRING,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.STRING,
      },
      userType: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "users",
      timestamps: true
    }
  );
  return users;
};
