import mariadb from 'mariadb'
import { normalizeBigInt } from '~/server/utils/normalize'

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: Number(process.env.DB_CONN_LIMIT || 5),
  dateStrings: true
})

export async function query<T = any>(sql: string, params?: unknown[]): Promise<T> {
  let conn
  try {
    conn = await pool.getConnection()
    return normalizeBigInt(await conn.query(sql, params))
  } finally {
    if (conn) conn.release()
  }
}