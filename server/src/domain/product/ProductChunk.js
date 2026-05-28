export class ProductChunk {
  constructor({
    id = null,
    productId,
    chunkType,
    content,
    metadata = {},
    embeddingId = null,
    createdAt = null,
  }) {
    if (!productId) {
      throw new Error('ProductChunk.productId is required');
    }

    if (!chunkType) {
      throw new Error('ProductChunk.chunkType is required');
    }

    if (!content) {
      throw new Error('ProductChunk.content is required');
    }

    this.id = id;
    this.productId = productId;
    this.chunkType = chunkType;
    this.content = content;
    this.metadata = metadata;
    this.embeddingId = embeddingId;
    this.createdAt = createdAt;
  }
}

