/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Extract link destination from text starting at given position.
 * Handles balanced parentheses and stops at optional title.
 *
 * @param {string} text - Text to parse
 * @param {number} start - Position to start parsing from
 * @returns {string} Extracted URL
 */
function extractLinkDestination(text, start) {
  let i = start;
  let parenDepth = 0;
  let url = "";

  while (i < text.length) {
    const ch = text[i];
    if (ch === "(") {
      parenDepth++;
      url += ch;
    } else if (ch === ")") {
      if (parenDepth === 0) {
        break;
      }
      parenDepth--;
      url += ch;
    } else if (ch === " " || ch === "\t" || ch === '"' || ch === "'") {
      break;
    } else if (ch === "\n") {
      break;
    } else {
      url += ch;
    }
    i++;
  }
  return url.trim();
}

/**
 * Extract markdown links from response text.
 * Skips links in code blocks and image syntax.
 *
 * @param {string} responseText - Raw response text with markdown links
 * @returns {Array<object>} Array of {text, url, position} objects
 */
export function extractMarkdownLinks(responseText) {
  if (!responseText) {
    return [];
  }

  // Strip fenced code blocks (replace with spaces to preserve positions)
  let cleaned = responseText.replace(/```[\s\S]*?```/g, match =>
    " ".repeat(match.length)
  );
  // Strip inline code with variable-length backtick fences (e.g., `code`, ``code``)
  cleaned = cleaned.replace(/(`+)(?!\1)([^`]|(?!\1)`)*\1/g, match =>
    " ".repeat(match.length)
  );

  const links = [];
  // Negative lookbehind to skip image links (![...](url))
  const linkStartRegex = /(?<!!)\[([^\]]+)\]\(/g;
  let match;

  while ((match = linkStartRegex.exec(cleaned)) !== null) {
    const text = match[1];
    const startPos = match.index;
    const urlStart = match.index + match[0].length;
    const url = extractLinkDestination(cleaned, urlStart);

    // Skip anchor links
    if (url && !url.startsWith("#")) {
      links.push({ text, url, position: startPos });
    }
  }

  return links;
}

/**
 * Normalize a URL for comparison purposes.
 * Handles trailing slashes, host case, and default ports.
 *
 * @param {string} urlString - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(urlString) {
  try {
    const url = new URL(urlString);

    // Lowercase hostname
    url.hostname = url.hostname.toLowerCase();

    // Remove default ports
    if (
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    ) {
      url.port = "";
    }

    // Remove trailing slash from pathname (except root)
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.href;
  } catch {
    return urlString;
  }
}

/**
 * Validate that cited URLs exist in the allowed URL list.
 *
 * @param {Array<string>} citedUrls - Array of citation URLs from response
 * @param {Array<string>} allowedUrls - Array of allowed URLs from tool results
 * @returns {object} Validation result:
 *   - valid: Array of valid citation URLs
 *   - invalid: Array of hallucinated citation URLs
 *   - validationRate: Percentage of valid citations (0-1)
 */
export function validateCitedUrls(citedUrls, allowedUrls) {
  if (!Array.isArray(citedUrls) || citedUrls.length === 0) {
    return { valid: [], invalid: [], validationRate: 1.0 };
  }

  if (!Array.isArray(allowedUrls)) {
    return { valid: [], invalid: [...citedUrls], validationRate: 0 };
  }

  const normalizedAllowed = new Set(allowedUrls.map(normalizeUrl));

  const valid = [];
  const invalid = [];

  for (const url of citedUrls) {
    if (normalizedAllowed.has(normalizeUrl(url))) {
      valid.push(url);
    } else {
      invalid.push(url);
    }
  }

  const validationRate = valid.length / citedUrls.length;
  return { valid, invalid, validationRate };
}
