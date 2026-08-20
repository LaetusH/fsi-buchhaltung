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

const WIKI_PERMISSION_KEYS = ['wiki.view', 'wiki.edit', 'wiki.review', 'wiki.manage']

// Kept in sync with db/init.sql. `wiki_articles` is created without its FULLTEXT index here so a
// storage engine that refuses the index cannot take the whole table down with it — see
// ensureFulltextIndex().
const TABLES = [
  ['wiki_spaces', `
    CREATE TABLE IF NOT EXISTS wiki_spaces (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(100) NOT NULL UNIQUE,
      title VARCHAR(150) NOT NULL,
      description VARCHAR(500) NOT NULL DEFAULT '',
      icon VARCHAR(100) NOT NULL DEFAULT 'material-symbols:menu-book-rounded',
      position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      requires_review TINYINT(1) NOT NULL DEFAULT 0,
      is_archived TINYINT(1) NOT NULL DEFAULT 0,
      owner_position_id BIGINT UNSIGNED NULL,
      owner_subdivision_id MEDIUMINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_position_id) REFERENCES positions(id) ON DELETE SET NULL,
      FOREIGN KEY (owner_subdivision_id) REFERENCES subdivisions(id) ON DELETE SET NULL
    )
  `],
  ['wiki_articles', `
    CREATE TABLE IF NOT EXISTS wiki_articles (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      space_id BIGINT UNSIGNED NOT NULL,
      parent_id BIGINT UNSIGNED NULL,
      slug VARCHAR(120) NOT NULL,
      title VARCHAR(200) NOT NULL,
      summary VARCHAR(500) NOT NULL DEFAULT '',
      icon VARCHAR(100) NULL,
      position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      status ENUM('draft','in_review','published','archived') NOT NULL DEFAULT 'draft',
      content_md MEDIUMTEXT NULL,
      content_html MEDIUMTEXT NULL,
      content_text MEDIUMTEXT NULL,
      draft_md MEDIUMTEXT NULL,
      draft_updated_at TIMESTAMP NULL,
      draft_updated_by BIGINT UNSIGNED NULL,
      review_interval_days SMALLINT UNSIGNED NULL,
      reviewed_at TIMESTAMP NULL,
      reviewed_by BIGINT UNSIGNED NULL,
      published_at TIMESTAMP NULL,
      owner_position_id BIGINT UNSIGNED NULL,
      owner_subdivision_id MEDIUMINT UNSIGNED NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wiki_article_slug (space_id, slug),
      KEY idx_wiki_article_parent (parent_id),
      FOREIGN KEY (space_id) REFERENCES wiki_spaces(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES wiki_articles(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (draft_updated_by) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id),
      FOREIGN KEY (owner_position_id) REFERENCES positions(id) ON DELETE SET NULL,
      FOREIGN KEY (owner_subdivision_id) REFERENCES subdivisions(id) ON DELETE SET NULL
    )
  `],
  ['wiki_access_grants', `
    CREATE TABLE IF NOT EXISTS wiki_access_grants (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      scope_type ENUM('space','article') NOT NULL,
      scope_id BIGINT UNSIGNED NOT NULL,
      include_descendants TINYINT(1) NOT NULL DEFAULT 1,
      subject_type ENUM('user','role','position','subdivision','permission') NOT NULL,
      subject_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
      subject_key VARCHAR(100) NOT NULL DEFAULT '',
      access_level ENUM('read','write','admin') NOT NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wiki_grant (scope_type, scope_id, subject_type, subject_id, subject_key, access_level),
      KEY idx_wiki_grant_scope (scope_type, scope_id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `],
  ['wiki_tags', `
    CREATE TABLE IF NOT EXISTS wiki_tags (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(60) NOT NULL UNIQUE,
      label VARCHAR(80) NOT NULL
    )
  `],
  ['wiki_article_tags', `
    CREATE TABLE IF NOT EXISTS wiki_article_tags (
      article_id BIGINT UNSIGNED NOT NULL,
      tag_id BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (article_id, tag_id),
      FOREIGN KEY (article_id) REFERENCES wiki_articles(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES wiki_tags(id) ON DELETE CASCADE
    )
  `],
  ['wiki_article_revisions', `
    CREATE TABLE IF NOT EXISTS wiki_article_revisions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      article_id BIGINT UNSIGNED NOT NULL,
      revision_number INT UNSIGNED NOT NULL,
      title VARCHAR(200) NOT NULL,
      summary VARCHAR(500) NOT NULL DEFAULT '',
      content_md MEDIUMTEXT NOT NULL,
      change_note VARCHAR(300) NOT NULL DEFAULT '',
      created_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wiki_revision (article_id, revision_number),
      FOREIGN KEY (article_id) REFERENCES wiki_articles(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `],
  ['wiki_paths', `
    CREATE TABLE IF NOT EXISTS wiki_paths (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(100) NOT NULL UNIQUE,
      title VARCHAR(200) NOT NULL,
      description VARCHAR(1000) NOT NULL DEFAULT '',
      icon VARCHAR(100) NOT NULL DEFAULT 'material-symbols:hiking-rounded',
      position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      is_published TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `],
  ['wiki_path_items', `
    CREATE TABLE IF NOT EXISTS wiki_path_items (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      path_id BIGINT UNSIGNED NOT NULL,
      article_id BIGINT UNSIGNED NOT NULL,
      position SMALLINT UNSIGNED NOT NULL,
      note VARCHAR(300) NOT NULL DEFAULT '',
      FOREIGN KEY (path_id) REFERENCES wiki_paths(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES wiki_articles(id) ON DELETE CASCADE
    )
  `],
  ['wiki_path_audiences', `
    CREATE TABLE IF NOT EXISTS wiki_path_audiences (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      path_id BIGINT UNSIGNED NOT NULL,
      position_id BIGINT UNSIGNED NULL,
      subdivision_id MEDIUMINT UNSIGNED NULL,
      FOREIGN KEY (path_id) REFERENCES wiki_paths(id) ON DELETE CASCADE,
      FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
      FOREIGN KEY (subdivision_id) REFERENCES subdivisions(id) ON DELETE CASCADE
    )
  `],
  ['wiki_path_progress', `
    CREATE TABLE IF NOT EXISTS wiki_path_progress (
      user_id BIGINT UNSIGNED NOT NULL,
      path_item_id BIGINT UNSIGNED NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, path_item_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (path_item_id) REFERENCES wiki_path_items(id) ON DELETE CASCADE
    )
  `],
  ['wiki_checklists', `
    CREATE TABLE IF NOT EXISTS wiki_checklists (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      article_id BIGINT UNSIGNED NOT NULL,
      key_slug VARCHAR(80) NOT NULL,
      title VARCHAR(200) NOT NULL,
      mode ENUM('personal','shared') NOT NULL DEFAULT 'personal',
      UNIQUE KEY uq_wiki_checklist (article_id, key_slug),
      FOREIGN KEY (article_id) REFERENCES wiki_articles(id) ON DELETE CASCADE
    )
  `],
  ['wiki_checklist_items', `
    CREATE TABLE IF NOT EXISTS wiki_checklist_items (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      checklist_id BIGINT UNSIGNED NOT NULL,
      label VARCHAR(300) NOT NULL,
      hint VARCHAR(500) NOT NULL DEFAULT '',
      target_page VARCHAR(80) NULL,
      target_meta TEXT NULL,
      position SMALLINT UNSIGNED NOT NULL,
      FOREIGN KEY (checklist_id) REFERENCES wiki_checklists(id) ON DELETE CASCADE
    )
  `],
  ['wiki_checklist_personal_state', `
    CREATE TABLE IF NOT EXISTS wiki_checklist_personal_state (
      user_id BIGINT UNSIGNED NOT NULL,
      item_id BIGINT UNSIGNED NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, item_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES wiki_checklist_items(id) ON DELETE CASCADE
    )
  `],
  ['wiki_checklist_runs', `
    CREATE TABLE IF NOT EXISTS wiki_checklist_runs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      checklist_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(200) NOT NULL,
      due_date DATE NULL,
      closed_at TIMESTAMP NULL,
      created_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checklist_id) REFERENCES wiki_checklists(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `],
  ['wiki_checklist_run_state', `
    CREATE TABLE IF NOT EXISTS wiki_checklist_run_state (
      run_id BIGINT UNSIGNED NOT NULL,
      item_id BIGINT UNSIGNED NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_by BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (run_id, item_id),
      FOREIGN KEY (run_id) REFERENCES wiki_checklist_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES wiki_checklist_items(id) ON DELETE CASCADE,
      FOREIGN KEY (completed_by) REFERENCES users(id)
    )
  `],
  ['wiki_glossary_terms', `
    CREATE TABLE IF NOT EXISTS wiki_glossary_terms (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      term VARCHAR(120) NOT NULL UNIQUE,
      short_definition VARCHAR(500) NOT NULL,
      article_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES wiki_articles(id) ON DELETE SET NULL
    )
  `],
  ['wiki_glossary_aliases', `
    CREATE TABLE IF NOT EXISTS wiki_glossary_aliases (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      term_id BIGINT UNSIGNED NOT NULL,
      alias VARCHAR(120) NOT NULL UNIQUE,
      FOREIGN KEY (term_id) REFERENCES wiki_glossary_terms(id) ON DELETE CASCADE
    )
  `],
  ['wiki_page_help', `
    CREATE TABLE IF NOT EXISTS wiki_page_help (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      page_name VARCHAR(80) NOT NULL,
      section_key VARCHAR(80) NOT NULL DEFAULT '',
      article_id BIGINT UNSIGNED NOT NULL,
      position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      UNIQUE KEY uq_wiki_page_help (page_name, section_key, article_id),
      FOREIGN KEY (article_id) REFERENCES wiki_articles(id) ON DELETE CASCADE
    )
  `],
  ['wiki_article_views', `
    CREATE TABLE IF NOT EXISTS wiki_article_views (
      user_id BIGINT UNSIGNED NOT NULL,
      article_id BIGINT UNSIGNED NOT NULL,
      last_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      view_count INT UNSIGNED NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, article_id),
      KEY idx_wiki_view_recent (user_id, last_viewed_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES wiki_articles(id) ON DELETE CASCADE
    )
  `],
]

