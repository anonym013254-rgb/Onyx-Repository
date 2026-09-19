const { resolveHoster } = require("./extractors");

const BASE_URL = "https://moflix-stream.xyz";

/**
 * Scraper für Moflix
 * @param {Object} params - { title, type, season, episode, year }
 */
async function getStreams({ title, type, season, episode, year }) {
  const streams = [];

  try {
    // 1. Suche nach dem Medium
    // TODO: Passe hier den genauen Suchpfad der Website an falls nötig (z.B. /search?q= oder /api/search)
    const searchQuery = encodeURIComponent(title);
    const searchUrl = `${BASE_URL}/?s=${searchQuery}`;
    console.log(`[Moflix] Suche unter: ${searchUrl}`);

    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (searchRes.status === 200) {
      const searchHtml = await searchRes.text();

      // Finde den ersten passenden Eintrag/Link im Suchergebnis
      const itemMatch = searchHtml.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*result-item[^"]*"|<article[^>]*>.*?<a[^>]+href="([^"]+)"/s);
      const detailUrl = itemMatch ? (itemMatch[1] || itemMatch[2]) : null;

      if (detailUrl) {
        let watchUrl = detailUrl;

        // Wenn Serie, Staffel & Episode anhängen falls unterstützt
        if (type === "series" && season && episode) {
          watchUrl = `${detailUrl.replace(/\/$/, "")}/season/${season}/episode/${episode}`;
        }

        const watchRes = await fetch(watchUrl, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        const watchHtml = await watchRes.text();

        // Extrahiere eingebettete Iframe-/Hoster-Links
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
        let iframeMatch;

        while ((iframeMatch = iframeRegex.exec(watchHtml)) !== null) {
          const embedUrl = iframeMatch[1];
          const streamResult = await resolveHoster(embedUrl);

          if (streamResult && streamResult.url) {
            streams.push({
              name: "Moflix [Deutsch]",
              title: type === "series" ? `${title} S${season}E${episode}` : `${title} (${year || ""})`,
              url: streamResult.url,
              quality: streamResult.quality || "1080p",
              headers: streamResult.headers || {},
              format: streamResult.format || "m3u8"
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`[Moflix] getStreams Fehler: ${error.message}`);
  }

  return streams;
}

module.exports = { getStreams };
