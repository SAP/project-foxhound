/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Given a web page content document, finds candidates for an explicitly
 * declared canonical URL. Includes a fallback URL to use in case the content
 * did not declare a canonical URL.
 *
 * @param {Document} document
 * @returns {Omit<CanonicalURLSourceResults, "pushstate">}
 */
export function findCandidates(document) {
  return {
    link: getLinkRelCanonical(document),
    opengraph: getOpenGraphUrl(document),
    jsonLd: getJSONLDUrl(document),
    fallback: getFallbackCanonicalUrl(document),
  };
}

/**
 * Given a set of canonical URL candidates from `CanonicalURL.findCandidates`,
 * returns the best value to use as the canonical URL.
 *
 * @param {CanonicalURLSourceResults} sources
 * @returns {string}
 */
export function pickCanonicalUrl(sources) {
  return (
    sources.link ?? sources.opengraph ?? sources.jsonLd ?? sources.fallback
  );
}

/**
 * TODO: resolve relative URLs
 * TODO: can be a different hostname or domain; does that need special handling?
 *
 * @see https://www.rfc-editor.org/rfc/rfc6596
 *
 * @param {Document} document
 * @returns {string|null}
 */
export function getLinkRelCanonical(document) {
  const url = document
    .querySelector('link[rel="canonical"]')
    ?.getAttribute("href");

  return parseUrl(url, document);
}

/**
 * @see https://ogp.me/#url
 *
 * @param {Document} document
 * @returns {string|null}
 */
export function getOpenGraphUrl(document) {
  const url = document
    .querySelector('meta[property="og:url"]')
    ?.getAttribute("content");

  return parseUrl(url, document);
}

/**
 * Naïvely returns the first JSON-LD entity's URL, if found.
 * TODO: make sure it's a web page-like/content schema?
 *
 * @see https://schema.org/url
 *
 * @param {Document} document
 * @returns {string|null}
 */
export function getJSONLDUrl(document) {
  const firstMatch = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]')
  )
    .map(script => {
      try {
        return JSON.parse(script.textContent);
      } catch {
        return null;
      }
    })
    .find(obj => obj && typeof obj.url === "string");
  const url = firstMatch?.url;

  return parseUrl(url, document);
}

/**
 * @param {Document} document
 * @returns {string|null}
 */
export function getFallbackCanonicalUrl(document) {
  return cleanNoncanonicalUrl(document.documentURI);
}

/**
 * @param {string} url
 * @returns {string|null}
 */
export function cleanNoncanonicalUrl(url) {
  const parsed = URL.parse(url);
  if (parsed) {
    return [parsed.origin, parsed.pathname, parsed.search].join("");
  }
  return null;
}

/**
 * @param {string} urlString
 * @param {Document} document
 * @returns {string|null}
 */
export function parseUrl(urlString, document) {
  // Return null if the urlString is null or undefined. All other falsy values
  // (e.g. the empty string) pass through, since these could have been
  // explicitly set (see bug2009459).
  if (urlString == null) {
    return null;
  }

  return URL.parse(urlString, document.documentURI)?.toString() || null;
}
