"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sellerInfos", {
      sellerId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      userId: {
        type: Sequelize.UUID
      },
      businessName: {
        type: Sequelize.STRING
      },
      businessEmail: {
        type: Sequelize.STRING
      },
      businessRegistrationNumber: {
        type: Sequelize.STRING
      },
      taxNumber: {
        type: Sequelize.STRING
      },
      businessPicture: {
        type: Sequelize.STRING
      },
      websiteURL: {
        type: Sequelize.STRING
      },
      facebookURL: {
        type: Sequelize.STRING
      },
      instagramURL: {
        type: Sequelize.STRING
      },
      twitterURL: {
        type: Sequelize.STRING
      },
      linkedInURL: {
        type: Sequelize.STRING
      },
      verified: {
        type: Sequelize.BOOLEAN
      },
      status: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("sellerInfos");
  }
};
