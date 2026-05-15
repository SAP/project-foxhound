/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { findCandidates } = ChromeUtils.importESModule(
  "moz-src:///browser/components/tabnotes/CanonicalURL.sys.mjs"
);

/**
 * @param {string[]} scripts
 * @param {string} documentUrl
 * @returns {Document}
 */
function getDocument(scripts, documentUrl) {
  const scriptTags = scripts
    .map(content => `<script type="application/ld+json">${content}</script>`)
    .join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
  ${scriptTags}
</body>
</html>
`;
  const document = Document.parseHTMLUnsafe(html);
  Object.defineProperty(document, "documentURI", {
    value: documentUrl,
  });
  return document;
}

add_task(async function test_json_ld_missing() {
  const doc = getDocument([], "https://example.com");

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.jsonLd,
    undefined,
    `JSON-LD data should not be found`
  );
});

add_task(async function test_json_ld_basic() {
  const doc = getDocument(
    [
      JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Thing",
        url: "https://www.example.com/",
      }),
    ],
    "https://www.example.com/"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.jsonLd,
    "https://www.example.com/",
    `JSON-LD data should be found`
  );
});

add_task(async function test_json_ld_selects_first() {
  const doc = getDocument(
    [
      JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Thing",
        url: "https://www.example.com/1",
      }),
      JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "CreativeWork",
        url: "https://www.example.com/2",
      }),
      JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "WebPage",
        url: "https://www.example.com/3",
      }),
    ],
    "https://www.example.com/1"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.jsonLd,
    "https://www.example.com/1",
    `the first JSON-LD data should be preferred`
  );
});

add_task(async function test_json_ld_robust_to_url_array() {
  const doc = getDocument(
    [
      JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "SiteMap",
        url: [
          "https://www.example.com/1",
          "https://www.example.com/2",
          "https://www.example.com/3",
        ],
      }),
    ],
    "https://www.example.com/1"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.jsonLd,
    undefined,
    `when url is an array, the JSON-LD data should not be used`
  );
});

add_task(async function test_json_ld_relative() {
  const doc = getDocument(
    [
      JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Thing",
        url: "/a",
      }),
    ],
    "https://www.example.com/a?param=value"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.jsonLd,
    "https://www.example.com/a",
    "JSON-LD data should be found and rewritten to an absolute URL"
  );
});

add_task(async function test_json_ld_empty() {
  const doc = getDocument(
    [
      JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Thing",
        url: "",
      }),
    ],
    "https://www.example.com/"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.jsonLd,
    "https://www.example.com/",
    "JSON-LD data should be found and rewritten to the root URL of the domain"
  );
});

add_task(async function test_json_ld_malformed() {
  const doc = getDocument(
    [
      JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Thing",
        url: "https://[2001:db8:85a3::",
      }),
    ],
    "https://www.example.com/"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.jsonLd,
    undefined,
    "JSON-LD data should not be used because URL is invalid"
  );
});
