// Boston, MBTA V3. Port of city_u.s._boston_mbta.php.
import { getJSON, natSort } from './util.js';

const META = {
  city: 'Boston', country: 'US', key_status: 'optional', ui_type: 'standard', reg_url: 'https://api-v3.mbta.com/portal/',
  recipe: {
    id: 'mbta_v3', method: 'GET', url_template: 'https://api-v3.mbta.com/predictions?filter[stop]={stop_id}&sort=arrival_time',
    runtime: {
      method: 'GET', url_template: 'https://api-v3.mbta.com/predictions?filter[stop]={stop_id}&sort=arrival_time',
      auth: { type: 'query', name: 'api_key', source: 'api_key', optional: true },
      headers: { Accept: 'application/vnd.api+json' },
      response: { buses_path: 'data', line_path: 'relationships.route.data.id', eta: { type: 'iso8601', path: 'attributes.arrival_time' } },
      sort: 'eta_asc', filter: { whitelist_lines: true },
    },
  },
};

const B = 'https://api-v3.mbta.com';
const call = (url, key) => {
  const h = { Accept: 'application/vnd.api+json' };
  if (String(key).trim()) h['x-api-key'] = String(key).trim();
  return getJSON(url, h);
};
const data = (j) => (Array.isArray(j?.data) ? j.data : []);
const routeName = (r) => r.attributes?.short_name || r.attributes?.long_name || r.id;

export default async function (q) {
  const op = q.get('op') || '', key = q.get('key') || '';
  const g = (k) => q.get(k) || '';
  if (op === 'meta') return META;
  if (op === 'routes') {
    const j = await call(`${B}/routes?filter[type]=0,1,3`, key);
    return natSort(data(j).filter((r) => r.id).map((r) => ({ id: r.id, name: routeName(r) })));
  }
  if (op === 'directions') {
    if (!g('line')) return [];
    const a = (await call(`${B}/routes/${encodeURIComponent(g('line'))}`, key))?.data?.attributes || {};
    const names = Array.isArray(a.direction_names) ? a.direction_names : [], dests = a.direction_destinations || [];
    return names.map((n, i) => ({ id: String(i), name: String(dests[i] ?? n) }));
  }
  if (op === 'stops') {
    if (!g('line') || !g('dir')) return [];
    const j = await call(`${B}/stops?filter[route]=${encodeURIComponent(g('line'))}&filter[direction_id]=${encodeURIComponent(g('dir'))}`, key);
    return data(j).filter((s) => s.id).map((s) => ({ id: s.id, name: s.attributes?.name || s.id }));
  }
  if (op === 'lines_at_stop') {
    if (!g('stop')) return [];
    const j = await call(`${B}/routes?filter[stop]=${encodeURIComponent(g('stop'))}`, key);
    return natSort(data(j).filter((r) => r.id).map((r) => ({ id: r.id, name: routeName(r) })));
  }
  if (op === 'preview') {
    if (!g('stop')) return { buses: [] };
    const want = new Set(g('lines').split(/\s*,\s*/).map((p) => p.trim().toUpperCase()).filter(Boolean));
    const all = want.size === 0 || want.has('ALL');
    const j = await call(`${B}/predictions?filter[stop]=${encodeURIComponent(g('stop'))}&sort=arrival_time`, key);
    const now = Math.floor(Date.now() / 1000), rows = [];
    for (const it of data(j)) {
      const route = String(it.relationships?.route?.data?.id ?? '').trim().toUpperCase();
      if (!route || (!all && !want.has(route))) continue;
      const ts = it.attributes?.arrival_time || it.attributes?.departure_time;
      const t = ts ? Math.floor(Date.parse(ts) / 1000) : NaN;
      if (!Number.isFinite(t)) continue;
      const sec = t - now;
      if (sec < 0) continue;
      rows.push({ line: route, min: Math.floor(sec / 60), sec: sec % 60 });
      if (rows.length >= 8) break;
    }
    rows.sort((a, b) => a.min * 60 + a.sec - (b.min * 60 + b.sec));
    return { buses: rows };
  }
  return [];
}
