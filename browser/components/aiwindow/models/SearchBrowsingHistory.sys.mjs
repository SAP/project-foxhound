/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  PageThumbs: "resource://gre/modules/PageThumbs.sys.mjs",
  PageThumbsStorage: "resource://gre/modules/PageThumbs.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  getPlacesSemanticHistoryManager:
    "resource://gre/modules/PlacesSemanticHistoryManager.sys.mjs",
  // Domain fallback / workaround for general-category queries (games, movies, etc.)
  SearchBrowsingHistoryDomainBoost:
    "moz-src:///browser/components/aiwindow/models/SearchBrowsingHistoryDomainBoost.sys.mjs",
});

/**
 * Convert ISO timestamp string to microseconds (moz_places format).
 *
 * @param {string|null} iso
 * @returns {number|null}
 */
function isoToMicroseconds(iso) {
  if (!iso) {
    return null;
  }
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms * 1000 : null;
}

/**
 * Normalize a history row from either:
 * - semantic SQL result (mozIStorageRow), or
 * - Places history node (plain object from nsINavHistoryResultNode).
 *
 * @param {object} row
 * @param {boolean} [fromNode=false]  // true if row came from Places node
 * @returns {Promise<object>}         // normalized history entry
 */
async function buildHistoryRow(row, fromNode = false) {
  let title, url, visitDateIso, visitCount, distance, frecency, previewImageURL;

  if (!fromNode) {
    // from semantic / SQL result (mozIStorageRow)
    title = row.getResultByName("title");
    url = row.getResultByName("url");
    visitCount = row.getResultByName("visit_count");
    distance = row.getResultByName("distance");
    frecency = row.getResultByName("frecency");
    previewImageURL = row.getResultByName("preview_image_url");

    // convert last_visit_date to ISO format
    const lastVisitRaw = row.getResultByName("last_visit_date");
    // last_visit_date is in microseconds from moz_places
    if (typeof lastVisitRaw === "number") {
      visitDateIso = new Date(Math.round(lastVisitRaw / 1000)).toISOString();
    } else if (lastVisitRaw instanceof Date) {
      visitDateIso = lastVisitRaw.toISOString();
    } else {
      visitDateIso = null;
    }
  } else {
    // from basic / Places history node (nsINavHistoryResultNode)
    title = row.title;
    url = row.uri;
    visitCount = row.accessCount;
    frecency = row.frecency;

    // convert time to ISO format
    const lastVisitDate = lazy.PlacesUtils.toDate(row.time);
    visitDateIso = lastVisitDate ? lastVisitDate.toISOString() : null;
  }

  let relevanceScore;
  if (typeof distance === "number") {
    relevanceScore = 1 - distance;
  } else {
    relevanceScore = frecency;
  }

  // Get thumbnail URL for the page if preview_image_url does not exist
  try {
    if (!previewImageURL) {
      if (await lazy.PageThumbsStorage.fileExistsForURL(url)) {
        previewImageURL = lazy.PageThumbs.getThumbnailURL(url);
      }
    }
  } catch (e) {
    // If thumbnail lookup fails, skip it
  }

  // Get favicon URL for the page
  let faviconUrl = null;
  try {
    const faviconURI = Services.io.newURI(url);
    faviconUrl = `page-icon:${faviconURI.spec}`;
  } catch (e) {
    // If favicon lookup fails, skip it
  }

  return {
    title: title || url,
    url,
    visitDate: visitDateIso, // ISO timestamp format
    visitCount: visitCount || 0,
    relevanceScore: relevanceScore || 0, // Use embedding's distance as relevance score when available
    ...(faviconUrl && { favicon: faviconUrl }), // Only include favicon if available
    ...(previewImageURL && { thumbnail: previewImageURL }), // Only include thumbnail if available
  };
}

/**
 * Plain time-range browsing history search without search term (no semantic search).
 *
 * @param {object} params
 * @param {number|null} params.startTs
 * @param {number|null} params.endTs
 * @param {number} params.historyLimit
 * @returns {Promise<object[]>}
 */
