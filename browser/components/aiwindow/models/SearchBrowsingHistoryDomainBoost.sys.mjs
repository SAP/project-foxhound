/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * SearchBrowsingHistoryDomainBoost
 *
 * Temporary heuristic for general-category queries (games, movies, news, etc.)
 * when semantic embeddings over title/description are insufficient.
 *
 * Safe to remove once richer embeddings or better intent classification lands.
 */

export const CATEGORIES_JSON = {
  language: "en",
  categories: [
    {
      id: "games",
      terms: [
        "game",
        "games",
        "video game",
        "video games",
        "pc games",
        "console games",
      ],
      domains: [
        "store.steampowered.com",
        "roblox.com",
        "ign.com",
        "gamespot.com",
        "polygon.com",
        "metacritic.com",
        "epicgames.com",
        "store.playstation.com",
        "xbox.com",
        "nintendo.com",
      ],
    },
    {
      id: "movies",
      terms: ["movie", "movies", "film", "films", "cinema"],
      domains: [
        "imdb.com",
        "rottentomatoes.com",
        "metacritic.com",
        "letterboxd.com",
        "netflix.com",
        "primevideo.com",
        "disneyplus.com",
        "hulu.com",
        "max.com",
      ],
    },
    {
      id: "tv",
      terms: ["tv show", "tv shows", "show", "shows", "series", "tv series"],
      domains: [
        "imdb.com",
        "rottentomatoes.com",
        "metacritic.com",
        "tvmaze.com",
        "thetvdb.com",
        "netflix.com",
        "primevideo.com",
        "disneyplus.com",
        "hulu.com",
        "max.com",
      ],
    },
    {
      id: "books",
      terms: ["book", "books", "novel", "novels"],
      domains: [
        "goodreads.com",
        "gutenberg.org",
        "openlibrary.org",
        "barnesandnoble.com",
        "indigo.ca",
      ],
    },
    {
      id: "anime",
      terms: ["anime", "manga"],
      domains: [
        "myanimelist.net",
        "anilist.co",
        "kitsu.app",
        "crunchyroll.com",
      ],
    },
    {
      id: "music",
      terms: ["music", "song", "songs", "album", "albums", "lyrics"],
      domains: [
        "spotify.com",
        "music.apple.com",
        "soundcloud.com",
        "bandcamp.com",
        "music.youtube.com",
      ],
    },
    {
      id: "podcasts",
      terms: ["podcast", "podcasts"],
      domains: [
        "podcasts.apple.com",
        "overcast.fm",
        "pocketcasts.com",
        "castbox.fm",
      ],
    },
    {
      id: "papers_research",
      terms: [
        "paper",
        "papers",
        "research paper",
        "research papers",
        "academic paper",
        "academic papers",
        "journal",
        "journals",
        "study",
        "studies",
        "publication",
        "publications",
      ],
      domains: [
        "scholar.google.com",
        "arxiv.org",
        "semanticscholar.org",
        "pubmed.ncbi.nlm.nih.gov",
        "researchgate.net",
        "ieeexplore.ieee.org",
        "dl.acm.org",
        "springer.com",
        "nature.com",
        "science.org",
      ],
    },
    {
      id: "tech_news",
      terms: ["tech news", "technology news", "startup news"],
      domains: [
        "theverge.com",
        "techcrunch.com",
        "wired.com",
        "arstechnica.com",
        "engadget.com",
      ],
    },
    {
      id: "finance_news",
      terms: ["finance news", "business news", "market news", "stock news"],
      domains: [
        "bloomberg.com",
        "wsj.com",
        "ft.com",
        "reuters.com",
        "cnbc.com",
      ],
    },
    {
      id: "news",
      terms: [
        "news",
        "headline",
        "headlines",
        "breaking news",
        "world news",
        "latest news",
      ],
      domains: [
        "reuters.com",
        "apnews.com",
        "bbc.com",
        "cnn.com",
        "nytimes.com",
        "theguardian.com",
        "washingtonpost.com",
        "aljazeera.com",
        "npr.org",
        "wsj.com",
        "bloomberg.com",
        "ft.com",
      ],
    },
    {
      id: "recipes",
      terms: [
        "recipe",
        "recipes",
        "cooking",
        "food",
        "dinner ideas",
        "meal prep",
      ],
      domains: [
        "allrecipes.com",
        "seriouseats.com",
        "foodnetwork.com",
        "bbcgoodfood.com",
        "epicurious.com",
        "nytcooking.com",
      ],
    },
    {
      id: "travel",
      terms: ["travel", "hotels", "places", "destinations", "things to do"],
      domains: [
        "tripadvisor.com",
        "booking.com",
        "expedia.com",
        "airbnb.com",
        "lonelyplanet.com",
      ],
    },
  ],
};

