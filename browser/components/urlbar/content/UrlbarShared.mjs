/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports urlbar related constants and other stateless helpers.
 * It can be imported into system and content realms, so it should not hold
 * state or use content only globals like `window`.
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
});

export const UrlbarShared = {
  TOKEN_TYPE: Object.freeze({
    TEXT: 1,
    // `looksLikeOrigin()` returned a value for this token that was neither
    // `LOOKS_LIKE_ORIGIN.NONE` nor `LOOKS_LIKE_ORIGIN.OTHER`. It sure looks
    // like an origin.
    POSSIBLE_ORIGIN: 2,
    POSSIBLE_URL: 3, // Consumers should still check this with a fixup.
    RESTRICT_HISTORY: 4,
    RESTRICT_BOOKMARK: 5,
    RESTRICT_TAG: 6,
    RESTRICT_OPENPAGE: 7,
    RESTRICT_SEARCH: 8,
    RESTRICT_TITLE: 9,
    RESTRICT_URL: 10,
    RESTRICT_ACTION: 11,
    // `looksLikeOrigin()` returned `LOOKS_LIKE_ORIGIN.OTHER` for this token.
    // It may or may not be an origin.
    POSSIBLE_ORIGIN_BUT_SEARCH_ALLOWED: 12,
  }),

  /**
   * Special characters that can be typed to restrict the search to a certain
   * category, like history, bookmarks or open pages; or to force a match on
   * just the title or url.
   *
   * These restriction characters can be typed alone, or at word boundaries,
   * provided their meaning cannot be confused, for example # could be present
   * in a valid url, and thus it should not be interpreted as a restriction.
   */
  RESTRICT_TOKENS: Object.freeze({
    HISTORY: "^",
    BOOKMARK: "*",
    TAG: "+",
    OPENPAGE: "%",
    SEARCH: "?",
    TITLE: "#",
    URL: "$",
    ACTION: ">",
  }),

  /**
   * Set of characters in RESTRICT_TOKENS that will enter search mode.
   */
  get SEARCH_MODE_RESTRICT() {
    /** @type {Values<typeof UrlbarShared.RESTRICT_TOKENS>[]} */
    const keys = [
      this.RESTRICT_TOKENS.HISTORY,
      this.RESTRICT_TOKENS.BOOKMARK,
      this.RESTRICT_TOKENS.OPENPAGE,
      this.RESTRICT_TOKENS.SEARCH,
    ];
    if (lazy.UrlbarPrefs.get("scotchBonnet.enableOverride")) {
      keys.push(this.RESTRICT_TOKENS.ACTION);
    }
    return new Set(keys);
  },
};
