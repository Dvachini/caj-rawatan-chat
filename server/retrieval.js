const ignored = new Set(['apa', 'berapa', 'dan', 'di', 'ialah', 'itu', 'ke', 'kepada', 'untuk', 'yang']);

function tokens(text) {
  return [...new Set(text
    .toLocaleLowerCase('ms')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !ignored.has(token)))];
}

export function buildIndex(documents) {
  return documents.map((document) => ({ ...document, tokens: tokens(document.text) }));
}

export function searchIndex(index, query, limit = 5) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];

  const matches = index
    .map((passage) => {
      const score = queryTokens.reduce((total, token) => total + passage.tokens.includes(token), 0);
      return { ...passage, score };
    })
    .filter(({ score }) => score >= Math.min(2, queryTokens.length));

  const official = matches.filter(({ sourceType }) => sourceType === 'official');
  const experiential = matches.filter(({ sourceType }) => sourceType === 'experiential');
  const bestOfficial = official[0]?.score ?? 0;
  const bestExperiential = experiential[0]?.score ?? 0;
  const selected = bestOfficial >= bestExperiential ? official : experiential;

  return selected
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length)
    .slice(0, limit)
    .map((passage) => {
      const result = { ...passage };
      delete result.tokens;
      return result;
    });
}
