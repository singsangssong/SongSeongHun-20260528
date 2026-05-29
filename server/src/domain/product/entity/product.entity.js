export class Product {
  constructor({
    id = null,
    name,
    brand = null,
    category = null,
    sourceUrl = null,
    sourceName = null,
    createdAt = null,
    updatedAt = null,
  }) {
    if (!name) {
      throw new Error('Product.name is required');
    }

    this.id = id;
    this.name = name;
    this.brand = brand;
    this.category = category;
    this.sourceUrl = sourceUrl;
    this.sourceName = sourceName;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

