-- Schema initialization for fsi-buchhaltung
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(31) NOT NULL UNIQUE,
  name VARCHAR(127) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  PRIMARY KEY (role_id, permission_key),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id BIGINT UNSIGNED NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  PRIMARY KEY (user_id, permission_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (token_hash)
);

CREATE TABLE IF NOT EXISTS entity_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(128) NOT NULL,
  record_key VARCHAR(512) NOT NULL,
  primary_key_json LONGTEXT NOT NULL,
  operation VARCHAR(16) NOT NULL,
  state LONGTEXT NULL,
  changed_by BIGINT UNSIGNED NULL,
  changed_by_username VARCHAR(255) NULL,
  changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_entity_versions_lookup (table_name, record_key, id),
  INDEX idx_entity_versions_changed_at (changed_at),
  INDEX idx_entity_versions_changed_by (changed_by)
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(127) NOT NULL PRIMARY KEY,
  setting_value TEXT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(63) NOT NULL
);

CREATE TABLE IF NOT EXISTS positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(127) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT
);

CREATE TABLE IF NOT EXISTS position_permissions (
  position_id BIGINT UNSIGNED NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  PRIMARY KEY (position_id, permission_key),
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account BIGINT UNSIGNED,
  last_name VARCHAR(127) NOT NULL,
  first_name VARCHAR(127) NOT NULL,
  birthdate DATE NOT NULL,
  street VARCHAR(255) NOT NULL,
  street_number VARCHAR(20) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  city VARCHAR(127) NOT NULL,
  subject BIGINT UNSIGNED NOT NULL,
  phone VARCHAR(63) NOT NULL,
  email VARCHAR(255) NOT NULL,
  notes TEXT,
  status VARCHAR(31) NOT NULL,
  honorary TINYINT(1) NOT NULL DEFAULT 0,
  applied_at DATE NOT NULL,
  joined_at DATE NOT NULL,
  left_at DATE,
  FOREIGN KEY (account) REFERENCES users(id),
  FOREIGN KEY (subject) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS member_positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  member_id BIGINT UNSIGNED NOT NULL,
  position_id BIGINT UNSIGNED NOT NULL,
  since DATE NOT NULL,
  until DATE,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (position_id) REFERENCES positions(id)
);

