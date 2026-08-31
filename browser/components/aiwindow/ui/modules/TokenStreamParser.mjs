/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const TOKEN_CHARACTER = "§";
const ALLOWED_TOKEN_STARTS = [
  "search:",
  "existing_memory:",
  "followup:",
  "url_token:",
  "kit:",
];
const MAX_START_LEN = Math.max(
  ...ALLOWED_TOKEN_STARTS.map(string => string.length)
);

// Keep a tail of recently emitted plain text so that when a URL token
// arrives we can peek backwards to tell whether the token is inside a
// markdown link `[click](URL)` or sitting on its own. 16 chars is
// enough even with whitespace between `](` and the token.
const URL_CONTEXT_LOOKBACK_CHARS = 16;

// Matches when the recent emitted text ends in `](` (with optional
// whitespace) — meaning the URL portion of a markdown link comes next.
const AT_MARKDOWN_LINK_URL_RE = /\]\(\s*$/;

// `encodeURIComponent` leaves `(` and `)` alone because they are
// "sub-delimiters" per RFC 3986, not characters it needs to escape.
// They are valid in URLs, but they collide with markdown's
// `[text](dest)` delimiters, which is what we're working around here.
const ENCODE_FOR_LINK_OVERRIDES = { "(": "%28", ")": "%29" };

function encodeForLink(c) {
  return ENCODE_FOR_LINK_OVERRIDES[c] ?? encodeURIComponent(c);
}

function isAllowedPrefix(string) {
  return ALLOWED_TOKEN_STARTS.some(start => start.startsWith(string));
}

function isExactAllowedStart(string) {
  return ALLOWED_TOKEN_STARTS.includes(string);
}

function pushPlain(plain, { state, str } = {}) {
  plain.push(str);
  state.recentPlain = (state.recentPlain + str).slice(
    -URL_CONTEXT_LOOKBACK_CHARS
  );
}

function hasUnbalancedParens(url) {
  let balance = 0;
  for (const c of url) {
    if (c === "(") {
      balance++;
    } else if (c === ")") {
      balance--;
      if (balance < 0) {
        return true;
      }
    }
  }
  return balance !== 0;
}

/**
 * Bug 2017972
 * Turn a URL token back into the text we want to show in the chat.
 *
 * Two cases:
 *   1. The token is sitting inside a markdown link, like
 *      `[click](§url§)`. We drop the URL straight in. We replace any
 *      characters that would confuse markdown's link parser with their
 *      percent-encoded equivalents:
 *        - spaces and `<` `>` always get encoded
 *        - `(` and `)` only get encoded when the URL has an unbalanced
 *          pair, which is what the parser actually trips on. URLs with
 *          matched parens (Wikipedia etc.) are left alone so the link
 *          looks normal on hover.
 *   2. The token is on its own, like `See §url§ for details`. We wrap
 *      the URL in `<...>` so it renders as a clickable link. Spaces
 *      and `<` `>` get percent-encoded so they can't break out of the
 *      wrapper.
 *
 * @param {string} url - The URL the token resolves to.
 * @param {string} recentPlain - Tail of recently emitted plain text,
 *   used to detect whether the token sits inside a markdown link.
 * @returns {string} The text to inject into the streamed plain output.
 */
function expandUrlToken(url, recentPlain) {
  const isMarkdownLink = AT_MARKDOWN_LINK_URL_RE.test(recentPlain);

  if (isMarkdownLink) {
    const encodePattern = hasUnbalancedParens(url) ? /[\s<>()]/g : /[\s<>]/g;
    return url.replace(encodePattern, encodeForLink);
  }

  return `<${url.replace(/[\s<>]/g, encodeForLink)}>`;
}

/**
 * Creates a new token stream parser state object.
 *
 * @returns {{
 *   inToken: boolean,
 *   tokenBuffer: string,
 *   tokenCandidate: boolean,
 *   pendingOpen: boolean,
 *   recentPlain: string
 * }} Parser state with token tracking.
 */
export function createParserState() {
  return {
    // Indicates if we are currently inside a token
    inToken: false,
    // Buffer to accumulate token data
    tokenBuffer: "",
    // Indicates if the current token is still a candidate for being valid
    tokenCandidate: false,
    // Indicates if there is a pending opening token character to process
    pendingOpen: false,
    // The last few characters we just sent to the chat. We peek at
    // this when expanding a URL token to figure out whether the token
    // is inside a markdown link or standing on its own.
    recentPlain: "",
  };
}

/**
 * Parses a raw token string into key-value pairs.
 *
 * @param {string} raw - Content between §...§, e.g. "search: query"
 * @returns {{key: string, value: string} | null} Parsed token with key and value, or null if invalid.
 */
export function parseToken(raw) {
  const text = String(raw ?? "").trim();

  if (!text) {
    return null;
  }

  const colonIndex = text.indexOf(":");
  if (colonIndex === -1) {
    return null; // require key:value
  }

  const key = text.slice(0, colonIndex).trim();
  const value = text.slice(colonIndex + 1).trim();

  if (!key) {
    return null; // prevent §: value§
  }

  return { key, value };
}

/**
 * Consumes a stream chunk and extracts tokens and plain text.
 *
 * Tokens are only recognized when the opening "§" is immediately followed by an
 * allowed token start (e.g. ALLOWED_TOKEN_STARTS). Otherwise the "§"
 * is treated as literal text and streaming continues without stalling.
 *
 * @param {string} chunk - The chunk of text to parse.
 * @param {{
 *   inToken: boolean,
 *   tokenBuffer: string,
 *   tokenCandidate: boolean,
 *   pendingOpen: boolean,
 *   recentPlain: string
 * }} state - Parser state object (mutated in place).
 * @param {Map<string, string>} tokenToUrl - Map a URL token to the full URL.
 * @returns {{
 *   plainText: string,
 *   tokens: Array<{key: string, value: string}>
 * }} Parsed plain text and tokens.
 */
export function consumeStreamChunk(chunk, state, tokenToUrl = new Map()) {
  const tokens = [];
  const plain = [];

  let chunkString = String(chunk ?? "");

  // A TOKEN_CHARACTER was seen at the end of the last chunk; treat it as opening now.
  if (state.pendingOpen) {
    chunkString = TOKEN_CHARACTER + chunkString;
    state.pendingOpen = false;
  }

  // Process each character in the chunk
  for (let i = 0; i < chunkString.length; i++) {
    const char = chunkString[i];
    const isTokenChar = char === TOKEN_CHARACTER;

    // ---- Normal character (not §) ----
    if (!isTokenChar) {
      // Plain text mode
      if (!state.inToken) {
        pushPlain(plain, { state, str: char });
        continue;
      }

      // Token mode: accumulate
      state.tokenBuffer += char;

      // If we already confirmed it's a real token, keep accumulating.
      if (!state.tokenCandidate) {
        continue;
      }

      // Candidate token: decide ASAP if it's real or literal.
      if (
        state.tokenBuffer.length > MAX_START_LEN ||
        !isAllowedPrefix(state.tokenBuffer)
      ) {
        pushPlain(plain, { state, str: TOKEN_CHARACTER + state.tokenBuffer });
        state.inToken = false;
        state.tokenCandidate = false;
        state.tokenBuffer = "";
        continue;
      }

      if (isExactAllowedStart(state.tokenBuffer)) {
        state.tokenCandidate = false; // confirmed
      }
      continue;
    }

    // ---- § character ----

    // Opening §
    if (!state.inToken) {
      // If § is the last char in this chunk, defer the decision to the next chunk.
      if (i === chunkString.length - 1) {
        state.pendingOpen = true;
        continue;
      }

      state.inToken = true;
      state.tokenCandidate = true;
      state.tokenBuffer = "";
      continue;
    }

    // Closing § (we were inToken)
    if (state.tokenCandidate) {
      // Never confirmed allowed start => literal text, don't stall streaming.
      pushPlain(plain, {
        state,
        str: TOKEN_CHARACTER + state.tokenBuffer + TOKEN_CHARACTER,
      });
    } else {
      try {
        const parsed = parseToken(state.tokenBuffer);

        if (parsed?.key == "url_token") {
          // Eagerly convert the url_token back to its original URL. The URL tokens
          // should only exist during the conversation to the language model. They
          // get expanded everywhere else in the system for URL security tracking
          // and the rendering of messages for users.
          const url = tokenToUrl.get(parsed.value);
          if (url) {
            pushPlain(plain, {
              state,
              str: expandUrlToken(url, state.recentPlain),
            });
          }
        } else if (parsed) {
          tokens.push(parsed);
        }
      } catch {
        // Do nothing.
      }
    }

    state.inToken = false;
    state.tokenCandidate = false;
    state.tokenBuffer = "";
  }

  return { plainText: plain.join(""), tokens };
}

/**
 * Flushes any remaining unclosed token or pending section symbol as literal text.
 *
 * @param {{
 *   inToken: boolean,
 *   tokenBuffer: string,
 *   tokenCandidate: boolean,
 *   pendingOpen: boolean,
 *   recentPlain: string
 * }} state - Parser state object (mutated in place).
 * @returns {string} Literal text for any unflushed remainder, or an empty string.
 */
export function flushTokenRemainder(state) {
  let out = "";

  if (state.pendingOpen) {
    out += TOKEN_CHARACTER;
    state.pendingOpen = false;
  }

  if (state.inToken) {
    out += TOKEN_CHARACTER + state.tokenBuffer;
    state.inToken = false;
    state.tokenCandidate = false;
    state.tokenBuffer = "";
  }

  return out;
}
