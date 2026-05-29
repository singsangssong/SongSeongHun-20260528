const keywords = [
  '피로',
  '에너지',
  '수면',
  '눈',
  '장',
  '갱년기',
  '면역',
  '위',
  '마그네슘',
  '비타민',
  '루테인',
];

export class LocalKeywordEmbeddingProvider {
  async embed(text) {
    const normalized = text.toLowerCase();

    return keywords.map((keyword) => {
      return normalized.includes(keyword.toLowerCase()) ? 1 : 0;
    });
  }
}

