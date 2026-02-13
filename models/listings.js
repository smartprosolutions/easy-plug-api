"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class listings extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // listing belongs to a user (seller)
      this.belongsTo(models.users, {
        foreignKey: "sellerId",
        targetKey: "userId",
        as: "seller",
      });
      // listing may have many sellerSubscription entries
      this.hasMany(models.sellerSubscription, {
        foreignKey: "listingId",
        sourceKey: "listingId",
      });
      // advert (catalogue) has many child listings
      this.hasMany(models.listings, {
        foreignKey: "parentAdvertId",
        sourceKey: "listingId",
        as: "catalogueItems",
      });
      // listing may belong to an advert (catalogue)
      this.belongsTo(models.listings, {
        foreignKey: "parentAdvertId",
        targetKey: "listingId",
        as: "parentAdvert",
      });
    }
  }
  listings.init(
    {
      listingId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      sellerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      condition: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      images: {
        // Postgres array of strings to store filenames
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      keyFeatures: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
      },
      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isAdvertisement: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      isSeen: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      parentAdvertId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "References parent advert/catalogue listing",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "listings",
      timestamps: true,
    },
  );
  return listings;
};
