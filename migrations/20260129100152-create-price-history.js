'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('priceHistories', {
      priceHistoryId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
      },
      listingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'listings',
          key: 'listingId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      oldPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      newPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      changedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add index for faster queries
    await queryInterface.addIndex('priceHistories', ['listingId', 'createdAt']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('priceHistories');
  }
};
