'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('chatMessages', 'parentMessageId', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('chatMessages', 'replyText', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('chatMessages', 'replySenderId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('chatMessages', 'replySenderId');
    await queryInterface.removeColumn('chatMessages', 'replyText');
    await queryInterface.removeColumn('chatMessages', 'parentMessageId');
  },
};
