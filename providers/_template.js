/* VORLAGE für eine neue HTML-Seite (legale Quelle!)
 * 1. Datei kopieren, z. B. nach providers/meineseite.js
 * 2. BASE_URL, SEARCH_PATH und SELECTORS anpassen
 * 3. In manifest.json eintragen (siehe README)
 * KEIN async/await, nur Promises.
 */
var cheerio = require('cheerio-without-node-native');

var CONFIG = {
  TMDB_API_KEY: 'DEIN_TMDB_API_KEY',
  BASE_URL: 'https://beispiel-mediathek.de',
  SEARCH_PATH: '/suche?q={q}',
  PROVIDER_ID: 'meineseite',
  HEADERS: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

// Ändert sich das Layout der Seite, ist NUR dieser Block anzupassen:
var SELECTORS = {
  resultItem: '.search-result a.title',   // Link zu einer Detailseite in der Trefferliste
  videoSource: 'video source',            // <source src="..."> auf der Detailseite
  videoSourceAttr: 'src',
  iframe: 'iframe.player'                 // Fallback, falls das Video in einem iframe steckt
};

function getTitle(tmdbId, mediaType) {
  var type = mediaType === 'tv' ? 'tv' : 'movie';
  return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId +
    '?api_key=' + CONFIG.TMDB_API_KEY + '&language=de-DE')
    .then(function (r) { return r.json(); })
    .then(function (d) { return d.title || d.name || ''; });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return new Promise(function (resolve) {
    getTitle(tmdbId, mediaType).then(function (title) {
      var url = CONFIG.BASE_URL + CONFIG.SEARCH_PATH.replace('{q}', encodeURIComponent(title));
      return fetch(url, { headers: CONFIG.HEADERS }).then(function (r) { return r.text(); }).then(function (html) {
        var $ = cheerio.load(html);
        var first = $(SELECTORS.resultItem).first().attr('href');
        console.log('[Template] Treffer-Link: ' + first);
        if (!first) { resolve([]); return; }
        var detail = first.indexOf('http') === 0 ? first : CONFIG.BASE_URL + first;
        return fetch(detail, { headers: CONFIG.HEADERS }).then(function (r) { return r.text(); }).then(function (html2) {
          var $$ = cheerio.load(html2);
          var src = $$(SELECTORS.videoSource).first().attr(SELECTORS.videoSourceAttr);
          console.log('[Template] Video-URL: ' + src);
          if (!src) { resolve([]); return; }
          resolve([{
            name: 'MeineSeite - Stream',
            title: title,
            url: src.indexOf('http') === 0 ? src : CONFIG.BASE_URL + src,
            quality: 'Unknown',
            size: 'Unknown',
            headers: CONFIG.HEADERS,
            provider: CONFIG.PROVIDER_ID
          }]);
        });
      });
    }).catch(function (e) { console.log('[Template] Fehler: ' + e); resolve([]); });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
