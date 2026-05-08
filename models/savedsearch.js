"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class savedSearch extends Model {
    static associate(models) {
      this.belongsTo(models.users, {
        foreignKey: "userId",
        targetKey: "userId",
        as: "user",
      });
    }
  }

  savedSearch.init(
    {
      savedSearchId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "savedSearch",
      tableName: "savedSearches",
      timestamps: true,
    },
  );

  return savedSearch;
};
