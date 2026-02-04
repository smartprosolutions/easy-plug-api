# Copilot instructions for easy-plug-api

## Project architecture (big picture)
- Express API entry is app.js; it loads env from config/config.env, mounts versioned routes at /api/${API_VERSION || "v1"}, and serves /uploads statically.
- Route wiring lives in routes/index.js, which maps resource routers (auth, users, listings, seller-info, etc.) to controllers/*.js.
- Persistence uses Sequelize. Models are auto-loaded/associated in models/index.js and migrations live in migrations/*. Use config/config.json for DB connection (NODE_ENV selects config).

## Request/auth patterns
- Auth uses JWT: middleware/auth.js expects Authorization: Bearer <token> (or cookie token) and sets req.user = { id, email }.
- Role gating uses middleware/protect.js with user.userType values (e.g., "seller").
- Controllers generally return JSON in the shape { success: true/false, ... } and error handling is centralized by middleware/error.js.
- Some controllers use utils/response.js helpers (`fail`, `success`). Keep this pattern consistent within a file.

## Files & uploads
- express-fileupload is enabled globally; file uploads are handled in controllers/authController.js and controllers/usersController.js.
- Uploaded files are stored under uploads/pictures/{email} with sanitized filenames and served via the /uploads static route in app.js.

## Integrations
- Google Sign-In: controllers/authController.js uses google-auth-library; relies on GOOGLE_CLIENT_ID.
- Email: utils/email.js uses nodemailer with SMTP_* env vars; email templates in utils/emailTemplates.js.
- Payments: utils/payfast.js builds PayFast payloads and verifies IPN. Env vars: PAYFAST_*.

## Developer workflows
- Start server: npm run start (node app.js)
- Dev server with reload: npm run dev
- Migrations: npm run migrate (undo all + re-run)
- Seeders: npm run seed; export current DB to seeders with node tools/exportSeeders.js (see README-SEEDERS.md).

## Code examples to follow
- Auth + JWT issuance and password hashing: controllers/authController.js.
- Listing queries with includes and pagination patterns: controllers/listingsController.js.
- User profile updates and upload handling: controllers/usersController.js.
