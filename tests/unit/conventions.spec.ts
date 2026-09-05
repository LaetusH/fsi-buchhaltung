import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PERMISSIONS, implied, type PermissionKey } from '~/config/permissions'
import { messages } from '~/shared/i18n'
import { MIGRATION_SCRIPTS } from '~/scripts/migration-list.mjs'

/**
 * Guards for the cross-file invariants this codebase depends on but no type can express:
 * a permission that exists in TypeScript but not in the plain-JS admin seeder, a page
 * gated on a permission that was renamed, a German string with no English counterpart, a
 * migration added to package.json but forgotten in docker-compose.
 */

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

function collectKeys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix]
  if (!node || typeof node !== 'object') return []

  return Object.entries(node as Record<string, unknown>)
    .flatMap(([key, value]) => collectKeys(value, prefix ? `${prefix}.${key}` : key))
}

describe('permissions', () => {
  const permissionKeys = PERMISSIONS.map(permission => permission.key)

  it('has no duplicate keys', () => {
    expect(new Set(permissionKeys).size).toBe(permissionKeys.length)
  })

  it('gives every permission a label and category key', () => {
    for (const permission of PERMISSIONS) {
      expect(permission.labelKey, permission.key).toBeTruthy()
      expect(permission.categoryKey, permission.key).toBeTruthy()
    }
  })

  it('labels every permission in both languages', () => {
    const de = new Set(collectKeys(messages.de))
    const en = new Set(collectKeys(messages.en))

    for (const permission of PERMISSIONS) {
      expect(de.has(permission.labelKey), `de: ${permission.labelKey}`).toBe(true)
      expect(en.has(permission.labelKey), `en: ${permission.labelKey}`).toBe(true)
      expect(de.has(permission.categoryKey), `de: ${permission.categoryKey}`).toBe(true)
    }
  })

  it('only implies permissions that exist', () => {
    const known = new Set<string>(permissionKeys)
    for (const [key, impliedKeys] of Object.entries(implied)) {
      expect(known.has(key), `implied source ${key}`).toBe(true)
      for (const impliedKey of impliedKeys ?? []) {
        expect(known.has(impliedKey), `${key} implies unknown ${impliedKey}`).toBe(true)
      }
    }
  })

  it('never implies itself, directly or in a cycle', () => {
    // getUserPermissions expands `implied` in a fixpoint loop; a cycle would not hang it,
    // but it does signal a modelling mistake worth failing on.
    for (const key of Object.keys(implied) as PermissionKey[]) {
      const seen = new Set<string>()
      const stack = [...(implied[key] ?? [])]
      while (stack.length) {
        const next = stack.pop()!
        expect(next, `${key} implies itself`).not.toBe(key)
        if (seen.has(next)) continue
        seen.add(next)
        stack.push(...(implied[next as PermissionKey] ?? []))
      }
    }
  })

  /**
   * scripts/seed-admin.mjs cannot import the TypeScript union, so it keeps its own copy of
   * the key list. A key missing there means the bootstrapped admin silently lacks it.
   */
  it('is mirrored completely in scripts/seed-admin.mjs', () => {
    const source = read('scripts/seed-admin.mjs')
    const block = source.match(/const ALL_PERMISSION_KEYS = \[([\s\S]*?)\]/)
    expect(block, 'ALL_PERMISSION_KEYS not found in scripts/seed-admin.mjs').toBeTruthy()

    const seeded = new Set([...block![1]!.matchAll(/'([^']+)'/g)].map(match => match[1]!))

    const missing = permissionKeys.filter(key => !seeded.has(key))
    const stale = [...seeded].filter(key => !permissionKeys.includes(key as PermissionKey))

    expect(missing, 'missing from seed-admin.mjs').toEqual([])
    expect(stale, 'no longer a PermissionKey').toEqual([])
  })
})

describe('pages', () => {
  // config/pages.ts imports .vue components, which this project cannot load without the
  // Nuxt/Vite pipeline, so the permission references are read from the source text.
  const source = read('config/pages.ts')
  const permissionKeys = new Set<string>(PERMISSIONS.map(permission => permission.key))

  it('only gates pages on permissions that exist', () => {
    const entries = [...source.matchAll(/permissions:\s*\[([^\]]*)\]/g)]
    expect(entries.length).toBeGreaterThan(0)

    const referenced = entries.flatMap(entry => [...entry[1]!.matchAll(/'([^']+)'/g)].map(match => match[1]!))
    const unknown = [...new Set(referenced)].filter(key => !permissionKeys.has(key))

    expect(unknown, 'permissions referenced in config/pages.ts but not in config/permissions.ts').toEqual([])
  })

  const definitions = [...source.matchAll(/^\s{2}(\w+):\s*\{(.+)\},?$/gm)]

  // layouts/default.vue renders `main: true` pages as the top-level menu and the file
  // itself says not to exceed eight. Guest-only pages (Login) are never shown next to the
  // others, so they do not count against the budget.
  it('keeps at most 8 main pages for a signed-in user', () => {
    const mainPages = definitions.filter(([, , body]) =>
      /main:\s*true/.test(body!) && !/allowGuest:\s*true/.test(body!))

    expect(mainPages.map(([, name]) => name).length).toBeLessThanOrEqual(8)
  })

  it('gives every main page an icon', () => {
    expect(definitions.length).toBeGreaterThan(0)

    for (const [, name, body] of definitions) {
      if (!/main:\s*true/.test(body!)) continue
      expect(/icon:\s*'/.test(body!), `main page ${name} has no icon`).toBe(true)
    }
  })
})

describe('i18n', () => {
  const deKeys = collectKeys(messages.de)
  const enKeys = collectKeys(messages.en)

  it('translates every German key into English', () => {
    const missing = deKeys.filter(key => !new Set(enKeys).has(key))
    expect(missing, 'keys present in de but missing in en').toEqual([])
  })

  it('has no English key without a German original', () => {
    // German is the source of truth, so a stray English-only key is dead weight.
    const missing = enKeys.filter(key => !new Set(deKeys).has(key))
    expect(missing, 'keys present in en but missing in de').toEqual([])
  })

  // Deliberately blank: a custom notification starts from an empty subject and body.
  const INTENTIONALLY_EMPTY = [
    'notifications.types.custom.message.subject',
    'notifications.types.custom.message.body',
  ]

  it('leaves no message empty by accident', () => {
    const empty = deKeys.filter((key) => {
      if (INTENTIONALLY_EMPTY.includes(key)) return false
      const value = key.split('.').reduce<any>((node, segment) => node?.[segment], messages.de)
      return typeof value === 'string' && value.trim() === ''
    })
    expect(empty, 'empty German messages').toEqual([])
  })
})

describe('migrations', () => {
  const compose = read('docker-compose.yml')
  const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> }

  it('lists only scripts that exist', () => {
    for (const file of MIGRATION_SCRIPTS) {
      expect(fs.existsSync(path.join(root, 'scripts', file)), file).toBe(true)
    }
  })

  it('lists every migrate-*.mjs script in scripts/', () => {
    const onDisk = fs.readdirSync(path.join(root, 'scripts'))
      .filter(file => file.startsWith('migrate-') && file.endsWith('.mjs'))

    expect([...onDisk].sort(), 'scripts/migration-list.mjs is out of date')
      .toEqual([...MIGRATION_SCRIPTS].sort())
  })

  /**
   * The `app` service in docker-compose.yml runs the migrations on every deploy. If its
   * order and the shared list disagree, a fresh install and the test database get
   * different schemas -- exactly the kind of drift that makes a green test run worthless.
   */
  it('runs them in docker-compose.yml in the same order', () => {
    const command = compose.match(/command:\s*sh -c "([^"]+)"/)?.[1]
    expect(command, 'app service command not found in docker-compose.yml').toBeTruthy()

    const inCompose = [...command!.matchAll(/node scripts\/(migrate-[\w-]+\.mjs)/g)].map(match => match[1]!)

    expect(inCompose).toEqual(MIGRATION_SCRIPTS)
  })

  it('runs the audit setup after every migration', () => {
    const command = compose.match(/command:\s*sh -c "([^"]+)"/)![1]!
    const lastMigration = command.lastIndexOf('migrate-')
    expect(command.indexOf('setup:audit')).toBeGreaterThan(lastMigration)
  })

  it('exposes a setup:migrate script in package.json for each migration', () => {
    const referenced = new Set(
      Object.values(packageJson.scripts)
        .flatMap(script => [...script.matchAll(/scripts\/(migrate-[\w-]+\.mjs)/g)].map(match => match[1]!)),
    )

    const missing = MIGRATION_SCRIPTS.filter(file => !referenced.has(file))
    expect(missing, 'migrations with no npm script').toEqual([])
  })
})
