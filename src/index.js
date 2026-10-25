// otob.us — bus timer proxy for the OTOBUS configurator and devices.
// Same addresses and JSON as the old PHP files on IONOS (devices and the configurator call them):
//   /scan_cities.php, /city_u.k._london_tfl.php, /city_u.s._boston_mbta.php   (?op=meta|routes|directions|stops|...)
// Works over http and https: never redirect, the devices may not speak TLS.
import london from './cities/london_tfl.js';
import boston from './cities/boston_mbta.js';

// file name -> handler. A new city = a new file in cities/ + one line here.
const CITIES = {
  'city_u.k._london_tfl.php': london,
  'city_u.s._boston_mbta.php': boston,
};

const json = (data, extra = {}) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', ...extra } });

// PHP ucwords: upper-case the first letter of each word, leave the rest.
const ucwords = (s) => s.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());

function scanCities() {
  const out = {};
  for (const file of Object.keys(CITIES).sort()) {
    const parts = file.replace('.php', '').split('_');
    if (parts.length < 3) continue;
    const raw = parts[1];
    const country = raw.length === 2 || raw.includes('.') ? raw.toUpperCase() : ucwords(raw.toLowerCase());
    const city = ucwords(parts.slice(2).join(' '));
    (out[country] ||= []).push({ name: city, file });
  }
  return out;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const name = url.pathname.replace(/^\/+/, '').replace(/^bustimes\//, '');
    if (name === 'scan_cities.php') return json(scanCities());
    const city = CITIES[name];
    if (city) {
      try { return json(await city(url.searchParams)); }
      catch { return json([]); }
    }
    if (name === '' || name === 'index.html') return new Response('otob.us', { headers: { 'Content-Type': 'text/plain' } });
    return new Response('Not found', { status: 404 });
  },
};
