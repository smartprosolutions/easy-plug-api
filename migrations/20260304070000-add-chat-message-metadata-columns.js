'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('chatMessages', 'messageType', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('chatMessages', 'fileUrl', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('chatMessages', 'fileName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('chatMessages', 'fileSize', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('chatMessages', 'mimeType', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('chatMessages', 'locationLat', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn('chatMessages', 'locationLng', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn('chatMessages', 'locationName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('chatMessages', 'locationName');
    await queryInterface.removeColumn('chatMessages', 'locationLng');
    await queryInterface.removeColumn('chatMessages', 'locationLat');
    await queryInterface.removeColumn('chatMessages', 'mimeType');
    await queryInterface.removeColumn('chatMessages', 'fileSize');
    await queryInterface.removeColumn('chatMessages', 'fileName');
    await queryInterface.removeColumn('chatMessages', 'fileUrl');
    await queryInterface.removeColumn('chatMessages', 'messageType');
  },
};
