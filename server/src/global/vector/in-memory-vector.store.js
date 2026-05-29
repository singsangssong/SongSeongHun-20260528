import { cosineSimilarity } from './cosine-similarity.js';

export class InMemoryVectorStore {
  constructor({ embeddingProvider }) {
    this.embeddingProvider = embeddingProvider;
    this.documents = [];
  }

  async addDocuments(documents) {
    const embeddedDocuments = await Promise.all(
      documents.map(async (document) => ({
        ...document,
        embedding: await this.embeddingProvider.embed(
          `${document.title}\n${document.content}`,
        ),
      })),
    );

    this.documents.push(...embeddedDocuments);
  }

  async similaritySearch(query, limit = 3) {
    const queryEmbedding = await this.embeddingProvider.embed(query);

    return this.documents
      .map((document) => ({
        ...document,
        score: cosineSimilarity(queryEmbedding, document.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ embedding, ...document }) => document);
  }
}
