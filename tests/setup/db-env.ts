import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertTestDatabase } from './guard'

const root = fileURLToPath(new URL('../../', import.meta.url))
const envFile = path.join(root, '.env.test')

if (!fs.existsSync(envFile)) {
  throw new Error('.env.test is missing. Copy .env.test.example to .env.test.')
}

process.loadEnvFile(envFile)
process.env.TZ = 'UTC'
process.env.NOTIFICATIONS_DISPATCH_DISABLED = 'true'
process.env.MEMBER_LEAVE_DISPATCH_DISABLED = 'true'

process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fsi-test-uploads-'))

assertTestDatabase()