CREATE TABLE IF NOT EXISTS companies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  street VARCHAR(255),
  street_number VARCHAR(20),
  postal_code VARCHAR(20),
  city VARCHAR(127),
  country VARCHAR(127) DEFAULT 'DE',
  iban VARCHAR(34),
  bic VARCHAR(11),
  bankname VARCHAR(127),
  vat_id VARCHAR(63),
  email VARCHAR(255),
  phone VARCHAR(63),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS association_profiles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  singleton_key TINYINT UNSIGNED NOT NULL DEFAULT 1 UNIQUE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(127),
  street VARCHAR(255) NOT NULL,
  street_number VARCHAR(20) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  city VARCHAR(127) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(63),
  website VARCHAR(255),
  vat_id VARCHAR(63),
  iban VARCHAR(34),
  bic VARCHAR(11),
  bankname VARCHAR(127),
  register_number VARCHAR(127),
  register_court VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS association_responsible_members (
  association_profile_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (association_profile_id, member_id),
  FOREIGN KEY (association_profile_id) REFERENCES association_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS association_responsible_positions (
  association_profile_id BIGINT UNSIGNED NOT NULL,
  position_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (association_profile_id, position_id),
  FOREIGN KEY (association_profile_id) REFERENCES association_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS files (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  file_path VARCHAR(511) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(127) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS file_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  file_id BIGINT UNSIGNED NOT NULL,
  entity_type VARCHAR(63) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  attached_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attached_by BIGINT UNSIGNED NOT NULL,
  detached_at TIMESTAMP NULL,
  detached_by BIGINT UNSIGNED NULL,
  FOREIGN KEY (detached_by) REFERENCES users(id),
  FOREIGN KEY (attached_by) REFERENCES users(id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  source_type VARCHAR(31) NOT NULL,
  is_kleinunternehmer BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at DATE NULL,
  contact_person VARCHAR(255) NULL,
  service_date DATE NULL,
  invoice_number VARCHAR(127) NOT NULL UNIQUE,
  subject VARCHAR(255) NULL,
  intro_text TEXT NULL,
  notes TEXT NULL,
  status VARCHAR(31) NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS cost_centres (
  id MEDIUMINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT,
  parent_id MEDIUMINT UNSIGNED NULL,
  FOREIGN KEY (parent_id) REFERENCES cost_centres(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT NULL,
  UNIQUE KEY uq_budget_period (start_date, end_date)
);

CREATE TABLE IF NOT EXISTS budget_cost_centre_lines (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_id BIGINT UNSIGNED NOT NULL,
  cost_centre_id MEDIUMINT UNSIGNED NOT NULL,
  expense_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  income_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  UNIQUE KEY uq_budget_cost_centre_line (budget_id, cost_centre_id),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (cost_centre_id) REFERENCES cost_centres(id)
);

CREATE TABLE IF NOT EXISTS subdivisions (
  id MEDIUMINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT
);

CREATE TABLE IF NOT EXISTS subdivision_members (
  subdivision_id MEDIUMINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (subdivision_id, member_id),
  FOREIGN KEY (subdivision_id) REFERENCES subdivisions(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  expected_guests MEDIUMINT UNSIGNED NOT NULL
);

CREATE TABLE IF NOT EXISTS event_member_organizers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY unique_event_member_organizer (event_id, member_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS event_subdivision_organizers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  subdivision_id MEDIUMINT UNSIGNED NOT NULL,
  UNIQUE KEY unique_event_subdivision_organizer (event_id, subdivision_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (subdivision_id) REFERENCES subdivisions(id)
);

CREATE TABLE IF NOT EXISTS spheres (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(127) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  description TEXT
);

CREATE TABLE IF NOT EXISTS event_cost_centre_splits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  sphere_id TINYINT UNSIGNED NOT NULL,
  cost_centre_id MEDIUMINT UNSIGNED NOT NULL,
  allocation_percentage DECIMAL(7,2) NOT NULL,
  UNIQUE KEY unique_event_cost_centre_split (event_id, cost_centre_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (sphere_id) REFERENCES spheres(id),
  FOREIGN KEY (cost_centre_id) REFERENCES cost_centres(id)
);

CREATE TABLE IF NOT EXISTS invoice_positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  sphere TINYINT UNSIGNED NOT NULL,
  cost_centre MEDIUMINT UNSIGNED NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(31) NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  tax DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (sphere) REFERENCES spheres(id),
  FOREIGN KEY (cost_centre) REFERENCES cost_centres(id)
);

CREATE TABLE IF NOT EXISTS receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT UNSIGNED NOT NULL,
  receipt_date DATE NOT NULL,
  receipt_number VARCHAR(100),
  description TEXT,
  status VARCHAR(15) NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS receipt_positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_id BIGINT UNSIGNED NOT NULL,
  sphere TINYINT UNSIGNED NOT NULL,
  cost_centre MEDIUMINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tax TINYINT UNSIGNED DEFAULT 19,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (cost_centre) REFERENCES cost_centres(id),
  FOREIGN KEY (sphere) REFERENCES spheres(id)
);

CREATE TABLE IF NOT EXISTS reimbursements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paid_by BIGINT UNSIGNED NOT NULL,
  bankname VARCHAR(127),
  account_holder VARCHAR(255),
  iban VARCHAR(34),
  bic VARCHAR(11),
  advance DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash TINYINT(1) NOT NULL,
  submitted_at TIMESTAMP NOT NULL,
  checked_at TIMESTAMP,
  checked_by BIGINT UNSIGNED,
  disbursed_at TIMESTAMP,
  disbursed_by BIGINT UNSIGNED,
  FOREIGN KEY (paid_by) REFERENCES members(id),
  FOREIGN KEY (checked_by) REFERENCES members(id),
  FOREIGN KEY (disbursed_by) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS reimbursement_positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reimbursement_id BIGINT UNSIGNED NOT NULL,
  receipt_id BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (reimbursement_id) REFERENCES reimbursements(id) ON DELETE CASCADE,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id)
);

CREATE TABLE IF NOT EXISTS cash_counts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NULL,
  counted_by_first BIGINT UNSIGNED NOT NULL,
  counted_by_second BIGINT UNSIGNED NOT NULL,
  checked_by BIGINT UNSIGNED NOT NULL,
  counted_before_at TIMESTAMP NULL,
  counted_after_at TIMESTAMP NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (counted_by_first) REFERENCES members(id),
  FOREIGN KEY (counted_by_second) REFERENCES members(id),
  FOREIGN KEY (checked_by) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS cash_count_positions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cash_count_id BIGINT UNSIGNED NOT NULL,
  register_number SMALLINT UNSIGNED NOT NULL,
  amount_before DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_after DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (cash_count_id) REFERENCES cash_counts(id) ON DELETE CASCADE,
  UNIQUE KEY uq_cash_count_register (cash_count_id, register_number)
);
