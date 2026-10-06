/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { findCandidates } = ChromeUtils.importESModule(
  "moz-src:///browser/components/tabnotes/CanonicalURL.sys.mjs"
);

/**
 * @param {string|null} [url]
 * @param {string} documentUrl
 * @returns {Document}
 */
function getDocument(url, documentUrl) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${url == null ? "" : `<link rel="canonical" href="${url}">`}
</head>
<body>
</body>
</html>
`;
  const document = Document.parseHTMLUnsafe(html);
  Object.defineProperty(document, "documentURI", {
    value: documentUrl,
  });
  return document;
}

add_task(async function test_link_rel_canonical_missing() {
  const doc = getDocument(null, "https://example.com");

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.link,
    undefined,
    `link[rel="canonical"] should not be found`
  );
});

add_task(async function test_link_rel_canonical_present() {
  const doc = getDocument(
    "https://www.example.com/",
    "https://www.example.com/"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.link,
    "https://www.example.com/",
    `link[rel="canonical"] should be found`
  );
});

add_task(async function test_link_rel_canonical_relative() {
  const doc = getDocument("/a", "https://example.com/a?param=value");

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.link,
    "https://example.com/a",
    `link[rel="canonical"] should be found and rewritten to be an absolute URL`
  );
});

add_task(async function test_link_rel_canonical_empty() {
  const doc = getDocument("", "https://example.com/");

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.link,
    "https://example.com/",
    `link[rel="canonical"] should be found and rewritten to be the root URL of the domain`
  );
});

add_task(async function tset_link_rel_canonical_malformed() {
  const doc = getDocument("https://[2001:db8:85a3::", "https://example.com/");

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.link,
    undefined,
    `link[rel="canonical"] does not exist because URL is invalid`
  );
});
