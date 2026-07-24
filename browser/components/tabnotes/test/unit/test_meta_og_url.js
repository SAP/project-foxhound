/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { findCandidates } = ChromeUtils.importESModule(
  "moz-src:///browser/components/tabnotes/CanonicalURL.sys.mjs"
);

/**
 * @param {string|null} [url]
 * @param {string} [documentUrl]
 * @returns {Document}
 */
function getDocument(url, documentUrl) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${url == null ? "" : `<meta property="og:url" content="${url}">`}
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

add_task(async function test_meta_og_url_missing() {
  const doc = getDocument(null, "https://www.example.com/");

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.opengraph,
    undefined,
    `meta[property="og:url"] should not be found`
  );
});

add_task(async function test_meta_og_url_present() {
  const doc = getDocument(
    "https://www.example.com/",
    "https://www.example.com/"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.opengraph,
    "https://www.example.com/",
    `meta[property="og:url"] should be found`
  );
});

add_task(async function test_meta_og_url_relative() {
  const doc = getDocument("/a", "https://www.example.com/a?param=value");

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.opengraph,
    "https://www.example.com/a",
    `meta[property="og:url"] should be found and rewritten to be an absolute URL`
  );
});

add_task(async function test_meta_og_url_empty() {
  const doc = getDocument("", "https://www.example.com/");

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.opengraph,
    "https://www.example.com/",
    `meta[property="og:url"] should be found and rewritten to be the root URL of the domain`
  );
});

add_task(async function tset_meta_og_url_malformed() {
  const doc = getDocument(
    "https://[2001:db8:85a3::",
    "https://www.example.com/"
  );

  const candidates = findCandidates(doc);

  Assert.equal(
    candidates.opengraph,
    undefined,
    `meta[property="og:url"] does not exist because URL is invalid`
  );
});
