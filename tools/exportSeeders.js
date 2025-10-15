/**
 * Export current DB rows into Sequelize seeders.
 * Usage: node tools/exportSeeders.js
 * Requires your environment/config to be set so models can connect to DB.
 */
const fs = require("fs");
const path = require("path");
const { sequelize, Sequelize } = require("../models");
const db = require("../models");

async function exportAll() {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    const seedDir = path.join(__dirname, "..", "seeders");
    if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir);

    for (const modelName of Object.keys(db)) {
      if (!db[modelName].findAll) continue;
      if (["sequelize", "Sequelize"].includes(modelName)) continue;

      const Model = db[modelName];
      const rows = await Model.findAll({ raw: true });
      if (!rows || rows.length === 0) continue;

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14);
      const filename = `${timestamp}_seed-${modelName}.js`;
      const filepath = path.join(seedDir, filename);

      const content = `"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('${
      Model.tableName || modelName
    }', ${JSON.stringify(rows, null, 2)}, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('${
      Model.tableName || modelName
    }', null, {});
  }
};
`;
      fs.writeFileSync(filepath, content, "utf8");
      console.log("Wrote", filepath);
      // wait 1s to ensure unique timestamps
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

exportAll();
