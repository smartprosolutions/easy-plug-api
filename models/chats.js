"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class chats extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.listings, {
        foreignKey: "listingId",
        targetKey: "listingId"
      });
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
      this.hasMany(models.chatMessages, {
        foreignKey: "chatId",
        sourceKey: "chatId"
      });
    }
  }
  chats.init(
    {
      chatId: DataTypes.INTEGER,
      listingId: DataTypes.UUID,
      buyerId: DataTypes.UUID,
      sellerId: DataTypes.UUID
    },
    {
      sequelize,
      modelName: "chats"
    }
  );
  return chats;
};
