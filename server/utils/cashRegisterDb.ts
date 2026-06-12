import mariadb from 'mariadb'
import { normalizeBigInt } from '~/server/utils/normalize'

// Connection to the cash register (Kassensystem) database. Only active when
// CASH_REGISTER_MODE=connected; use the restricted read-only user created by
// the kassensystem's setup:connection-db-user script.
const cashRegisterMode = (process.env.CASH_REGISTER_MODE || 'standalone').toLowerCase()

let pool: mariadb.Pool | null = null

export function isCashRegisterConnected() {
  return cashRegisterMode === 'connected'
}

function getPool() {
  if (!pool) {
    pool = mariadb.createPool({
      host: process.env.CASH_REGISTER_DB_HOST || process.env.DB_HOST,
      port: Number(process.env.CASH_REGISTER_DB_PORT || 3306),
      user: process.env.CASH_REGISTER_DB_USER,
      password: process.env.CASH_REGISTER_DB_PASSWORD,
      database: process.env.CASH_REGISTER_DB_NAME || 'fsi_kasse',
      connectionLimit: Number(process.env.CASH_REGISTER_DB_CONN_LIMIT || 2),
      dateStrings: true,
    })
  }

  return pool
}

export async function cashRegisterQuery<T = any>(sql: string, params?: unknown[]): Promise<T> {
  if (!isCashRegisterConnected()) {
    throw new Error('Cash register connection is not configured')
  }

  const conn = await getPool().getConnection()
  try {
    const result = await conn.query(sql, params)
    return normalizeBigInt(result)
  } finally {
    conn.release()
  }
}
