# Export current DB to Sequelize seeders

This helper script inspects the live database (via your configured Sequelize models) and writes `seeders/*.js` files with the current rows.

Usage

1. Ensure your DB environment (config/config.env) is set and the DB is reachable.
2. Run:

```bash
node tools/exportSeeders.js
```

3. The script will write timestamped seeder files to the `seeders/` directory.

Notes

- The script uses `Model.findAll({ raw: true })` so it will dump plain rows. Review generated seeders and remove or redact any secrets (password hashes) before committing.
- If you use UUIDs generated in DB or sequence IDs, review down/up logic.
- This script does not automatically run the seeders. Use your project's existing Sequelize CLI or `npm run migrate`/`npm run seed` tasks to apply them.
