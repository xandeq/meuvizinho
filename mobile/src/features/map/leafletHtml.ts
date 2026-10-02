/**
 * Self-contained Leaflet + OpenStreetMap page rendered inside a WebView.
 * Same tile source as the web app (frontend MapClient.tsx). No API key needed —
 * react-native-maps on Android requires a Google Maps key and crashes without one.
 *
 * Host → page messages (via injectJavaScript): window.__setMarkers(payload)
 */
export interface LeafletPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string | null;
  color: string;
}

export function buildLeafletHtml(opts: { lat: number; lng: number; zoom: number; bg: string }): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${opts.bg}; }
  .mv-pin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
  .leaflet-popup-content { margin: 8px 10px; font: 13px -apple-system, Roboto, sans-serif; }
  .mv-title { font-weight: 600; color: #111827; }
  .mv-sub { color: #6B7280; font-size: 12px; margin-top: 2px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView([${opts.lat}, ${opts.lng}], ${opts.zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  window.__setMarkers = function (pins) {
    layer.clearLayers();
    (pins || []).forEach(function (p) {
      var icon = L.divIcon({ className: '', html: '<div class="mv-pin" style="background:' + esc(p.color) + '"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      var html = '<div class="mv-title">' + esc(p.title) + '</div>' + (p.subtitle ? '<div class="mv-sub">' + esc(p.subtitle) + '</div>' : '');
      L.marker([p.lat, p.lng], { icon: icon }).bindPopup(html).addTo(layer);
    });
  };
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
</script>
</body>
</html>`;
}
