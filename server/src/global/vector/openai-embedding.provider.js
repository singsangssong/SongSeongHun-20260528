import OpenAI from 'openai';

export class OpenAIEmbeddingProvider {
  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  } = {}) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async embed(text) {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });

    return response.data[0].embedding;
  }
}

