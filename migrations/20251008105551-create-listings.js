"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("listings", {
      listingId: {
        type: Sequelize.UUID,
        allowNullL: false,
        unique: true,
        defaultValue: Sequelize.UUIDV4
      },
      sellerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "userId"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      type: {
        type: Sequelize.STRING
      },
      category: {
        type: Sequelize.STRING
      },
      title: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
      },
      condition: {
        type: Sequelize.STRING
      },
      price: {
        type: Sequelize.DECIMAL
      },
      images: {
        type: Sequelize.ARRAY(Sequelize.STRING)
      },
      isAdvertisement: {
        type: Sequelize.BOOLEAN
      },
      status: {
        type: Sequelize.STRING
      },
      isSeen: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.dropTable("listings");
  }
};
