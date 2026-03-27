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

const ALL_PERMISSION_KEYS = [
  'cash_register.use',
  'cash_register.manage',
  'pages.home.view',
  'members.view',
  'members.edit',
  'subjects.view',
  'subjects.edit',
  'positions.view',
  'receipts.view',
  'receipts.edit',
  'reimbursements.view',
  'reimbursements.edit',
  'cash_counts.view',
  'cash_counts.edit',
  'events.view',
  'events.edit',
  'companies.view',
  'companies.edit',
  'spheres.view',
  'cost_centres.view',
  'subdivisions.view',
  'settings.access',
  'settings.association.manage',
  'settings.spheres.manage',
  'settings.cost_centres.manage',
  'settings.subdivisions.manage',
  'settings.positions.manage',
  'permissions.manage',
  'files.view',
  'users.view',
  'users.manage',
]

const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSION_KEYS,
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

async function ensureRole(conn, userId, code, permissions) {
  const existing = await conn.query(
    'SELECT id FROM roles WHERE code = ? LIMIT 1',
    [code]
  )

  let roleId = existing.length ? Number(existing[0].id) : null

  if (!roleId) {
    const result = await conn.query(
      `INSERT INTO roles (code, name, is_active, is_default, description, created_by)
       VALUES (?, ?, 1, ?, NULL, ?)`,
      [code, code.toUpperCase(), code === 'user' ? 1 : 0, userId]
    )
    roleId = Number(result.insertId)
  }

  for (const permissionKey of permissions) {
    await conn.query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_key)
       VALUES (?, ?)`,
      [roleId, permissionKey]
    )
  }

  return roleId
}

async function main() {
  let conn

  try {
    conn = await pool.getConnection()

    const existing = await conn.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [ADMIN_USERNAME]
    )

    let userId

    if (existing.length) {
      userId = Number(existing[0].id)
      console.log(`seed-admin: user "${ADMIN_USERNAME}" already exists`)
    } else {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
      const result = await conn.query(
        'INSERT INTO users (username, password_hash, is_active) VALUES (?, ?, 1)',
        [ADMIN_USERNAME, hash]
      )
      userId = Number(result.insertId)
      console.log(`seed-admin: created admin user "${ADMIN_USERNAME}"`)
    }

    const roleIds = []
    for (const [code, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const roleId = await ensureRole(conn, userId, code, permissions)
      roleIds.push(roleId)
    }

    for (const roleId of roleIds) {
      await conn.query(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
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
