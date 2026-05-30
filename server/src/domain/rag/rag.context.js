import { productChunkSortOrder } from './rag.constants.js';

export function flattenPreferenceValues(values) {
  return Object.values(values ?? {})
    .flat()
    .filter(Boolean)
    .join(' ');
}

export function findMentionedKeywords(message, keywords) {
  return keywords.filter((keyword) => message.includes(keyword));
}

export function findUnknownKeywords(message, keywords, knownText) {
  return findMentionedKeywords(message, keywords).filter(
    (keyword) => !knownText.includes(keyword),
  );
}

export function isRelevantDocument(document, minSimilarityScore) {
  if (typeof document.score !== 'number') return true;
  return document.score >= minSimilarityScore;
}

export function extractProductIds(documents) {
  return [
    ...new Set(
      documents
        .map((document) => document.metadata?.productId)
        .filter((productId) => productId !== undefined && productId !== null),
    ),
  ];
}

export function mergeContextDocuments(loadedDocuments, retrievedDocuments) {
  const byId = new Map();

  for (const document of [...loadedDocuments, ...retrievedDocuments]) {
    byId.set(document.id, document);
  }

  return sortContextDocuments([...byId.values()]);
}

export function sortContextDocuments(documents) {
  return documents
    .map((document, index) => ({ document, index }))
    .sort((leftEntry, rightEntry) => {
      const left = leftEntry.document;
      const right = rightEntry.document;
      const leftProductId = left.metadata?.productId ?? 0;
      const rightProductId = right.metadata?.productId ?? 0;
      if (leftProductId !== rightProductId) return leftProductId - rightProductId;

      const leftOrder = productChunkSortOrder.get(left.metadata?.chunkType) ?? 99;
      const rightOrder = productChunkSortOrder.get(right.metadata?.chunkType) ?? 99;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;

      return leftEntry.index - rightEntry.index;
    })
    .map((entry) => entry.document);
}
