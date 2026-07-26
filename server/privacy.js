const patterns = [
  /\b(?:\+?6?01|01)[\d\s-]{7,12}\d\b/giu,
  /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/giu,
  /\b\d{6}-\d{2}-\d{4}\b/g,
  /\b(?:passport|pasport|no\.?\s*kp|mykad|ic)\s*[:#-]?\s*[A-Za-z0-9-]{5,20}\b/giu,
];

export function containsSensitiveIdentifier(text) {
  return patterns.some((pattern) => pattern.test(text));
}

export function redactForExternalLlm(text) {
  return patterns.reduce((clean, pattern) => clean.replace(pattern, '[redacted]'), text);
}
