/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_NoVarySearchUtils_h
#define mozilla_net_NoVarySearchUtils_h

#include "nsString.h"
#include "nsTArray.h"

class nsIURI;

namespace mozilla::net {

/**
 * Parsed representation of a No-Vary-Search response header, corresponding
 * to the "URL variation config" defined in the No-Vary-Search spec:
 * https://www.ietf.org/archive/id/draft-ietf-httpbis-no-vary-search-05.html
 *
 * Used by the HTTP cache to determine whether two URLs with differing query
 * strings can share a single cache entry, and by the Speculation Rules
 * prefetch matching algorithms to find equivalent prefetch records.
 */
struct NoVarySearchData {
  /**
   * Controls how query parameters are filtered before URL comparison.
   *
   *   ExactMatch — no No-Vary-Search header, or header failed to parse;
   *                URLs must match exactly (default).
   *   IgnoreAll  — params=?1; all query parameters are ignored.
   *   Blocklist  — params=("a" "b"); listed parameters are ignored.
   *   Allowlist  — params=?1, except=("a"); all parameters except the
   *                listed ones are ignored.
   */
  enum class ParamsRule : uint8_t {
    ExactMatch,
    IgnoreAll,
    Blocklist,
    Allowlist
  };
  ParamsRule paramsRule = ParamsRule::ExactMatch;
  // For Blocklist: names of params to ignore.
  // For Allowlist: names of params to keep.
  nsTArray<nsCString> paramNames;
  // When false, query parameter order does not affect equivalence
  // (key-order=?1 was present in the header).
  bool varyOnKeyOrder = true;
};

/**
 * Parses a No-Vary-Search header value into a NoVarySearchData struct.
 * Implements the "parse a URL variation config" algorithm from
 * https://www.ietf.org/archive/id/draft-ietf-httpbis-no-vary-search-05.html#section-5.1
 *
 * Falls back to a default-constructed NoVarySearchData (ExactMatch,
 * varyOnKeyOrder=true) on any parse error, per spec §5.1.
 *
 * @param aHeader  Raw header value, e.g. |params=("a" "b"), key-order|.
 * @return         Parsed NoVarySearchData.
 *
 * Examples:
 *   "params"                    → IgnoreAll
 *   "params=(\"a\")"            → Blocklist, paramNames=["a"]
 *   "params, except=(\"a\")"    → Allowlist, paramNames=["a"]
 *   "key-order"                 → ExactMatch, varyOnKeyOrder=false
 */
NoVarySearchData ParseNoVarySearchHeader(const nsACString& aHeader);

/**
 * Determines whether two URIs are equivalent under a URL variation config.
 * Implements the "equivalent modulo variation config" algorithm from
 * https://www.ietf.org/archive/id/draft-ietf-httpbis-no-vary-search-05.html#section-6
 *
 * Two URIs are equivalent if they have the same scheme, host, port, and path,
 * and their query parameters are equivalent after applying the filtering and
 * key-order normalisation defined by aData.
 *
 * @param aURIA  First URI.
 * @param aURIB  Second URI.
 * @param aData  Parsed URL variation config from ParseNoVarySearchHeader().
 * @return       true if the URIs are equivalent under aData.
 *
 * Example (Blocklist, paramNames=["utm_source"]):
 *   /page?q=hello&utm_source=email  vs  /page?q=hello  → true
 *   /page?q=hello                   vs  /page?q=world  → false
 */
bool URLsAreEquivalentModuloVariationConfig(nsIURI* aURIA, nsIURI* aURIB,
                                            const NoVarySearchData& aData);

/**
 * Extracts the base path (scheme://host:port/path) from a URI, stripping the
 * query string and fragment. Used as the secondary cache index key for
 * No-Vary-Search lookups.
 *
 * @param aURI       URI to extract the base path from. Must not be null.
 * @param aBasePath  [out] Receives the base path,
 *                   e.g. "https://example.com/search".
 * @return           NS_OK on success; an error code if URI methods fail.
 *
 * Example:
 *   Input:  https://example.com/search?q=hello&a=1
 *   Output: https://example.com/search
 */
nsresult ExtractNoVarySearchBasePath(nsIURI* aURI, nsACString& aBasePath);

}  // namespace mozilla::net
#endif
