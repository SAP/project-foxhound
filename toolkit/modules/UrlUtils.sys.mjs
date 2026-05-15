/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module exports useful regular expressions for matching components of a
 * url as well as functions for checking if a given string looks like a url or
 * a part of one.
 *
 * Emails are explicitly NOT counted as urls since we want to deal with them
 * separately.
 */

export const UrlUtils = {
  // Regex matching on whitespaces.
  REGEXP_SPACES: /\s+/,
  REGEXP_SPACES_START: /^\s+/,

  // Regex used to guess url-like strings.
  // These are not expected to be 100% correct, we accept some user mistypes
  // and we're unlikely to be able to cover 100% of the cases.
  REGEXP_LIKE_PROTOCOL: /^[A-Z+.-]+:\/*(?!\/)/i,
  REGEXP_USERINFO_INVALID_CHARS: /[^\w.~%!$&'()*+,;=:-]/,
  REGEXP_HOSTPORT_INVALID_CHARS: /[^\[\]A-Z0-9.:-]/i,
  REGEXP_HOSTPORT_INVALID_TLD_NUM: /\.\w*\d\w*(:\d+)?$/,
  REGEXP_SINGLE_WORD_HOST: /^[^.:]+$/i,
  REGEXP_HOSTPORT_IP_LIKE: /^(?=(.*[.:].*){2})[a-f0-9\.\[\]:]+$/i,
  // This accepts partial IPv4.
  REGEXP_HOSTPORT_INVALID_IP:
    /\.{2,}|\d{5,}|\d{4,}(?![:\]])|^\.|^(\d+\.){4,}\d+$|^\d{4,}$/,
  // This only accepts complete IPv4.
  REGEXP_HOSTPORT_IPV4: /^(\d{1,3}\.){3,}\d{1,3}(:\d+)?$/,
  // This accepts partial IPv6.
  REGEXP_HOSTPORT_IPV6: /^\[([0-9a-f]{0,4}:){0,7}[0-9a-f]{0,4}\]?$/i,
  REGEXP_COMMON_EMAIL: /^[\w!#$%&'*+/=?^`{|}~.-]+@[\[\]A-Z0-9.-]+$/i,
  REGEXP_HAS_PORT: /:\d+$/,
  // Regex matching a percent encoded char at the beginning of a string.
  REGEXP_PERCENT_ENCODED_START: /^(%[0-9a-f]{2}){2,}/i,
  // Regex matching scheme and colon, plus, if present, two slashes.
  REGEXP_PREFIX: /^[a-z-]+:(?:\/){0,2}/i,

  /**
   * Returns whether the passed in token looks like a URL.
   * This is based on guessing and heuristics, that means if this function
   * returns false, it's surely not a URL, if it returns true, the result must
   * still be verified through URIFixup.
   *
   * @param {string} token
   *   The string token to verify
   * @param {object} [options]
   * @param {boolean} [options.requirePath]
   *   The url must have a path
   * @param {boolean} [options.validateOrigin]
   *   The prepath must look like an origin
   * @param {ConsoleInstance} [logger]
   *   Optional logger for debugging
   * @returns {boolean}
   *   Whether the token looks like a URL
   */
  looksLikeUrl(
    token,
    { requirePath = false, validateOrigin = false } = {},
    logger
  ) {
    if (token.length < 2) {
      return false;
    }
    // Ignore spaces and require path for the data: protocol.
    if (token.startsWith("data:")) {
      return token.length > 5;
    }
    if (this.REGEXP_SPACES.test(token)) {
      return false;
    }
    // If it starts with something that looks like a protocol, it's likely a url.
    if (this.REGEXP_LIKE_PROTOCOL.test(token)) {
      return true;
    }
    // Guess path and prePath. At this point we should be analyzing strings not
    // having a protocol.
    let slashIndex = token.indexOf("/");
    let prePath = slashIndex != -1 ? token.slice(0, slashIndex) : token;
    if (!this.looksLikeOrigin(prePath, { ignoreKnownDomains: true })) {
      return false;
    }

    // Check if prePath looks like origin.
    if (validateOrigin) {
      const result = this.looksLikeOrigin(prePath, {
        ignoreKnownDomains: false,
      });
      if (result !== this.LOOKS_LIKE_ORIGIN.NONE) {
        return true;
      }
      return false;
    }

    let path = slashIndex != -1 ? token.slice(slashIndex) : "";
    logger?.debug("path", path);
    if (requirePath && !path) {
      return false;
    }
    // If there are both path and userinfo, it's likely a url.
    let atIndex = prePath.indexOf("@");
    let userinfo = atIndex != -1 ? prePath.slice(0, atIndex) : "";
    if (path.length && userinfo.length) {
      return true;
    }

    // If the first character after the slash in the path is a letter, then the
    // token may be an "abc/def" url.
    if (/^\/[a-z]/i.test(path)) {
      return true;
    }
    // If the path contains special chars, it is likely a url.
    if (["%", "?", "#"].some(c => path.includes(c))) {
      return true;
    }

    // The above looksLikeOrigin call told us the prePath looks like an origin,
    // now we go into details checking some common origins.
    let hostPort = atIndex != -1 ? prePath.slice(atIndex + 1) : prePath;
    if (this.REGEXP_HOSTPORT_IPV4.test(hostPort)) {
      return true;
    }
    // ipv6 is very complex to support, just check for a few chars.
    if (
      this.REGEXP_HOSTPORT_IPV6.test(hostPort) &&
      ["[", "]", ":"].some(c => hostPort.includes(c))
    ) {
      return true;
    }
    if (Services.uriFixup.isDomainKnown(hostPort)) {
      return true;
    }
    return false;
  },

  /**
   * Returns whether the passed in token looks like an origin.
   * This is based on guessing and heuristics, that means if this function
   * returns `NONE`, it's surely not an origin, but otherwise the result
   * must still be verified through URIFixup.
   *
   * @param {string} token
   *        The string token to verify
   * @param {object} options
   *   Options object
   * @param {boolean} [options.ignoreKnownDomains]
   *   If true, the origin doesn't have to be in the known domain list
   * @param {boolean} [options.noIp]
   *   If true, the origin cannot be an IP address
   * @param {boolean} [options.noPort]
   *   If true, the origin cannot have a port number
   * @param {boolean} [options.allowPartialNumericalTLDs]
   *   If true, the origin can have numbers in its top level domain
   * @param {ConsoleInstance} [logger]
   *   Optional logger for debugging
   * @returns {number}
   *   A `UrlUtils.LOOKS_LIKE_ORIGIN` value.
   */
  looksLikeOrigin(
    token,
    {
      ignoreKnownDomains = false,
      noIp = false,
      noPort = false,
      allowPartialNumericalTLDs = false,
    } = {},
    logger
  ) {
    if (!token.length) {
      return this.LOOKS_LIKE_ORIGIN.NONE;
    }
    let atIndex = token.indexOf("@");
    if (atIndex != -1 && this.REGEXP_COMMON_EMAIL.test(token)) {
      // We prefer handling it as an email rather than an origin with userinfo.
      return this.LOOKS_LIKE_ORIGIN.NONE;
    }

    let userinfo = atIndex != -1 ? token.slice(0, atIndex) : "";
    let hostPort = atIndex != -1 ? token.slice(atIndex + 1) : token;
    let hasPort = this.REGEXP_HAS_PORT.test(hostPort);
    logger?.debug("userinfo", userinfo);
    logger?.debug("hostPort", hostPort);
    if (noPort && hasPort) {
      return this.LOOKS_LIKE_ORIGIN.NONE;
    }

    if (
      this.REGEXP_HOSTPORT_IPV4.test(hostPort) ||
      this.REGEXP_HOSTPORT_IPV6.test(hostPort)
    ) {
      return noIp ? this.LOOKS_LIKE_ORIGIN.NONE : this.LOOKS_LIKE_ORIGIN.IP;
    }

    // Check for invalid chars.
    if (
      this.REGEXP_LIKE_PROTOCOL.test(hostPort) ||
      this.REGEXP_USERINFO_INVALID_CHARS.test(userinfo) ||
      this.REGEXP_HOSTPORT_INVALID_CHARS.test(hostPort) ||
      (!allowPartialNumericalTLDs &&
        this.REGEXP_HOSTPORT_INVALID_TLD_NUM.test(hostPort)) ||
      (!this.REGEXP_SINGLE_WORD_HOST.test(hostPort) &&
        this.REGEXP_HOSTPORT_IP_LIKE.test(hostPort) &&
        this.REGEXP_HOSTPORT_INVALID_IP.test(hostPort))
    ) {
      return this.LOOKS_LIKE_ORIGIN.NONE;
    }

    // If it looks like a single word host, check the known domains.
    if (
      !ignoreKnownDomains &&
      !userinfo &&
      !hasPort &&
      this.REGEXP_SINGLE_WORD_HOST.test(hostPort)
    ) {
      return Services.uriFixup.isDomainKnown(hostPort)
        ? this.LOOKS_LIKE_ORIGIN.KNOWN_DOMAIN
        : this.LOOKS_LIKE_ORIGIN.NONE;
    }

    if (atIndex != -1 || hasPort) {
      return this.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT;
    }

    return this.LOOKS_LIKE_ORIGIN.OTHER;
  },

  /**
   * The result type for `looksLikeOrigin()`.
   */
  LOOKS_LIKE_ORIGIN: Object.freeze({
    /**
     * The value cannot be an origin.
     */
    NONE: 0,
    /**
     * The value may be an origin but it's not one of the other types.
     * Example: "mozilla.org"
     */
    OTHER: 1,
    /**
     * The value is an IP address (that may or may not be reachable).
     */
    IP: 2,
    /**
     * The value is a domain known to URI fixup.
     */
    KNOWN_DOMAIN: 3,
    /**
     * The value appears to be an origin with a userinfo or port.
     */
    USERINFO_OR_PORT: 4,
  }),
};
