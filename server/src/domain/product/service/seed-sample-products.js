import { sampleProducts } from '../data/sample-products.js';

export async function seedSampleProducts({
  productRepository,
  productChunkRepository,
  products = sampleProducts,
}) {
  let productCount = 0;
  let chunkCount = 0;

  for (const productSeed of products) {
    const product =
      (await productRepository.findByNameAndBrand({
        name: productSeed.name,
        brand: productSeed.brand,
      })) ??
      (await productRepository.create({
        name: productSeed.name,
        brand: productSeed.brand,
        category: productSeed.category,
        sourceUrl: productSeed.sourceUrl,
        sourceName: productSeed.sourceName ?? 'sample-seed',
      }));

    productCount += 1;
    await productChunkRepository.deleteByProductId(product.id);

    for (const chunk of productSeed.chunks) {
      await productChunkRepository.create({
        productId: product.id,
        chunkType: chunk.chunkType,
        content: chunk.content,
        metadata: {
          ...(chunk.metadata ?? {}),
          productName: product.name,
          sourceName: productSeed.sourceName ?? 'sample-seed',
        },
      });
      chunkCount += 1;
    }
  }

  return {
    productCount,
    chunkCount,
  };
}
