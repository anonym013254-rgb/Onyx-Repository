/**
 * Wiederverwendbare Hoster-Extraktoren für deutsche Streaming-Websites
 */

// VOE Extractor
async function extractVOE(embedUrl) {
  try {
    const response = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": embedUrl
      }
    });
    const html = await response.text();

    // Suche nach m3u8 URL oder Base64 HLS Link
    const hlsMatch = html.match(/['"](https?:\/\/[^'"]+?\.m3u8[^'"]*?)['"]/i) ||
                     html.match(/hls['"]?\s*:\s*['"]([^'"]+)['"]/i) ||
                     html.match(/'hls':\s*'([^']+)'/);

    if (hlsMatch && hlsMatch[1]) {
      return {
        url: hlsMatch[1],
        quality: "1080p",
        format: "m3u8",
        headers: { "Referer": embedUrl }
      };
    }
  } catch (err) {
    console.error("[Extractors] Fehler bei VOE Extraktion:", err.message);
  }
  return null;
}

// Streamtape Extractor
async function extractStreamtape(embedUrl) {
  try {
    const res = await fetch(embedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const html = await res.text();

    const scriptMatch = html.match(/document\.getElementById\('robotlink'\)\.innerHTML\s*=\s*'([^']+)'\s*\+\s*\('([^']+)'\)/);
    if (scriptMatch) {
      const videoUrl = "https:" + scriptMatch[1] + scriptMatch[2].substring(3);
      return {
        url: videoUrl,
        quality: "720p",
        format: "mp4",
        headers: { "Referer": embedUrl }
      };
    }
  } catch (err) {
    console.error("[Extractors] Fehler bei Streamtape Extraktion:", err.message);
  }
  return null;
}

// Doodstream Extractor
async function extractDoodstream(embedUrl) {
  try {
    const res = await fetch(embedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const html = await res.text();
    const passMatch = html.match(/\/pass_md5\/([^'"]+)/);
    if (passMatch) {
      const passUrl = "https://dood.to/pass_md5/" + passMatch[1];
      const tokenRes = await fetch(passUrl, {
        headers: { "Referer": embedUrl, "User-Agent": "Mozilla/5.0" }
      });
      const tokenText = await tokenRes.text();
      const directUrl = tokenText + "zabcdef1234567890?token=" + passMatch[1] + "&expiry=" + Date.now();
      return {
        url: directUrl,
        quality: "720p",
        format: "mp4",
        headers: { "Referer": "https://dood.to/" }
      };
    }
  } catch (err) {
    console.error("[Extractors] Fehler bei Doodstream Extraktion:", err.message);
  }
  return null;
}

// Vidoza Extractor
async function extractVidoza(embedUrl) {
  try {
    const res = await fetch(embedUrl);
    const html = await res.text();
    const srcMatch = html.match(/sourcesCode\s*=\s*\[\{src:\s*"([^"]+)"/i) ||
                     html.match(/<source\s+src="([^"]+)"/i);
    if (srcMatch && srcMatch[1]) {
      return {
        url: srcMatch[1],
        quality: "720p",
        format: "mp4",
        headers: { "Referer": embedUrl }
      };
    }
  } catch (err) {
    console.error("[Extractors] Fehler bei Vidoza Extraktion:", err.message);
  }
  return null;
}

// Universal Resolver
async function resolveHoster(url) {
  if (!url) return null;
  if (url.includes("voe.sx") || url.includes("voe-network") || url.includes("audaciousdefaulthouse.com")) {
    return await extractVOE(url);
  }
  if (url.includes("streamtape.com") || url.includes("streamta.pe")) {
    return await extractStreamtape(url);
  }
  if (url.includes("dood") || url.includes("d000d") || url.includes("ds2play")) {
    return await extractDoodstream(url);
  }
  if (url.includes("vidoza.net") || url.includes("videobin")) {
    return await extractVidoza(url);
  }
  return null;
}

module.exports = {
  extractVOE,
  extractStreamtape,
  extractDoodstream,
  extractVidoza,
  resolveHoster
};
