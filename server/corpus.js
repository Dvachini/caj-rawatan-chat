import fs from 'node:fs';
import path from 'node:path';

export function redactPrivateText(text) {
  return text
    .replace(/^.*?(?:-|:)(?=\s*[^\s])/gm, '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(?:\+?6?01|01)[\d\s-]{7,12}\d/g, '[telefon]')
    .replace(/\b[A-Z][a-z]{2,}\b/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function chunkText(text, metadata, linesPerChunk = 18) {
  const lines = text.split(/\r?\n/);
  const chunks = [];

  for (let index = 0; index < lines.length; index += linesPerChunk) {
    const content = lines.slice(index, index + linesPerChunk).join('\n').trim();
    if (content.length < 30) continue;
    chunks.push({
      ...metadata,
      text: content,
      lineStart: index + 1,
      lineEnd: Math.min(index + linesPerChunk, lines.length),
    });
  }

  return chunks;
}

function filesBelow(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);
    return entry.isDirectory() ? filesBelow(fullPath) : [fullPath];
  });
}

export function loadCorpus(root) {
  return filesBelow(root).flatMap((filePath) => {
    const relative = path.relative(root, filePath);
    const privateChat = relative.endsWith('_chat.txt');
    const eligible = privateChat || relative.endsWith('_extracted.txt') || /(^|\/)(summary|README)\.md$/.test(relative);
    if (!eligible) return [];

    const sourceType = privateChat ? 'experiential' : 'official';
    const raw = fs.readFileSync(filePath, 'utf8');
    const text = privateChat ? redactPrivateText(raw) : raw;
    return chunkText(text, { source: relative, sourceType });
  });
}