const SPACES = [
  ['app', 'Die App', 'Wie das FSi Portal funktioniert: Anmeldung, Startseite, Benachrichtigungen und deine eigenen Daten.', 'material-symbols:smartphone', 10],
  ['finanzen', 'Finanzen', 'Belege, Rechnungen, Erstattungen, Kassenzählungen, Budgets und der Jahresabschluss.', 'material-symbols:euro-rounded', 20],
  ['veranstaltungen', 'Veranstaltungen', 'Von der ersten Idee über die Schichtplanung bis zur Nachbereitung.', 'material-symbols:event-rounded', 30],
  ['aemter', 'Ämter & Gremien', 'Wer macht was: Vorstand, Kassenwart, Schriftführung, Referate, Sitzungen und Wahlen.', 'material-symbols:gavel-rounded', 40],
  ['mitglied', 'Mitglied sein', 'Erste Schritte, Rechte und Pflichten, Satzung und Ordnungen, Datenschutz.', 'material-symbols:groups-rounded', 50],
  ['referate', 'Referate & Untergliederungen', 'Jedes Referat dokumentiert hier seine eigenen Abläufe.', 'material-symbols:diversity-3-rounded', 60],
]

async function tableExists(conn, databaseName, tableName) {
  const rows = await conn.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     LIMIT 1`,
    [databaseName, tableName],
  )
  return rows.length > 0
}

async function indexExists(conn, databaseName, tableName, indexName) {
  const rows = await conn.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, indexName],
  )
  return rows.length > 0
}

/**
 * FULLTEXT on InnoDB works from MariaDB 10.0 onwards, but the search util must survive an install
 * where it could not be created — so a failure here is a warning, not an abort. `wiki/search.ts`
 * probes for the index and falls back to LIKE.
 */
async function ensureFulltextIndex(conn, databaseName) {
  if (await indexExists(conn, databaseName, 'wiki_articles', 'ft_wiki_article')) return

  try {
    await conn.query('ALTER TABLE wiki_articles ADD FULLTEXT KEY ft_wiki_article (title, summary, content_text)')
    console.log('migrate-wiki: created FULLTEXT index ft_wiki_article')
  } catch (error) {
    console.warn(
      'migrate-wiki: could not create FULLTEXT index ft_wiki_article, wiki search will fall back to LIKE:',
      error?.message ?? error,
    )
  }
}

async function roleIdByCode(conn, code) {
  const rows = await conn.query('SELECT id FROM roles WHERE code = ? LIMIT 1', [code])
  return rows.length ? Number(rows[0].id) : null
}

async function defaultRoleId(conn) {
  const rows = await conn.query('SELECT id FROM roles WHERE is_default = 1 ORDER BY id LIMIT 1')
  if (rows.length) return Number(rows[0].id)
  return await roleIdByCode(conn, 'user')
}

/**
 * `ensureRole()` in seed-admin.mjs only seeds role_permissions when it *creates* a role, so an
 * already-seeded install would never pick the wiki keys up. Grant them here instead: `wiki.view` for
 * everyone through the default role, all four for the admin role.
 */
async function grantPermissions(conn) {
  const defaultRole = await defaultRoleId(conn)
  if (defaultRole) {
    await conn.query(
      'INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (?, ?)',
      [defaultRole, 'wiki.view'],
    )
    console.log('migrate-wiki: granted wiki.view to the default role')
  } else {
    console.warn('migrate-wiki: no default role found, skipped granting wiki.view')
  }

  const adminRole = await roleIdByCode(conn, 'admin')
  if (adminRole) {
    for (const key of WIKI_PERMISSION_KEYS) {
      await conn.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (?, ?)',
        [adminRole, key],
      )
    }
    console.log('migrate-wiki: granted all wiki permissions to the admin role')
  }
}

async function seedSpaces(conn) {
  for (const [slug, title, description, icon, position] of SPACES) {
    await conn.query(
      `INSERT IGNORE INTO wiki_spaces (slug, title, description, icon, position)
       VALUES (?, ?, ?, ?, ?)`,
      [slug, title, description, icon, position],
    )
  }
  console.log('migrate-wiki: seeded wiki spaces')
}

// Starter articles. Markdown only: `content_html` is rendered and cached by the app on first read
// (server/utils/wiki/detail.ts), which keeps this script free of the TypeScript render pipeline.
// `content_text` is seeded with the markdown so search finds these articles before anyone opens them.
const ARTICLES = [
  {
    space: 'app',
    slug: 'ueberblick',
    title: 'Überblick über das FSi Portal',
    summary: 'Was die App kann und wie du dich darin zurechtfindest.',
    position: 10,
    markdown: [
      '# Überblick über das FSi Portal',
      '',
      'Das FSi Portal bündelt die Verwaltung der Fachschaft an einer Stelle: Finanzen, Mitglieder,',
      'Veranstaltungen und Einstellungen. Was du siehst, hängt von deinen Berechtigungen ab – wenn dir',
      'ein Menüpunkt fehlt, fehlt dir die passende Berechtigung, nicht die Funktion.',
      '',
      '## Die Bereiche',
      '',
      '- **Finanzen** – Belege, Rechnungen, Erstattungen, Kassenzählungen, Kontoauszüge und Haushaltspläne.',
      '- **Veranstaltungen** – Planung, Schichten, Aufgaben und Checklisten.',
      '- **Mitglieder** – Stammdaten, Ämter und Untergliederungen.',
      '- **Einstellungen** – Vereinsdaten, Sphären, Kostenstellen, Benutzer und Berechtigungen.',
      '- **Wiki** – diese Sammlung: wie die App funktioniert und wie die FSi arbeitet.',
      '',
      ':::hinweis',
      'Das Wiki liegt nur auf Deutsch vor. Der Sprachumschalter oben übersetzt die Oberfläche,',
      'nicht die Artikel.',
      ':::',
      '',
      '## Weiterlesen',
      '',
      'Als Einstieg eignen sich [[wiki:app/anmeldung|Anmeldung und Passwort]] und',
      '[[wiki:mitglied/erste-schritte|Erste Schritte als Mitglied]].',
    ].join('\n'),
  },
  {
    space: 'app',
    slug: 'anmeldung',
    title: 'Anmeldung und Passwort',
    summary: 'Wie du dich anmeldest, dein Passwort änderst und was bei Problemen hilft.',
    position: 20,
    markdown: [
      '# Anmeldung und Passwort',
      '',
      'Du meldest dich mit deinem Benutzernamen und deinem Passwort an. Beides bekommst du von der',
      'Person, die im Vorstand die Benutzerverwaltung betreut.',
      '',
      '## Erstes Anmelden',
      '',
      '1. Benutzername und Startpasswort eingeben.',
      '2. Die App fordert dich auf, ein eigenes Passwort zu setzen.',
      '3. Danach landest du auf der Startseite.',
      '',
      ':::warnung',
      'Gib dein Passwort niemals weiter. Wer für dich etwas erledigen soll, bekommt einen eigenen',
      'Zugang mit den passenden Berechtigungen.',
      ':::',
      '',
      '## Passwort vergessen',
      '',
      'Es gibt bewusst keinen automatischen Zurücksetzen-Link. Melde dich beim Vorstand, dort wird dir',
      'ein neues Startpasswort gesetzt.',
    ].join('\n'),
  },
  {
    space: 'finanzen',
    slug: 'belege-erfassen',
    title: 'Beleg erfassen',
    summary: 'Wie ein Kassenbeleg in die Buchhaltung kommt – Schritt für Schritt.',
    position: 10,
    markdown: [
      '# Beleg erfassen',
      '',
      'Jede Ausgabe der Fachschaft braucht einen Beleg. Ohne Beleg gibt es keine Buchung und keine',
      'Erstattung – das ist keine Schikane, sondern die Grundlage für den Jahresabschluss und die',
      'Kassenprüfung.',
      '',
      '## So gehst du vor',
      '',
      '1. Beleg fotografieren oder als PDF bereithalten.',
      '2. Unter **Finanzen → Belege** einen neuen Beleg anlegen.',
      '3. Datum, Firma und Beschreibung eintragen.',
      '4. Die Positionen mit Betrag und Kostenstelle erfassen.',
      '5. Die Datei anhängen und speichern.',
      '',
      ':::tool{page="ReceiptCreate" meta=\'{"returnTarget":"self"}\' label="Beleg erfassen"}',
      '',
      '## Was ist eine Kostenstelle?',
      '',
      'Die Kostenstelle sagt, aus welchem Topf das Geld kommt. Ohne Kostenstelle lässt sich eine',
      'Ausgabe später keinem Haushaltsplan zuordnen.',
      '',
      ':::tipp',
      'Fotografiere den Beleg direkt an der Kasse. Thermopapier verblasst innerhalb weniger Wochen.',
      ':::',
      '',
      '## Wenn du das Geld ausgelegt hast',
      '',
      'Dann brauchst du zusätzlich eine Erstattung – siehe [[wiki:finanzen/erstattung-beantragen|Erstattung beantragen]].',
    ].join('\n'),
  },
  {
    space: 'finanzen',
    slug: 'erstattung-beantragen',
    title: 'Erstattung beantragen',
    summary: 'Geld zurückbekommen, das du für die Fachschaft ausgelegt hast.',
    position: 20,
    markdown: [
      '# Erstattung beantragen',
      '',
      'Hast du etwas aus eigener Tasche bezahlt, beantragst du eine Erstattung. Grundlage ist immer ein',
      'Beleg – lege ihn zuerst an, siehe [[wiki:finanzen/belege-erfassen|Beleg erfassen]].',
      '',
      '## Ablauf',
      '',
      '| Schritt | Wer |',
      '| --- | --- |',
      '| Beleg erfassen | du |',
      '| Erstattung anlegen und Kontodaten prüfen | du |',
      '| Freigabe | Kassenwart |',
      '| Überweisung | Kassenwart |',
      '',
      ':::hinweis',
      'Reiche Erstattungen innerhalb von vier Wochen ein. Später wird die Zuordnung zum richtigen',
      'Wirtschaftsjahr schwierig.',
      ':::',
    ].join('\n'),
  },
  {
    space: 'mitglied',
    slug: 'erste-schritte',
    title: 'Erste Schritte als Mitglied',
    summary: 'Was du in den ersten Wochen in der Fachschaft wissen solltest.',
    position: 10,
    markdown: [
      '# Erste Schritte als Mitglied',
      '',
      'Willkommen in der Fachschaft. Die wichtigsten Dinge zuerst:',
      '',
      '## 1. Zugang einrichten',
      '',
      'Du bekommst einen Zugang zum FSi Portal. Wie das abläuft, steht unter',
      '[[wiki:app/anmeldung|Anmeldung und Passwort]].',
      '',
      '## 2. Eigene Daten prüfen',
      '',
      'Unter **Meine Daten** siehst du, was über dich gespeichert ist. Adresse, Telefonnummer und',
      'E-Mail solltest du aktuell halten – die Einladungen zu Sitzungen gehen dorthin.',
      '',
      '## 3. Mitmachen',
      '',
      'Die Arbeit passiert in den Referaten und bei Veranstaltungen. Such dir ein Thema, das dich',
      'interessiert, und sprich die zuständige Person an.',
      '',
      ':::tipp',
      'Niemand erwartet, dass du am ersten Tag alles verstehst. Dieses Wiki ist genau dafür da.',
      ':::',
    ].join('\n'),
  },
  {
    space: 'aemter',
    slug: 'vorstandsinterna',
    title: 'Interna des Vorstands',
    summary: 'Beispielartikel mit eingeschränktem Zugriff.',
    position: 90,
    // Deliberately restricted, so the ACL is demonstrable from the first minute: a `read` grant
    // anywhere in the chain closes the article for everyone who does not match it.
    restrictTo: 'wiki.manage',
    markdown: [
      '# Interna des Vorstands',
      '',
      'Dieser Artikel ist ein Beispiel für einen eingeschränkten Bereich. Sichtbar ist er nur für',
      'Personen mit der Berechtigung „Wiki verwalten".',
      '',
      'So funktioniert der Zugriffsschutz im Wiki: Sobald irgendwo in der Kette – am Bereich, an einem',
      'übergeordneten Artikel oder am Artikel selbst – eine Berechtigung eingetragen ist, ist der',
      'Artikel nur noch für die eingetragenen Personen sichtbar. Ohne Eintrag ist er für alle mit',
      'Wiki-Zugang lesbar.',
    ].join('\n'),
  },
]

async function seedArticles(conn) {
  const userRows = await conn.query('SELECT id FROM users ORDER BY id LIMIT 1')
  if (!userRows.length) {
    console.warn('migrate-wiki: no users yet, skipping the starter articles (run this migration again after seed-admin)')
    return
  }
  const authorId = Number(userRows[0].id)

  const spaceRows = await conn.query('SELECT id, slug FROM wiki_spaces')
  const spaceIdBySlug = new Map(spaceRows.map(row => [row.slug, Number(row.id)]))

  for (const article of ARTICLES) {
    const spaceId = spaceIdBySlug.get(article.space)
    if (!spaceId) continue

    await conn.query(
      `INSERT IGNORE INTO wiki_articles
         (space_id, slug, title, summary, position, status, content_md, content_text, published_at, created_by)
       VALUES (?, ?, ?, ?, ?, 'published', ?, ?, CURRENT_TIMESTAMP, ?)`,
      [spaceId, article.slug, article.title, article.summary, article.position, article.markdown, article.markdown, authorId],
    )

    if (!article.restrictTo) continue

    const idRows = await conn.query(
      'SELECT id FROM wiki_articles WHERE space_id = ? AND slug = ? LIMIT 1',
      [spaceId, article.slug],
    )
    if (!idRows.length) continue

    await conn.query(
      `INSERT IGNORE INTO wiki_access_grants
         (scope_type, scope_id, include_descendants, subject_type, subject_id, subject_key, access_level, created_by)
       VALUES ('article', ?, 1, 'permission', 0, ?, 'read', ?)`,
      [Number(idRows[0].id), article.restrictTo, authorId],
    )
  }

  console.log('migrate-wiki: seeded starter articles')
}

async function migrateWiki() {
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
    timezone: 'UTC',
  })

  let conn

  try {
    conn = await pool.getConnection()
    const rows = await conn.query('SELECT DATABASE() AS db_name')
    const databaseName = rows[0]?.db_name?.trim()
    if (!databaseName) throw new Error('Failed to resolve current database name')

    for (const [tableName, statement] of TABLES) {
      const existed = await tableExists(conn, databaseName, tableName)
      await conn.query(statement)
      if (!existed) console.log(`migrate-wiki: created ${tableName}`)
    }

    await ensureFulltextIndex(conn, databaseName)
    await grantPermissions(conn)
    await seedSpaces(conn)
    await seedArticles(conn)

    console.log('migrate-wiki: complete')
  } finally {
    if (conn) conn.release()
    await pool.end()
  }
}

migrateWiki().catch((error) => {
  const errorCode = error?.code || error?.cause?.code
  if (errorCode === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || errorCode === 'ER_ACCESS_DENIED_ERROR') {
    const attemptedUser = DB_AUDIT_SETUP_USER || DB_USER
    const attemptedPasswordVar = DB_AUDIT_SETUP_USER ? 'DB_AUDIT_SETUP_PASSWORD' : 'DB_PASSWORD'
    console.error(
      `migrate-wiki: database authentication failed for user "${attemptedUser}". ` +
      `Check DB_HOST/DB_PORT/DB_NAME and the ${attemptedPasswordVar} value in .env.`,
    )
  }
  console.error('migrate-wiki: failed', error)
  process.exit(1)
})
