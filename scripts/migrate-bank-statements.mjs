import mariadb from 'mariadb'

const {
  DB_HOST = 'buchhaltung-db-local',
  DB_PORT = '3307',
  DB_USER = 'fsi',
  DB_PASSWORD = 'fsi_password',
  DB_NAME = 'fsi_buchhaltung',
  DB_AUDIT_SETUP_USER,
  DB_AUDIT_SETUP_PASSWORD,
  DB_CONN_LIMIT = '2',
} = process.env

async function migrateBankStatements() {
  const migrationUser = DB_AUDIT_SETUP_USER || DB_USER
  const migrationPassword = DB_AUDIT_SETUP_USER
    ? (DB_AUDIT_SETUP_PASSWORD ?? '')
    : DB_PASSWORD

  const pool = mariadb.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: migrationUser,
    password: migrationPassword,
    database: DB_NAME,
    connectionLimit: Number(DB_CONN_LIMIT),
  })

  let conn
  try {
    conn = await pool.getConnection()
    await conn.beginTransaction()

    await conn.query(`
      CREATE TABLE IF NOT EXISTS bank_statements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        statement_number VARCHAR(50) NOT NULL,
        checked_by BIGINT UNSIGNED NOT NULL,
        statement_date TIMESTAMP NOT NULL,
        FOREIGN KEY (checked_by) REFERENCES members(id)
      )
    `)

    await conn.query(`
      CREATE TABLE IF NOT EXISTS bank_statement_positions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        bank_statement_id BIGINT UNSIGNED NOT NULL,
        position_type ENUM('receipt','invoice','event') NOT NULL,
        position_date DATE NOT NULL,
        receipt_id BIGINT UNSIGNED NULL,
        invoice_id BIGINT UNSIGNED NULL,
        event_id BIGINT UNSIGNED NULL,
        amount DECIMAL(10,2) NULL,
        notes TEXT NULL,
        UNIQUE KEY uq_bsp_receipt (receipt_id),
        UNIQUE KEY uq_bsp_invoice (invoice_id),
        FOREIGN KEY (bank_statement_id) REFERENCES bank_statements(id) ON DELETE CASCADE,
        FOREIGN KEY (receipt_id) REFERENCES receipts(id),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (event_id) REFERENCES events(id)
      )
    `)

    await conn.commit()
    console.log('Migration bank-statements complete.')
  } catch (err) {
    if (conn) await conn.rollback()
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateBankStatements()
