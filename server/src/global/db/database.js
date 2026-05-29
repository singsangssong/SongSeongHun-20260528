import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const currentDir = dirname(fileURLToPath(import.meta.url));

export function createDatabasePool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'levit',
    password: process.env.MYSQL_PASSWORD || 'levit_password',
    database: process.env.MYSQL_DATABASE || 'levit_assignment',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    namedPlaceholders: false,
    multipleStatements: true,
  });
}

export async function runCoreMigration(db) {
  const sql = readFileSync(
    join(currentDir, 'migrations', '001_create_core_tables.sql'),
    'utf8',
  );

  await db.query(sql);
  await ensureUserAuthColumns(db);
  await ensureUserPreferenceColumns(db);
}

async function ensureUserAuthColumns(db) {
  const columns = [
    ['email', 'VARCHAR(191) NULL'],
    ['nickname', 'VARCHAR(100) NULL'],
    ['password_hash', 'VARCHAR(255) NULL'],
  ];

  for (const [name, definition] of columns) {
    try {
      await db.query(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  try {
    await db.query('ALTER TABLE users ADD UNIQUE KEY uq_users_email (email)');
  } catch (error) {
    if (error.code !== 'ER_DUP_KEYNAME') throw error;
  }
}

async function ensureUserPreferenceColumns(db) {
  const columns = [
    ['pregnancy_status', 'VARCHAR(50) NULL'],
    ['chronic_conditions', 'JSON NULL'],
    ['medications', 'JSON NULL'],
    ['current_supplements', 'JSON NULL'],
    ['lifestyle_patterns', 'JSON NULL'],
    ['safety_notes', 'JSON NULL'],
  ];

  for (const [name, definition] of columns) {
    try {
      await db.query(
        `ALTER TABLE user_preferences ADD COLUMN ${name} ${definition}`,
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
  }
}
