import mariadb from 'mariadb'
import bcrypt from 'bcrypt'

const {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  DB_HOST = 'db',
  DB_USER = 'fsi',
  DB_PASSWORD = 'fsi_password',
  DB_NAME = 'fsi_buchhaltung',
  DB_CONN_LIMIT = '5'
} = process.env

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.log('seed-admin: skipped (ADMIN_USERNAME or ADMIN_PASSWORD not set)')
  process.exit(0)
}

const pool = mariadb.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionLimit: Number(DB_CONN_LIMIT)
})

async function main() {
  let conn
  try {
    conn = await pool.getConnection()
    const existing = await conn.query('SELECT id FROM users WHERE username = ? LIMIT 1', [ADMIN_USERNAME])
    if (existing && existing.length) {
      console.log(`seed-admin: user "${ADMIN_USERNAME}" already exists, skipping`)
      return
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
    const userRow = await conn.query(
      'INSERT INTO users (username, password_hash, is_active) VALUES (?, ?, 1)',
      [ADMIN_USERNAME, hash]
    )
    const userId = userRow.insertId
    console.log(`seed-admin: created admin user "${ADMIN_USERNAME}"`)

    const DEFAULT_ROLE_PERMISSIONS = {
      admin: PERMISSIONS.map(p => p.key),
      user: [
        'pages.home.view',
        'members.view',
        'receipts.view',
        'reimbursements.view',
        'companies.view',
        'subjects.view',
        'positions.view',
        'spheres.view',
        'cost_centres.view',
      ],
    }

    const existingRoles = await query(
      `SELECT id FROM roles LIMIT 1`
    )
    if (existingRoles.length) return
  
    const default_roles = []

    await withTransaction(async (conn) => {
      for (const [code, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        const res = await query(
          `INSERT INTO roles (code, name, is_active, is_default, description, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [code, code.toUpperCase(), 1, code === 'user' ? 1 : 0, null, userId],
          conn
        )
        default_roles.push(res.insertId)
  
        for (const key of permissions) {
          await query(
            `INSERT INTO role_permissions (role_id, permission_key)
             VALUES (?, ?)`,
            [res.insertId, key],
            conn
          )
        }
      }
    })

    for (const roleId of default_roles) {
      await conn.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, roleId]
      )
    }
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('seed-admin: failed', err)
  process.exit(1)
})
