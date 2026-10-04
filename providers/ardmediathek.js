/* ARD Mediathek Scraper für Nuvio (JSON-API, kein HTML-Parsing nötig)
 * KEIN async/await, nur Promises + fetch().
 * Ändert die ARD ihre API, passt du nur CONFIG und die Pfade in extractStreams() an.
 */

var CONFIG = {
  TMDB_API_KEY: 'DEIN_TMDB_API_KEY',
  // Endpunkte als Templates: {q} = Suchbegriff, {id} = Item-ID
  SEARCH_URL: 'https://api.ardmediathek.de/page-gateway/widgets/ard/search/vod?searchString={q}&pageSize=12',
  ITEM_URL: 'https://api.ardmediathek.de/page-gateway/pages/ard/item/{id}?devicetype=pc&embedded=true',
  PROVIDER_ID: 'ardmediathek',
  HEADERS: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
};

function log(msg) { console.log('[ARD] ' + msg); }

function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9äöüß ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTitleInfo(tmdbId, mediaType) {
  var type = mediaType === 'tv' ? 'tv' : 'movie';
  var url = 'https://api.themoviedb.org/3/' + type + '/' + tmdbId +
    '?api_key=' + CONFIG.TMDB_API_KEY + '&language=de-DE';
  return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
    return {
      title: d.title || d.name || '',
      originalTitle: d.original_title || d.original_name || '',
      year: (d.release_date || d.first_air_date || '').slice(0, 4)
    };
  });
}

function search(title) {
  var url = CONFIG.SEARCH_URL.replace('{q}', encodeURIComponent(title));
  return fetch(url, { headers: CONFIG.HEADERS }).then(function (r) { return r.json(); }).then(function (d) {
    return (d && d.teasers) ? d.teasers : [];   // <- hier anpassen, falls sich die Antwort-Struktur ändert
  });
}

function teaserId(t) {
  return (t.links && t.links.target && t.links.target.id) || t.id || '';
}

function teaserTitle(t) {
  return t.longTitle || t.mediumTitle || t.shortTitle || '';
}

function extractStreams(itemJson, label) {
  var out = [];
  var widgets = (itemJson && itemJson.widgets) ? itemJson.widgets : [];
  widgets.forEach(function (w) {
    var arr = w && w.mediaCollection && w.mediaCollection.embedded && w.mediaCollection.embedded._mediaArray;
    if (!arr) return;
    arr.forEach(function (m) {
      (m._mediaStreamArray || []).forEach(function (s) {
        var urls = Array.isArray(s._stream) ? s._stream : [s._stream];
        urls.forEach(function (u) {
          if (!u || typeof u !== 'string') return;
          if (u.indexOf('//') === 0) u = 'https:' + u;
          var isHls = u.indexOf('.m3u8') !== -1;
          var q = s._quality;
          var quality = isHls ? 'Auto' : (q === 3 ? '720p' : q === 4 ? '1080p' : q === 2 ? '540p' : 'SD');
          out.push({
            name: 'ARD Mediathek - ' + (isHls ? 'HLS' : 'MP4'),
            title: label,
            url: u,
            quality: quality,
            size: 'Unknown',
            headers: CONFIG.HEADERS,
            provider: CONFIG.PROVIDER_ID
          });
        });
      });
    });
  });
  return out;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return new Promise(function (resolve) {
    getTitleInfo(tmdbId, mediaType).then(function (info) {
      var wanted = norm(info.title);
      if (!wanted) { resolve([]); return; }
      var query = info.title;
      if (mediaType === 'tv' && seasonNum && episodeNum) {
        query = info.title + ' S' + seasonNum + 'E' + episodeNum;
      }
      return search(query).then(function (teasers) {
        var hits = teasers.filter(function (t) { return norm(teaserTitle(t)).indexOf(wanted) !== -1; }).slice(0, 4);
        log(hits.length + ' passende Treffer');
        return Promise.all(hits.map(function (t) {
          var url = CONFIG.ITEM_URL.replace('{id}', teaserId(t));
          return fetch(url, { headers: CONFIG.HEADERS }).then(function (r) { return r.json(); })
            .then(function (j) { return extractStreams(j, teaserTitle(t)); })
            .catch(function (e) { log('Item-Fehler: ' + e); return []; });
        }));
      }).then(function (lists) {
        resolve([].concat.apply([], lists));
      });
    }).catch(function (e) { log('Fehler: ' + e); resolve([]); });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
