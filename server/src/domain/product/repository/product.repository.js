import { Product } from '../entity/product.entity.js';

function toProduct(row) {
  if (!row) return null;

  return new Product({
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class ProductRepository {
  constructor(db) {
    this.db = db;
  }

  async findByNameAndBrand({ name, brand = null }) {
    const [rows] = await this.db.execute(
      `SELECT id, name, brand, category, source_url, source_name, created_at, updated_at
       FROM products
       WHERE name = ? AND brand <=> ?
       LIMIT 1`,
      [name, brand],
    );

    return toProduct(rows[0]);
  }

  async create({
    name,
    brand = null,
    category = null,
    sourceUrl = null,
    sourceName = null,
  }) {
    const [result] = await this.db.execute(
      `INSERT INTO products (name, brand, category, source_url, source_name)
       VALUES (?, ?, ?, ?, ?)`,
      [name, brand, category, sourceUrl, sourceName],
    );

    return new Product({
      id: result.insertId,
      name,
      brand,
      category,
      sourceUrl,
      sourceName,
    });
  }
}
