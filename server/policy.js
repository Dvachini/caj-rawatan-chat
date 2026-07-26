const labels = {
  official: 'Dokumen rasmi',
  experiential: 'Pengalaman kes terdahulu',
};

export function chooseEvidence(passages) {
  const valid = passages.filter(({ sourceType }) => sourceType in labels);
  const official = valid.filter(({ sourceType }) => sourceType === 'official');
  return official.length ? official : valid;
}

export function publicSourceLabel(sourceType) {
  return labels[sourceType] ?? 'Sumber tidak diketahui';
}
