"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class chatMessages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsTo(models.chats, {
        foreignKey: "chatId",
        targetKey: "chatId"
      });
      this.belongsTo(models.users, {
        foreignKey: "senderId",
        targetKey: "userId",
        as: "sender"
      });
      this.belongsTo(models.users, {
        foreignKey: "receiverId",
        targetKey: "userId",
        as: "receiver"
      });
    }
  }
  chatMessages.init(
    {
      messageId: DataTypes.INTEGER,
      chatId: DataTypes.INTEGER,
      senderId: DataTypes.UUID,
      receiverId: DataTypes.UUID,
      message: DataTypes.TEXT,
      imaages: DataTypes.ARRAY(DataTypes.TEXT),
      messageType: DataTypes.STRING,
      fileUrl: DataTypes.TEXT,
      fileName: DataTypes.STRING,
      fileSize: DataTypes.INTEGER,
      mimeType: DataTypes.STRING,
      locationLat: DataTypes.DECIMAL(10, 7),
      locationLng: DataTypes.DECIMAL(10, 7),
      locationName: DataTypes.STRING,
      parentMessageId: DataTypes.INTEGER,
      replyText: DataTypes.TEXT,
      replySenderId: DataTypes.UUID,
      isRead: DataTypes.BOOLEAN,
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      modelName: "chatMessages"
    }
  );
  return chatMessages;
};
