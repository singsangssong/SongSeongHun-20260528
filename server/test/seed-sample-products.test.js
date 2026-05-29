import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Product } from '../src/domain/product/entity/product.entity.js';
import { seedSampleProducts } from '../src/domain/product/service/seed-sample-products.js';

describe('seedSampleProducts', () => {
  it('creates missing sample products and chunks idempotently', async () => {
    const calls = [];
    const products = [
      {
        name: '유산균',
        brand: 'Sample Brand',
        category: 'supplement',
        chunks: [
          {
            chunkType: 'ingredient',
            content: '유산균은 장 건강 관심 사용자가 자주 비교하는 성분입니다.',
            metadata: { concern: '장 건강' },
          },
        ],
      },
    ];

    const result = await seedSampleProducts({
      products,
      productRepository: {
        async findByNameAndBrand({ name, brand }) {
          calls.push(['findProduct', name, brand]);
          return null;
        },
        async create({ name, brand, category, sourceName }) {
          calls.push(['createProduct', name, brand, category, sourceName]);
          return new Product({ id: 10, name, brand, category, sourceName });
        },
      },
      productChunkRepository: {
        async deleteByProductId(productId) {
          calls.push(['deleteChunks', productId]);
          return 0;
        },
        async create({ productId, chunkType, content, metadata }) {
          calls.push(['createChunk', productId, chunkType, content, metadata.concern]);
          return { id: 20, productId, chunkType, content, metadata };
        },
      },
    });

    assert.deepEqual(result, {
      productCount: 1,
      chunkCount: 1,
    });
    assert.deepEqual(calls.map(([name]) => name), [
      'findProduct',
      'createProduct',
      'deleteChunks',
      'createChunk',
    ]);
  });

  it('reuses existing products while replacing their sample chunks', async () => {
    const calls = [];
    const result = await seedSampleProducts({
      products: [
        {
          name: '비타민 D',
          brand: 'Sample Brand',
          category: 'supplement',
          chunks: [
            {
              chunkType: 'ingredient',
              content: '비타민 D는 실내 생활이 많은 사용자가 비교하는 성분입니다.',
              metadata: { concern: '뼈 건강' },
            },
          ],
        },
      ],
      productRepository: {
        async findByNameAndBrand({ name, brand }) {
          calls.push(['findProduct', name, brand]);
          return new Product({ id: 11, name, brand });
        },
        async create() {
          throw new Error('create should not be called');
        },
      },
      productChunkRepository: {
        async deleteByProductId(productId) {
          calls.push(['deleteChunks', productId]);
          return 2;
        },
        async create({ productId, chunkType }) {
          calls.push(['createChunk', productId, chunkType]);
          return { id: 30, productId, chunkType };
        },
      },
    });

    assert.equal(result.productCount, 1);
    assert.equal(result.chunkCount, 1);
    assert.deepEqual(calls.map(([name]) => name), [
      'findProduct',
      'deleteChunks',
      'createChunk',
    ]);
  });
});
