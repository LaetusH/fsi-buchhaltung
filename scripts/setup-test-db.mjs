import mariadb from 'mariadb'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { MIGRATION_SCRIPTS } from './migration-list.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')

try {
  process.loadEnvFile(path.join(projectRoot, '.env.test'))
} catch {
  console.error('setup-test-db: .env.test not found. Copy .env.test.example to .env.test first.')
  process.exit(1)
}

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3309',
  DB_USER = 'fsi_test',
  DB_PASSWORD = 'fsi_test',
  DB_NAME = '',
  DB_AUDIT_SETUP_USER,
  DB_AUDIT_SETUP_PASSWORD,
} = process.env

if (!DB_NAME.endsWith('_test')) {
  console.error(`setup-test-db: refusing to run — DB_NAME must end in "_test" (got "${DB_NAME}").`)
  process.exit(1)
}

const setupUser = DB_AUDIT_SETUP_USER || DB_USER
const setupPassword = DB_AUDIT_SETUP_USER ? (DB_AUDIT_SETUP_PASSWORD ?? '') : DB_PASSWORD
const reset = process.argv.includes('--reset')

async function connectWithRetry(options, attempts = 30) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await mariadb.createConnection(options)
    } catch (err) {
      if (attempt === attempts) {
        console.error(`setup-test-db: cannot reach MariaDB at ${DB_HOST}:${DB_PORT}.`)
        console.error('setup-test-db: start it with `npm run test:db:up`.')
        throw err
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

function runScript(file) {
  process.stdout.write(`  ${file} ... `)
  try {
    execFileSync(process.execPath, [path.join(scriptDir, file)], {
      cwd: projectRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    console.log('ok')
  } catch (err) {
    console.log('FAILED')
    process.stderr.write(String(err.stdout ?? ''))
    process.stderr.write(String(err.stderr ?? ''))
    throw new Error(`setup-test-db: ${file} failed`)
  }
}

async function main() {
  console.log(`setup-test-db: target ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`)

  const admin = await connectWithRetry({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: setupUser,
    password: setupPassword,
    multipleStatements: true,
  })

  try {
    if (reset) {
      console.log('setup-test-db: dropping database')
      await admin.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``)
    }

    await admin.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await admin.query(`GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO ?@'%'`, [DB_USER]).catch(() => {})
    await admin.query('FLUSH PRIVILEGES').catch(() => {})

    console.log('setup-test-db: applying db/init.sql')
    const initSql = await fs.readFile(path.join(projectRoot, 'db', 'init.sql'), 'utf8')
    await admin.query(`USE \`${DB_NAME}\``)
    await admin.query(initSql)
  } finally {
    await admin.end()
  }

  console.log(`setup-test-db: running ${MIGRATION_SCRIPTS.length} migrations`)
  for (const file of MIGRATION_SCRIPTS) runScript(file)

  console.log('setup-test-db: audit infrastructure')
  runScript('ensure-audit-infrastructure.mjs')

  console.log('setup-test-db: admin bootstrap')
  runScript('seed-admin.mjs')

  console.log('setup-test-db: done')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
