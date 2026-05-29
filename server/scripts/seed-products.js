import '../src/global/config/load-env.js';
import { seedSampleProducts } from '../src/domain/product/service/seed-sample-products.js';
import { createRepositories } from '../src/global/db/create-repositories.js';
import { runCoreMigration } from '../src/global/db/database.js';

const repositories = createRepositories();

try {
  await runCoreMigration(repositories.db);

  const result = await seedSampleProducts({
    productRepository: repositories.productRepository,
    productChunkRepository: repositories.productChunkRepository,
  });

  console.log(
    `Sample product seed completed: ${result.productCount} products, ${result.chunkCount} chunks`,
  );
} finally {
  await repositories.db.end();
}
