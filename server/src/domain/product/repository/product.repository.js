import { Product } from '../entity/product.entity.js';

export class ProductRepository {
  constructor(db) {
    this.db = db;
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
