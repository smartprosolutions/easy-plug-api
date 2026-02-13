"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("listings", "expiresAt", {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn("listings", "catalogueName", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("listings", "expiresAt");
    await queryInterface.removeColumn("listings", "catalogueName");
  }
};
