"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("listing_social_posts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      listingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "listings", key: "listingId" },
        onDelete: "CASCADE",
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "facebook | instagram | twitter",
      },
      postId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Platform-assigned post / media ID",
      },
      postUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "success",
        comment: "success | failed | skipped",
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("listing_social_posts", ["listingId"]);
    await queryInterface.addIndex("listing_social_posts", ["platform"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("listing_social_posts");
  },
};
