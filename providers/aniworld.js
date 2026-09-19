const { resolveHoster } = require("./extractors");

const BASE_URL = "https://aniworld.to";

/**
 * Wandelt Titel in URL-Slug um (z.B. "Attack on Titan" -> "attack-on-titan")
 */
function toSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Scraper für AniWorld
 * @param {Object} params - { title, type, season, episode, year }
 */
async function getStreams({ title, type, season, episode, year }) {
  const streams = [];
  const s = season || 1;
  const ep = episode || 1;

  try {
    const slug = toSlug(title);
    
    // URL-Struktur: /anime/stream/<slug>/staffel-<season>/episode-<episode>
    const episodeUrl = `${BASE_URL}/anime/stream/${slug}/staffel-${s}/episode-${ep}`;
    console.log(`[AniWorld] Suche Stream unter: ${episodeUrl}`);

    const res = await fetch(episodeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (res.status === 200) {
      const html = await res.text();

      // Finde alle Hoster-Einträge in der Episode
      // Format auf AniWorld: data-link-target="/redirect/12345"
      const linkRegex = /data-link-target="([^"]+)"[^>]*data-lang-key="([0-9]+)"/g;
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        const redirectPath = match[1];
        const langKey = match[2]; // 1 = DE Synchro, 2 = DE Sub, 3 = ENG Sub
        const langLabel = langKey === "1" ? "DE Synchro" : langKey === "2" ? "DE Sub" : "ENG Sub";

        try {
          const redirectUrl = BASE_URL + redirectPath;
          const hosterRes = await fetch(redirectUrl, { redirect: "follow" });
          const embedUrl = hosterRes.url;

          const streamResult = await resolveHoster(embedUrl);
          if (streamResult && streamResult.url) {
            streams.push({
              name: `AniWorld [${langLabel}]`,
              title: `${title} - S${s}E${ep}`,
              url: streamResult.url,
              quality: streamResult.quality || "1080p",
              headers: streamResult.headers || {},
              format: streamResult.format || "m3u8"
            });
          }
        } catch (linkErr) {
          console.error(`[AniWorld] Fehler beim Auflösen des Links: ${linkErr.message}`);
        }
      }
    }
  } catch (error) {
    console.error(`[AniWorld] getStreams Fehler: ${error.message}`);
  }

  return streams;
}

module.exports = { getStreams };
