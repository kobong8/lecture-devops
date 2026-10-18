export const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
export const tokensFor = query => [...new Set(normalize(query).split(' ').filter(Boolean))];
export function findMatches(entries, query, scope = 'all') {
  const tokens = tokensFor(query);
  if (!tokens.length) return [];
  return entries.filter(entry => (scope === 'all' || entry.course === scope)
    && tokens.every(token => normalize(`${entry.courseTitle} ${entry.title} ${entry.text}`).includes(token)))
    .map(entry => ({ ...entry, score: tokens.reduce((sum, token) => sum + (normalize(entry.title).includes(token) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score);
}
export function excerpt(text, query) {
  text = String(text).normalize('NFKC').replace(/\s+/g, ' ');
  const positions = tokensFor(query).map(token => text.toLowerCase().indexOf(token)).filter(index => index >= 0);
  const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 45);
  return `${start ? '…' : ''}${text.slice(start, start + 200)}${text.length > start + 200 ? '…' : ''}`;
}
export function lectureURL(value, root) {
  try {
    const url = new URL(value, root);
    if (url.origin !== root.origin || !url.pathname.startsWith(`${root.pathname}lecture_note/`)) return null;
    const filename = url.pathname.slice(`${root.pathname}lecture_note/`.length);
    if (!/^[a-z0-9-]+\.html$/.test(filename) || !url.hash || url.search) return null;
    return url;
  } catch { return null; }
}
