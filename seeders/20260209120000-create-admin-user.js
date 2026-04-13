"use strict";

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);
    const hashedPassword = await bcrypt.hash("Admin@123", saltRounds);

    return queryInterface.bulkInsert(
      "users",
      [
        {
          userId: uuidv4(),
          title: "Mr",
          firstName: "Innocent",
          lastName: "Hlongwane",
          email: "innocent38318@gmail.com",
          dateOfBirth: null,
          idNumber: null,
          profilePicture: null,
          passwordHash: hashedPassword,
          phone: "+27123456789",
          status: "active",
          userType: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return queryInterface.bulkDelete(
      "users",
      { email: "admin@easyplug.com" },
      {},
    );
  },
};
