"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ratings", "listingId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "listings",
        key: "listingId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("ratings", ["listingId"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("ratings", ["listingId"]);
    await queryInterface.removeColumn("ratings", "listingId");
  },
};
