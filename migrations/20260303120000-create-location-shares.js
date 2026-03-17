"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("location_shares", {
      shareId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "userId" },
        onDelete: "CASCADE",
      },
      token: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      durationMinutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "15 | 30 | 60 | 120",
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("location_shares", ["token"], { unique: true });
    await queryInterface.addIndex("location_shares", ["userId"]);
    await queryInterface.addIndex("location_shares", ["isActive"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("location_shares");
  },
};
