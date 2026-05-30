export const noProductDataAnswer =
  '현재 추천 가능한 상품 데이터가 없습니다. 상품 데이터를 먼저 수집/import한 뒤 다시 질문해주세요.';

export const medicationKeywords = ['혈압약', '당뇨약', '갑상선약', '피임약', '진통제', '항응고제'];

export const conditionKeywords = ['고혈압', '당뇨', '갑상선', '위장', '간 질환'];

export const pregnancyKeywords = ['임신', '수유', '임신 준비'];

export const productChunkSortOrder = new Map([
  ['summary', 0],
  ['ingredients', 1],
  ['claims', 2],
  ['cautions', 3],
  ['reviews', 4],
]);
