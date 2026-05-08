'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.dropTable('savedSearches');

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
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      queryText: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      filters: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      listingIds: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        allowNull: false,
        defaultValue: [],
      },
      resultsCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      source: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.addIndex('savedSearches', ['queryText']);
  },
};
