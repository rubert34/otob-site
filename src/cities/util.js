// Shared helpers: fetch JSON (empty on any error, like the PHP), natural sort like strnatcasecmp.
export async function getJSON(url, headers = {}) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
    const j = await r.json();
    return j && typeof j === 'object' ? j : [];
  } catch { return []; }
}
export const natSort = (arr) => arr.sort((a, b) => String(a.name).localeCompare(String(b.name), 'en', { numeric: true, sensitivity: 'base' }));
