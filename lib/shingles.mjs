// A REDUNDANCY HEURISTIC, not semantic understanding. Word-shingle Jaccard
// similarity: two files score high if they share many overlapping runs of N
// consecutive words, which catches copy-pasted or near-duplicate prose but
// says nothing about whether two differently-worded files mean the same
// thing. Chosen specifically to stay dependency-free (no embeddings API,
// no model download) - the trade-off is disclosed, not hidden.

const DEFAULT_SHINGLE_SIZE = 5;

export function wordShingles(text, size = DEFAULT_SHINGLE_SIZE) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const shingles = new Set();
  if (words.length < size) {
    // Too short to form even one shingle at this size - not an error, just
    // an empty set, which correctly yields 0 similarity against anything.
    return shingles;
  }
  for (let i = 0; i <= words.length - size; i += 1) {
    shingles.add(words.slice(i, i + size).join(' '));
  }
  return shingles;
}

export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  let intersectionSize = 0;
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const item of smaller) {
    if (larger.has(item)) {
      intersectionSize += 1;
    }
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}
