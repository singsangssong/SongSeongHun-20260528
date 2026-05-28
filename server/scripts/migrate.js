import '../src/infrastructure/config/loadEnv.js';
import { createDatabasePool, runCoreMigration } from '../src/infrastructure/db/database.js';

const db = createDatabasePool();

try {
  await runCoreMigration(db);
  console.log('Database migration completed');
} finally {
  await db.end();
}