/**
 * Normalizes a query string into a lowercase, space-separated form suitable for matching
 * and comparison.
 *
 * @param {string} s
 * @returns {string}
 */
function normalizeQuery(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns the matched category domains if searchTerm looks like a general category query.
 * Uses phrase matching on normalized query string.
 *
 * @param {string} searchTerm
 * @param {object} [categoriesJson=CATEGORIES_JSON]
 * @returns {string[]|null}
 */
export function matchDomains(searchTerm, categoriesJson = CATEGORIES_JSON) {
  const q = ` ${normalizeQuery(searchTerm)} `;
  if (!q.trim()) {
    return null;
  }

  for (const cat of categoriesJson.categories) {
    for (const t of cat.terms) {
      // Pad with spaces to enable whole-token phrase matching via includes.
      const tt = ` ${normalizeQuery(t)} `;
      if (tt.trim() && q.includes(tt)) {
        return cat.domains;
      }
    }
  }

  return null;
}

/**
 * Builds a SQL WHERE clause for matching `http`/`https` URLs belonging
 * to the given root domains and their `www` variants.
 *
 * @param {string[]} domains
 * @returns {{ where: string, params: object }}
 */
function buildDomainUrlWhere(domains) {
  const clauses = [];
  const params = {};
  let i = 0;

  for (const raw of domains || []) {
    const d = String(raw).toLowerCase();
    if (!d) {
      continue;
    }

    // - https://domain/...
    // - https://www.domain/...
    params[`d${i}`] = `%://${d}/%`;
    clauses.push(`lower(url) LIKE :d${i++}`);

    params[`d${i}`] = `%://www.${d}/%`;
    clauses.push(`lower(url) LIKE :d${i++}`);
  }

  return {
    where: clauses.length ? `(${clauses.join(" OR ")})` : "0",
    params,
  };
}

/**
 * Domain-filtered moz_places query (time-windowed).
 *
 * @param {object} params
 * @param {object} params.conn
 * @param {string[]} params.domains
 * @param {number|null} params.startTs
 * @param {number|null} params.endTs
 * @param {number} params.historyLimit
 * @param {Function} params.buildHistoryRow
 * @returns {Promise<object[]>}
 */
export async function searchByDomains({
  conn,
  domains,
  startTs,
  endTs,
  historyLimit,
  buildHistoryRow,
}) {
  if (!conn || !Array.isArray(domains) || !domains.length) {
    return [];
  }

  const { where, params } = buildDomainUrlWhere(domains);

  const results = await conn.executeCached(
    `
      SELECT id,
             title,
             url,
             NULL AS distance,
             visit_count,
             frecency,
             last_visit_date,
             preview_image_url
      FROM moz_places
      WHERE frecency <> 0
        AND (:startTs IS NULL OR last_visit_date >= :startTs)
        AND (:endTs IS NULL OR last_visit_date <= :endTs)
        AND ${where}
      ORDER BY last_visit_date DESC, frecency DESC
      LIMIT :limit
    `,
    {
      startTs,
      endTs,
      limit: historyLimit,
      ...params,
    }
  );

  const rows = [];
  for (const row of results) {
    rows.push(await buildHistoryRow(row));
  }
  return rows;
}

/**
 * Merge two result lists, keeping `primary` order, then topping up from `secondary`,
 * while de-duping by url (fallback to id).
 *
 * @param {object[]} primary
 * @param {object[]} secondary
 * @param {number} limit
 * @returns {object[]}
 */
export function mergeDedupe(primary, secondary, limit) {
  const seen = new Set();
  const out = [];

  const keyOf = r => r?.url || r?.id;

  for (const r of primary || []) {
    const k = keyOf(r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
      if (out.length >= limit) {
        return out;
      }
    }
  }

  for (const r of secondary || []) {
    const k = keyOf(r);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
      if (out.length >= limit) {
        return out;
      }
    }
  }

  return out;
}

export const SearchBrowsingHistoryDomainBoost = Object.freeze({
  matchDomains,
  searchByDomains,
  mergeDedupe,
});
