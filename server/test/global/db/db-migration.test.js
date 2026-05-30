import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const migration = readFileSync(
  new URL('../../../src/global/db/migrations/001_create_core_tables.sql', import.meta.url),
  'utf8',
);

describe('database migration', () => {
  it('creates the minimal core tables', () => {
    for (const tableName of [
      'users',
      'user_preferences',
      'chat_sessions',
      'chat_messages',
      'products',
      'product_chunks',
    ]) {
      assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}`));
    }
  });

  it('defines foreign keys for aggregate relationships', () => {
    assert.match(migration, /FOREIGN KEY \(user_id\) REFERENCES users\(id\)/);
    assert.match(migration, /FOREIGN KEY \(session_id\) REFERENCES chat_sessions\(id\)/);
    assert.match(migration, /FOREIGN KEY \(product_id\) REFERENCES products\(id\)/);
  });

  it('keeps one preference row per user', () => {
    assert.match(migration, /UNIQUE KEY uq_user_preferences_user_id \(user_id\)/);
  });

  it('stores safety and lifestyle onboarding context', () => {
    for (const columnName of [
      'pregnancy_status',
      'chronic_conditions',
      'medications',
      'current_supplements',
      'lifestyle_patterns',
      'safety_notes',
    ]) {
      assert.match(migration, new RegExp(columnName));
    }
  });
});
