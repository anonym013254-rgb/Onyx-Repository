const { resolveHoster } = require("./extractors");

const BASE_URL = "https://einschalten.to";

/**
 * Scraper für Einschalten.to
 * @param {Object} params - { title, type, season, episode, year }
 */
async function getStreams({ title, type, season, episode, year }) {
  const streams = [];

  try {
    const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(title)}`;
    console.log(`[Einschalten] Suche unter: ${searchUrl}`);

    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (searchRes.status === 200) {
      const searchHtml = await searchRes.text();
      const linkMatch = searchHtml.match(/<a[^>]+href="(\/(?:movie|series)\/[^"]+)"/);

      if (linkMatch) {
        let watchUrl = BASE_URL + linkMatch[1];
        if (type === "series" && season && episode) {
          watchUrl += `/season-${season}/episode-${episode}`;
        }

        const watchRes = await fetch(watchUrl, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        const watchHtml = await watchRes.text();

        const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
        let iframeMatch;

        while ((iframeMatch = iframeRegex.exec(watchHtml)) !== null) {
          const embedUrl = iframeMatch[1];
          const streamResult = await resolveHoster(embedUrl);

          if (streamResult && streamResult.url) {
            streams.push({
              name: "Einschalten [Deutsch]",
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
    console.error(`[Einschalten] getStreams Fehler: ${error.message}`);
  }

  return streams;
}

module.exports = { getStreams };
