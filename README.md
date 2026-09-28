# Manager Document Portal

A browser-based prototype for manager document uploads and administrator approval.

## Demo accounts

- Administrator: `admin@portal.local` / `Admin123!`
- Manager: `manager@portal.local` / `Manager123!`

## Run

Open `index.html` in a modern browser.

This prototype stores users, document metadata, approvals, and uploaded files in browser `localStorage`. It is intended for demonstration/prototyping, not production security.

## Production upgrade

For deployment with real users and sensitive documents, replace the browser storage/authentication with a backend such as Node.js/Express or Next.js + PostgreSQL, secure password hashing (Argon2/bcrypt), server-side authorization, object storage (S3-compatible), HTTPS, CSRF/session protection, audit logging, file scanning/validation, and email notifications.
