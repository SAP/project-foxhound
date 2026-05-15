/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const TOKEN_CHARACTER = "§";
const ALLOWED_TOKEN_STARTS = ["search:", "existing_memory:", "followup:"];
const MAX_START_LEN = Math.max(
  ...ALLOWED_TOKEN_STARTS.map(string => string.length)
);

function isAllowedPrefix(string) {
  return ALLOWED_TOKEN_STARTS.some(start => start.startsWith(string));
}

function isExactAllowedStart(string) {
  return ALLOWED_TOKEN_STARTS.includes(string);
}

/**
 * Creates a new token stream parser state object.
 *
 * @returns {{
 *   inToken: boolean,
 *   tokenBuffer: string,
 *   tokenCandidate: boolean,
 *   pendingOpen: boolean
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
 *   pendingOpen: boolean
 * }} state - Parser state object (mutated in place).
 * @param {(msg: string) => void} [logDebug] - Optional debug logger for parse failures.
 * @returns {{
 *   plainText: string,
 *   tokens: Array<{key: string, value: string}>
 * }} Parsed plain text and tokens.
 */
export function consumeStreamChunk(chunk, state, logDebug) {
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
        plain.push(char);
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
        plain.push(TOKEN_CHARACTER + state.tokenBuffer);
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
      plain.push(TOKEN_CHARACTER + state.tokenBuffer + TOKEN_CHARACTER);
    } else {
      try {
        const parsed = parseToken(state.tokenBuffer);
        if (parsed) {
          tokens.push(parsed);
        }
      } catch (e) {
        logDebug?.(`Failed to parse token: ${String(e)}`);
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
 *   pendingOpen: boolean
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
