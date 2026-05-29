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
}

