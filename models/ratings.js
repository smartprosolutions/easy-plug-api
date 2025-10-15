"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ratings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.users, {
        foreignKey: "userId",
        targetKey: "userId",
        as: "user"
      });
      this.belongsTo(models.users, {
        foreignKey: "sellerId",
        targetKey: "userId",
        as: "seller"
      });
    }
  }
  ratings.init(
    {
      ratingId: DataTypes.INTEGER,
      sellerId: DataTypes.UUID,
      userId: DataTypes.UUID,
      rating: DataTypes.INTEGER,
      comment: DataTypes.TEXT
    },
    {
      sequelize,
      modelName: "ratings"
    }
  );
  return ratings;
};
