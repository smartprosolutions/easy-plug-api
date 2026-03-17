"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class listingSocialPost extends Model {
    static associate(models) {
      this.belongsTo(models.listings, {
        foreignKey: "listingId",
        targetKey: "listingId",
        as: "listing",
      });
    }
  }

  listingSocialPost.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      platform: {
        type: DataTypes.STRING,
        allowNull: false, // 'facebook' | 'instagram' | 'twitter'
      },
      postId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      postUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "success", // 'success' | 'failed' | 'skipped'
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "listingSocialPost",
      tableName: "listing_social_posts",
      timestamps: true,
    },
  );

  return listingSocialPost;
};
