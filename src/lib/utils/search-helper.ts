/**
 * Search helper utilities to improve anime matching between different APIs
 */

/**
 * Normalize anime title for better matching
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove special characters
    .replace(/[^\w\s-]/g, '')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    // Remove common suffixes
    .replace(/\s+(season|s)\s*\d+$/i, '')
    .replace(/\s+\d+(st|nd|rd|th)\s+season$/i, '')
    .trim();
}

/**
 * Calculate similarity score between two titles (0-1)
 */
export function calculateSimilarity(title1: string, title2: string): number {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Contains match
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  // Word overlap
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Find best match from search results
 */
export function findBestMatch<T extends { title: string }>(
  searchTitle: string,
  results: T[],
  threshold: number = 0.6
): T | null {
  if (!results || results.length === 0) return null;

  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const result of results) {
    const score = calculateSimilarity(searchTitle, result.title);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = result;
    }
  }

  console.log(`[SearchHelper] Best match for "${searchTitle}": "${bestMatch?.title}" (score: ${bestScore.toFixed(2)})`);

  return bestMatch;
}

/**
 * Generate alternative search queries for better results
 */
export function generateAlternativeQueries(title: string): string[] {
  const queries = [title];

  // Remove subtitle/season info
  const withoutSubtitle = title.replace(/[:-].+$/, '').trim();
  if (withoutSubtitle !== title) {
    queries.push(withoutSubtitle);
  }

  // Try without special characters
  const withoutSpecial = title.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (withoutSpecial !== title) {
    queries.push(withoutSpecial);
  }

  // Try first few words only (for long titles)
  const words = title.split(' ');
  if (words.length > 3) {
    queries.push(words.slice(0, 3).join(' '));
  }

  return [...new Set(queries)]; // Remove duplicates
}
