import { ProductChunk } from '../../../domain/product/ProductChunk.js';
import { stringifyJsonField } from '../json.js';

export class ProductChunkRepository {
  constructor(db) {
    this.db = db;
  }

  async create({
    productId,
    chunkType,
    content,
    metadata = {},
    embeddingId = null,
  }) {
    const [result] = await this.db.execute(
      `INSERT INTO product_chunks (
         product_id, chunk_type, content, metadata, embedding_id
       )
       VALUES (?, ?, ?, ?, ?)`,
      [productId, chunkType, content, stringifyJsonField(metadata, {}), embeddingId],
    );

    return new ProductChunk({
      id: result.insertId,
      productId,
      chunkType,
      content,
      metadata,
      embeddingId,
    });
  }
}

