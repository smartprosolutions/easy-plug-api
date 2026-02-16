"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("subscriptions", "pricingTiers", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: []
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("subscriptions", "pricingTiers");
  }
};
