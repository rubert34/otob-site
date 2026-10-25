// London, TfL. Port of city_u.k._london_tfl.php (v30.01).
import { getJSON, natSort } from './util.js';

const META = {
  city: 'London', key_status: 'none', ui_type: 'standard', reg_url: 'https://api-portal.tfl.gov.uk/',
  recipe: { id: 'tfl_v1', runtime: {
    method: 'GET', url_template: 'https://api.tfl.gov.uk/StopPoint/{stop_id}/Arrivals',
    auth: { type: 'query', name: 'app_key', source: 'api_key' },
    response: { buses_path: '$', line_path: 'lineName', dest_path: 'destinationName', eta: { path: 'timeToStation', type: 'seconds' } },
    features: { use_age_header: true, use_rtt_correction: true },
  } },
};

const tfl = (base, key) => base + (base.includes('?') ? '&' : '?') + 'app_key=' + encodeURIComponent(String(key).trim());
const arr = (x) => (Array.isArray(x) ? x : []);

export default async function (q) {
  const op = q.get('op') || '', key = q.get('key') || '';
  const e = (k) => encodeURIComponent(q.get(k) || '');
  if (op === 'meta') return META;
  if (op === 'routes') {
    const d = arr(await getJSON(tfl('https://api.tfl.gov.uk/Line/Mode/bus', key)));
    return natSort(d.map((r) => ({ id: String(r.id ?? ''), name: String(r.name ?? '') })));
  }
  if (op === 'directions') {
    const d = await getJSON(tfl(`https://api.tfl.gov.uk/Line/${e('line')}/Route`, key));
    return arr(d.routeSections).map((rs) => ({ id: String(rs.direction ?? ''), name: String(rs.destinationName ?? '') }));
  }
  if (op === 'stops') {
    const d = await getJSON(tfl(`https://api.tfl.gov.uk/Line/${e('line')}/Route/Sequence/${e('dir')}`, key));
    return arr(d.stopPointSequences?.[0]?.stopPoint).map((sp) => ({ id: String(sp.id ?? ''), name: String(sp.name ?? '') }));
  }
  if (op === 'destinations') {
    const d = arr(await getJSON(tfl(`https://api.tfl.gov.uk/StopPoint/${e('stop')}/Arrivals`, key)));
    const seen = new Map();
    for (const b of d) { const n = String(b.destinationName ?? ''); if (n) seen.set(n, { id: n, name: n }); }
    return natSort([...seen.values()]);
  }
  return [];
}
