import '../src/global/config/load-env.js';
import { createDatabasePool, runCoreMigration } from '../src/global/db/database.js';

const db = createDatabasePool();

try {
  await runCoreMigration(db);
  console.log('Database migration completed');
} finally {
  await db.end();
}
