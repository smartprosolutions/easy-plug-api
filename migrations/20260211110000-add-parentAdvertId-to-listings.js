"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("listings", "parentAdvertId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "listings",
        key: "listingId"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("listings", "parentAdvertId");
  }
};