async function searchBrowsingHistoryTimeRange({
  startTs,
  endTs,
  historyLimit,
}) {
  const results = [];
  await lazy.PlacesUtils.withConnectionWrapper(
    "SearchBrowsingHistory:searchBrowsingHistoryTimeRange",
    async db => {
      const stmt = await db.executeCached(
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
          ORDER BY last_visit_date DESC, frecency DESC
          LIMIT :limit
        `,
        {
          startTs,
          endTs,
          limit: historyLimit,
        }
      );

      for (let row of stmt) {
        results.push(row);
      }
    }
  );

  const rows = [];
  for (let row of results) {
    rows.push(await buildHistoryRow(row));
  }
  return rows;
}

/**
 * Normalize tensor/output format from the embedder into a single vector.
 *
 * @param {Array|object} tensor
 * @returns {Array|Float32Array}
 */
function extractVectorFromTensor(tensor) {
  if (!tensor) {
    throw new Error("Unexpected empty tensor");
  }

  // Case 1: { output: ... } or { metrics, output }
  if (tensor.output) {
    if (
      Array.isArray(tensor.output) &&
      (Array.isArray(tensor.output[0]) || ArrayBuffer.isView(tensor.output[0]))
    ) {
      // output is an array of vectors, return the first
      return tensor.output[0];
    }
    // output is already a single vector
    return tensor.output;
  }

  // Case 2: tensor is nested like [[...]]
  if (
    Array.isArray(tensor) &&
    tensor.length === 1 &&
    Array.isArray(tensor[0])
  ) {
    tensor = tensor[0];
  }

  // Then we check if it's an array of arrays or just a single value.
  if (
    Array.isArray(tensor) &&
    (Array.isArray(tensor[0]) || ArrayBuffer.isView(tensor[0]))
  ) {
    return tensor[0];
  }

  return tensor;
}

/**
 * Semantic browsing history search using embeddings.
 *
 * This performs a two-stage retrieval for performance:
 * 1. Coarse search: over the quantized embeddings (`embedding_coarse`) to
 *    quickly select up to 100 candidate rows. This hard limit keeps the
 *    expensive cosine-distance computation bounded.
 * 2. Refined search: computes the exact cosine distance for those candidates
 *    and applies the caller-provided `historyLimit` and `distanceThreshold`
 *    filters.
 *
 * @param {object} params
 * @param {string} params.searchTerm
 * @param {number|null} params.startTs
 * @param {number|null} params.endTs
 * @param {number} params.historyLimit
 * @param {number} params.distanceThreshold
 * @returns {Promise<object[]>}
 */
async function searchBrowsingHistorySemantic({
  searchTerm,
  startTs,
  endTs,
  historyLimit,
  distanceThreshold,
}) {
  const semanticManager = lazy.getPlacesSemanticHistoryManager();
  await semanticManager.embedder.ensureEngine();

  // Embed search term
  let tensor = await semanticManager.embedder.embed(searchTerm);
  const vec = extractVectorFromTensor(tensor);
  const vector = lazy.PlacesUtils.tensorToSQLBindable(vec);

  let conn = await semanticManager.getConnection();
  const results = await conn.executeCached(
    `
    WITH coarse_matches AS (
      SELECT rowid,
             embedding
      FROM vec_history
      WHERE embedding_coarse match vec_quantize_binary(:vector)
      ORDER BY distance
      LIMIT 100
    ),
    matches AS (
      SELECT url_hash, vec_distance_cosine(embedding, :vector) AS distance
      FROM vec_history_mapping
      JOIN coarse_matches USING (rowid)
      WHERE distance <= :distanceThreshold
      ORDER BY distance
      LIMIT :limit
    )
    SELECT id,
           title,
           url,
           distance,
           visit_count,
           frecency,
           last_visit_date,
           preview_image_url
    FROM moz_places
    JOIN matches USING (url_hash)
    WHERE frecency <> 0
    AND (:startTs IS NULL OR last_visit_date >= :startTs)
    AND (:endTs IS NULL OR last_visit_date <= :endTs)
    ORDER BY distance
    `,
    {
      vector,
      distanceThreshold,
      limit: historyLimit,
      startTs,
      endTs,
    }
  );

  const rows = [];
  for (let row of results) {
    rows.push(await buildHistoryRow(row));
  }

  // Domain fallback for general-category queries (games, movies, news, etc.)
  // Keep semantic ranking primary, only top-up if we have room.
  if (rows.length < historyLimit) {
    const domains =
      lazy.SearchBrowsingHistoryDomainBoost.matchDomains(searchTerm);
    if (domains?.length) {
      const domainRows =
        await lazy.SearchBrowsingHistoryDomainBoost.searchByDomains({
          conn,
          domains,
          startTs,
          endTs,
          historyLimit: Math.max(historyLimit * 2, 200), // extra for dedupe
          buildHistoryRow,
        });

      return lazy.SearchBrowsingHistoryDomainBoost.mergeDedupe(
        rows,
        domainRows,
        historyLimit
      );
    }
  }

  return rows;
}

/**
 * Browsing history search using the default history search.
 *
 * @param {object} params
 * @param {string} params.searchTerm
 * @param {number} params.historyLimit
 * @returns {Promise<object[]>}
 */
async function searchBrowsingHistoryBasic({ searchTerm, historyLimit }) {
  let root;
  let openedRoot = false;

  try {
    const currentHistory = lazy.PlacesUtils.history;
    const query = currentHistory.getNewQuery();
    const opts = currentHistory.getNewQueryOptions();

    // Use Places' built-in text filtering
    query.searchTerms = searchTerm;

    // Simple URI results, ranked by frecency
    opts.resultType = Ci.nsINavHistoryQueryOptions.RESULTS_AS_URI;
    opts.sortingMode = Ci.nsINavHistoryQueryOptions.SORT_BY_FRECENCY_DESCENDING;
    opts.maxResults = historyLimit;
    opts.excludeQueries = false;
    opts.queryType = Ci.nsINavHistoryQueryOptions.QUERY_TYPE_HISTORY;

    const result = currentHistory.executeQuery(query, opts);
    root = result.root;

    if (!root.containerOpen) {
      root.containerOpen = true;
      openedRoot = true;
    }

    const rows = [];
    for (let i = 0; i < root.childCount && rows.length < historyLimit; i++) {
      const node = root.getChild(i);
      rows.push(await buildHistoryRow(node, true));
    }
    return rows;
  } catch (error) {
    console.error("Error searching browser history:", error);
    return [];
  } finally {
    if (root && openedRoot) {
      root.containerOpen = false;
    }
  }
}

/**
 * Searches browser history using semantic search when possible, otherwise basic
 * text search or time-range filtering.
 *
 * Rules:
 *   - Empty searchTerm: time-range search (if start/end given) or recent history.
 *   - Non-empty searchTerm: semantic search when available, otherwise basic text
 *     search (ignore time filtering).
 *
 * @param {object} params
 *  The search parameters.
 * @param {string} params.searchTerm
 *  The search string. If null or empty, semantic search is skipped and
 *  results are filtered by time range and sorted by last_visit_date and frecency.
 * @param {string|null} params.startTs
 *  Optional local ISO-8601 start timestamp (e.g. "2025-11-07T09:00:00").
 * @param {string|null} params.endTs
 *  Optional local ISO-8601 end timestamp (e.g. "2025-11-07T09:00:00").
 * @param {number} params.historyLimit
 *  Maximum number of history results to return.
 * @returns {Promise<object>}
 *  A promise resolving to an object with the search term and history results.
 *  Includes `count` when matches exist, a `message` when none are found, or an
 *  `error` string on failure.
 */
export async function searchBrowsingHistory({
  searchTerm = "",
  startTs = null,
  endTs = null,
  historyLimit = 15,
}) {
  let rows = [];

  try {
    // Convert ISO timestamp strings to microseconds to match the format used in moz_places
    const startUs = isoToMicroseconds(startTs);
    const endUs = isoToMicroseconds(endTs);

    const distanceThreshold = Services.prefs.getFloatPref(
      "places.semanticHistory.distanceThreshold",
      0.6
    );

    const semanticManager = lazy.getPlacesSemanticHistoryManager();

    // If semantic search cannot be used or we don't have enough entries, always
    // fall back to plain time-range search.
    const canUseSemantic =
      semanticManager.canUseSemanticSearch &&
      (await semanticManager.hasSufficientEntriesForSearching());

    if (!searchTerm?.trim()) {
      // Plain time-range search (no searchTerm)
      rows = await searchBrowsingHistoryTimeRange({
        startTs: startUs,
        endTs: endUs,
        historyLimit,
      });
    } else if (canUseSemantic) {
      // Semantic search
      rows = await searchBrowsingHistorySemantic({
        searchTerm,
        startTs: startUs,
        endTs: endUs,
        historyLimit,
        distanceThreshold,
      });
    } else {
      // Fallback to basic search without time window if semantic search not enable or insufficient records.
      rows = await searchBrowsingHistoryBasic({
        searchTerm,
        historyLimit,
      });
    }

    if (rows.length === 0) {
      return JSON.stringify({
        searchTerm,
        count: 0,
        results: [],
        message: searchTerm
          ? `No browser history found for "${searchTerm}".`
          : "No browser history found in the requested time range.",
      });
    }

    // Return as JSON string with metadata
    return JSON.stringify({
      searchTerm,
      count: rows.length,
      results: rows,
    });
  } catch (error) {
    console.error("Error searching browser history:", error);
    return JSON.stringify({
      searchTerm,
      count: 0,
      results: [],
      error: `Error searching browser history: ${error.message}`,
    });
  }
}
