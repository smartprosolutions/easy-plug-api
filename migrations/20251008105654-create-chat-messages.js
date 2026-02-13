'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chatMessages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      messageId: {
        type: Sequelize.INTEGER
      },
      chatId: {
        type: Sequelize.INTEGER
      },
      senderId: {
        type: Sequelize.UUID
      },
      receiverId: {
        type: Sequelize.UUID
      },
      message: {
        type: Sequelize.TEXT
      },
      imaages: {
        type: Sequelize.ARRAY(Sequelize.TEXT)
      },
      isRead: {
        type: Sequelize.BOOLEAN
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
    await queryInterface.dropTable('chatMessages');
  }
};