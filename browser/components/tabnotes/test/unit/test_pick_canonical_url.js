/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { pickCanonicalUrl, getFallbackCanonicalUrl } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/tabnotes/CanonicalURL.sys.mjs"
  );

const LINK_REL_CANONICAL = "https://www.example.com/link_rel_canonical";
const OPENGRAPH = "https://www.example.com/opengraph";
const JSON_LD = "https://www.example.com/json-ld";
const FALLBACK = "https://www.example.com/fallback";

add_task(async function test_canonical_link_only() {
  Assert.equal(
    pickCanonicalUrl({ link: LINK_REL_CANONICAL, fallback: FALLBACK }),
    LINK_REL_CANONICAL,
    `should always pick link[rel="canonical"] if it was found`
  );
});

add_task(async function test_canonical_link_and_opengraph() {
  Assert.equal(
    pickCanonicalUrl({
      link: LINK_REL_CANONICAL,
      opengraph: OPENGRAPH,
      fallback: FALLBACK,
    }),
    LINK_REL_CANONICAL,
    `should always pick link[rel="canonical"] if it was found`
  );
});

add_task(async function test_canonical_link_and_json_ld() {
  Assert.equal(
    pickCanonicalUrl({
      link: LINK_REL_CANONICAL,
      jsonLd: JSON_LD,
      fallback: FALLBACK,
    }),
    LINK_REL_CANONICAL,
    `should always pick link[rel="canonical"] if it was found`
  );
});

add_task(async function test_canonical_link_and_opengraph_and_json_ld() {
  Assert.equal(
    pickCanonicalUrl({
      link: LINK_REL_CANONICAL,
      opengraph: OPENGRAPH,
      jsonLd: JSON_LD,
      fallback: FALLBACK,
    }),
    LINK_REL_CANONICAL,
    `should always pick link[rel="canonical"] if it was found`
  );
});

add_task(async function test_opengraph_only() {
  Assert.equal(
    pickCanonicalUrl({ opengraph: OPENGRAPH, fallback: FALLBACK }),
    OPENGRAPH,
    `should pick meta[property="og:url"] if canonical link not found`
  );
});

add_task(async function test_opengraph_and_json_ld() {
  Assert.equal(
    pickCanonicalUrl({
      opengraph: OPENGRAPH,
      jsonLd: JSON_LD,
      fallback: FALLBACK,
    }),
    OPENGRAPH,
    `should pick meta[property="og:url"] if canonical link not found`
  );
});

add_task(async function test_json_ld_only() {
  Assert.equal(
    pickCanonicalUrl({
      jsonLd: JSON_LD,
      fallback: FALLBACK,
    }),
    JSON_LD,
    "should pick JSON-LD data if neither canonical link nor og:url were found"
  );
});

add_task(async function test_fallback() {
  Assert.equal(
    pickCanonicalUrl({
      fallback: FALLBACK,
    }),
    FALLBACK,
    "should only use the fallback if nothing else was found"
  );
});

add_task(async function test_fallback_contains_no_fragment() {
  const fallbackUrlWithFragment = "https://example.com/a/b/c/#somefragment";
  const document = { documentURI: fallbackUrlWithFragment };
  const result = getFallbackCanonicalUrl(document);
  Assert.equal(
    result,
    "https://example.com/a/b/c/",
    "Should ignore fragment on fallback URLs"
  );
});

add_task(async function test_fallback_ignores_trailing_question() {
  // Fixes bug2009126; in some cases form submissions can add a trailing
  // question mark with no queryparams to a URL.

  const fallbackUrlWithEmptyQuery = "https://example.com/a/b/c/?";
  const document = { documentURI: fallbackUrlWithEmptyQuery };
  const result = getFallbackCanonicalUrl(document);
  Assert.equal(
    result,
    "https://example.com/a/b/c/",
    "Should ignore trailing question mark on fallback URLs"
  );
});
