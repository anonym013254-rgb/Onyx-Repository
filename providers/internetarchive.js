/* Internet Archive Scraper für Nuvio
 * Wichtig: KEIN async/await (Nuvio-Sandbox), nur Promises + fetch().
 * Alles, was sich ändern kann (URLs, Formate), steht in CONFIG.
 */

var CONFIG = {
  TMDB_API_KEY: 'DEIN_TMDB_API_KEY',            // kostenlos auf themoviedb.org
  SEARCH_URL: 'https://archive.org/advancedsearch.php',
  METADATA_URL: 'https://archive.org/metadata/',
  DOWNLOAD_URL: 'https://archive.org/download/',
  MAX_RESULTS: 8,
  // Dateiformate, die der Player abspielen kann (so heißen sie im IA-Metadaten-Feld "format")
  VIDEO_FORMATS: ['h.264', 'mpeg4', '512kb mpeg4', 'h.264 hd'],
  PROVIDER_ID: 'internetarchive'
};

function log(msg) { console.log('[InternetArchive] ' + msg); }

function getTitleInfo(tmdbId, mediaType) {
  var type = mediaType === 'tv' ? 'tv' : 'movie';
  var url = 'https://api.themoviedb.org/3/' + type + '/' + tmdbId +
    '?api_key=' + CONFIG.TMDB_API_KEY + '&language=en-US';
  return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
    return {
      title: d.title || d.name || '',
      originalTitle: d.original_title || d.original_name || '',
      year: (d.release_date || d.first_air_date || '').slice(0, 4)
    };
  });
}

function searchArchive(title, year) {
  var q = 'title:("' + title.replace(/"/g, '') + '") AND mediatype:(movies)';
  if (year) q += ' AND year:' + year;
  var url = CONFIG.SEARCH_URL + '?q=' + encodeURIComponent(q) +
    '&fl[]=identifier&fl[]=title&fl[]=year&rows=' + CONFIG.MAX_RESULTS + '&output=json';
  return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
    return (d && d.response && d.response.docs) ? d.response.docs : [];
  });
}

function filesFor(identifier, titleLabel) {
  return fetch(CONFIG.METADATA_URL + identifier).then(function (r) { return r.json(); }).then(function (meta) {
    var files = (meta && meta.files) ? meta.files : [];
    var out = [];
    files.forEach(function (f) {
      var fmt = (f.format || '').toLowerCase();
      if (CONFIG.VIDEO_FORMATS.indexOf(fmt) === -1) return;
      var h = parseInt(f.height || '0', 10);
      var quality = h >= 1080 ? '1080p' : h >= 720 ? '720p' : h >= 480 ? '480p' : 'SD';
      var mb = f.size ? Math.round(parseInt(f.size, 10) / 1048576) + ' MB' : 'Unknown';
      out.push({
        name: 'Internet Archive - ' + (f.format || 'Video'),
        title: titleLabel,
        url: CONFIG.DOWNLOAD_URL + identifier + '/' + encodeURIComponent(f.name),
        quality: quality,
        size: mb,
        headers: {},
        provider: CONFIG.PROVIDER_ID
      });
    });
    return out;
  }).catch(function (e) { log('Metadaten-Fehler ' + identifier + ': ' + e); return []; });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return new Promise(function (resolve) {
    if (mediaType !== 'movie') { resolve([]); return; }   // IA hat kaum sauber zuordenbare Serien
    getTitleInfo(tmdbId, mediaType).then(function (info) {
      if (!info.title) { resolve([]); return; }
      var label = info.title + (info.year ? ' (' + info.year + ')' : '');
      return searchArchive(info.title, info.year).then(function (docs) {
        log(docs.length + ' Treffer für "' + info.title + '"');
        return Promise.all(docs.map(function (d) { return filesFor(d.identifier, label); }));
      }).then(function (lists) {
        var all = [].concat.apply([], lists);
        resolve(all);
      });
    }).catch(function (e) { log('Fehler: ' + e); resolve([]); });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}
