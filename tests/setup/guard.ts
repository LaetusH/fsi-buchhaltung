export interface TestDbTarget {
  host: string
  port: number
  user: string
  database: string
}

const REQUIRED_DB_SUFFIX = '_test'

const EXPECTED_PORT = 3309

const FORBIDDEN_HOSTS = ['buchhaltung-db', 'buchhaltung-db-local', 'kasse-db']

export function assertTestDatabase(): TestDbTarget {
  const host = process.env.DB_HOST ?? ''
  const port = Number(process.env.DB_PORT ?? 0)
  const user = process.env.DB_USER ?? ''
  const database = process.env.DB_NAME ?? ''

  const problems: string[] = []

  if (!database.endsWith(REQUIRED_DB_SUFFIX)) {
    problems.push(`DB_NAME must end in "${REQUIRED_DB_SUFFIX}" (got "${database}")`)
  }
  if (port !== EXPECTED_PORT) {
    problems.push(`DB_PORT must be ${EXPECTED_PORT}, the port docker-compose.test.yml publishes (got "${process.env.DB_PORT}")`)
  }
  if (FORBIDDEN_HOSTS.includes(host)) {
    problems.push(`DB_HOST "${host}" is a non-test host`)
  }
  if (!host) {
    problems.push('DB_HOST is empty')
  }

  if (problems.length) {
    throw new Error(
      'Refusing to run database tests against a non-test target.\n'
      + problems.map(problem => `  - ${problem}`).join('\n')
      + '\nCheck .env.test (see .env.test.example) and that docker-compose.test.yml is running.',
    )
  }

  return { host, port, user, database }
}
