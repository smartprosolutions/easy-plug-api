'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('wishlists', {
      wishlistId: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Unique constraint: user can only wishlist an item once
    await queryInterface.addConstraint('wishlists', {
      fields: ['userId', 'listingId'],
      type: 'unique',
      name: 'unique_user_listing_wishlist'
    });

    // Add indexes for faster queries
    await queryInterface.addIndex('wishlists', ['userId']);
    await queryInterface.addIndex('wishlists', ['listingId']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('wishlists');
  }
};
