'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('savedSearches', {
      savedSearchId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'userId',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      listingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'listings',
          key: 'listingId',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('savedSearches', ['createdAt']);
    await queryInterface.addIndex('savedSearches', ['userId', 'createdAt']);
    await queryInterface.addIndex('savedSearches', ['listingId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('savedSearches');
  },
};
