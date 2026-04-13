'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('activityLogs', {
      activityId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'e.g., view_listing, search, add_to_wishlist, send_message'
      },
      entityType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'listing, user, chat, etc.'
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID of the entity being acted upon'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Flexible storage for action-specific data'
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      browser: {
        type: Sequelize.STRING,
        allowNull: true
      },
      device: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'mobile, tablet, desktop'
      },
      os: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Operating system'
      },
      sessionId: {
        type: Sequelize.STRING,
        allowNull: true
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

    // Add indexes for common queries
    await queryInterface.addIndex('activityLogs', ['userId', 'createdAt']);
    await queryInterface.addIndex('activityLogs', ['action']);
    await queryInterface.addIndex('activityLogs', ['entityType', 'entityId']);
    await queryInterface.addIndex('activityLogs', ['createdAt']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('activityLogs');
  }
};
