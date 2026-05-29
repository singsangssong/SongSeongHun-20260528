import { parseJsonField, stringifyJsonField } from '../../../global/db/json.js';
import { ProductChunk } from '../entity/product-chunk.entity.js';

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

  async deleteByProductId(productId) {
    const [result] = await this.db.execute(
      `DELETE FROM product_chunks
       WHERE product_id = ?`,
      [productId],
    );

    return result.affectedRows ?? 0;
  }

  async findDocumentsForRag({ limit = 200 } = {}) {
    const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 200, 1000));
    const [rows] = await this.db.execute(
      `SELECT pc.id,
              pc.product_id,
              p.name AS product_name,
              p.brand,
              p.category,
              p.source_url,
              p.source_name,
              pc.chunk_type,
              pc.content,
              pc.metadata,
              pc.embedding_id,
              pc.created_at
       FROM product_chunks pc
       INNER JOIN products p ON p.id = pc.product_id
       ORDER BY pc.id ASC
       LIMIT ${safeLimit}`,
      [],
    );

    return rows.map(mapProductChunkRowToRagDocument);
  }

  async findDocumentsForRagByProductIds(productIds) {
    const safeProductIds = [...new Set(productIds)]
      .map((productId) => Number.parseInt(productId, 10))
      .filter((productId) => Number.isInteger(productId) && productId > 0);

    if (safeProductIds.length === 0) return [];

    const placeholders = safeProductIds.map(() => '?').join(', ');
    const [rows] = await this.db.execute(
      `SELECT pc.id,
              pc.product_id,
              p.name AS product_name,
              p.brand,
              p.category,
              p.source_url,
              p.source_name,
              pc.chunk_type,
              pc.content,
              pc.metadata,
              pc.embedding_id,
              pc.created_at
       FROM product_chunks pc
       INNER JOIN products p ON p.id = pc.product_id
       WHERE pc.product_id IN (${placeholders})
       ORDER BY pc.product_id ASC,
                FIELD(pc.chunk_type, 'summary', 'ingredients', 'claims', 'cautions', 'reviews'),
                pc.id ASC`,
      safeProductIds,
    );

    return rows.map(mapProductChunkRowToRagDocument);
  }
}

function mapProductChunkRowToRagDocument(row) {
  const metadata = parseJsonField(row.metadata, {});

  return {
    id: row.embedding_id || `product-chunk-${row.id}`,
    title: `${row.product_name} ${row.chunk_type}`,
    content: row.content,
    metadata: {
      ...metadata,
      productId: row.product_id,
      productName: row.product_name,
      brand: row.brand,
      category: row.category,
      sourceUrl: row.source_url,
      sourceName: row.source_name,
      chunkType: row.chunk_type,
    },
  };
}
