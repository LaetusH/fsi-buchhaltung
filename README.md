# FSi Portal

## Cash register connection (Kassensystem)

The event planning workspace gains a "Kasse" tab (visible to users with the
`cash_register.manage` permission) that shows the sales overview of the linked
kassensystem event: revenue, Fachschaft payments, given-out items, and an
hourly revenue chart.

To enable it, set in `.env`:

- `CASH_REGISTER_MODE=connected`
- `CASH_REGISTER_DB_HOST/PORT/NAME` — the kassensystem database
- `CASH_REGISTER_DB_USER/PASSWORD` — the restricted read-only user created by
  the **kassensystem's** `npm run setup:connection-db-user`

### Single sign-on (SSO)

When both apps run on subdomains of the same parent domain (e.g.
`buchhaltung.example.com` and `kasse.example.com`), a user logged into the
buchhaltung can use the kassensystem without logging in again.

Set in the **buchhaltung's** `.env`:

```
COOKIE_DOMAIN=.example.com
```

The session cookie is then scoped to `.example.com` and the browser sends it to
the kassensystem as well. Set the **kassensystem's** `ACCOUNTING_SESSION_COOKIE_NAME`
to match the buchhaltung's `SESSION_COOKIE_NAME` (both default to `fsi_session_db`).

Without `COOKIE_DOMAIN` the cookie stays bound to the exact host — single-origin
deployments are unaffected.

### Connection database users

Each application creates the restricted user for the *other* application in
its own database:

```bash
npm run setup:connection-db-user
```

reads `CONNECTION_DB_USER` / `CONNECTION_DB_PASSWORD` from `.env` and creates a
user in this accounting database with only the privileges the kassensystem
needs in connected mode: `SELECT` on `users`, `members`, `events`, `roles`,
`user_roles`, `role_permissions`, `user_permissions` and
`SELECT/INSERT/UPDATE/DELETE` on `sessions`. The kassensystem then uses these
credentials as `ACCOUNTING_DB_USER` / `ACCOUNTING_DB_PASSWORD`.

The script is idempotent (it re-syncs password and grants) and runs
automatically inside docker compose; it skips itself when the env variables
are not set.
