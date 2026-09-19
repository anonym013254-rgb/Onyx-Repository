const { resolveHoster } = require("./extractors");

const BASE_URL = "https://filmfrei24.net";

/**
 * Scraper für FilmFrei24
 * @param {Object} params - { title, type, season, episode, year }
 */
async function getStreams({ title, type, season, episode, year }) {
  const streams = [];

  try {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    console.log(`[FilmFrei24] Suche unter: ${searchUrl}`);

    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (searchRes.status === 200) {
      const searchHtml = await searchRes.text();
      const linkMatch = searchHtml.match(/<article[^>]*>.*?<a[^>]+href="([^"]+)"/s);

      if (linkMatch) {
        let watchUrl = linkMatch[1];
        if (type === "series" && season && episode) {
          watchUrl = `${watchUrl.replace(/\/$/, "")}/season/${season}/episode/${episode}`;
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
              name: "FilmFrei24 [Deutsch]",
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
    console.error(`[FilmFrei24] getStreams Fehler: ${error.message}`);
  }

  return streams;
}

module.exports = { getStreams };
