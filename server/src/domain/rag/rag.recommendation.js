export function extractRecommendations(documents) {
  const recommendations = [];
  const seen = new Set();

  for (const document of documents) {
    const metadata = document.metadata ?? {};
    const name = metadata.productName || metadata.product_name;
    const sourceUrl = metadata.sourceUrl || metadata.source_url;
    if (!name || !sourceUrl) continue;

    const key = `${name}|${sourceUrl}`;
    if (seen.has(key)) continue;

    seen.add(key);
    recommendations.push({
      name,
      brand: metadata.brand || '',
      source_url: sourceUrl,
    });
  }

  return recommendations;
}
