/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests basic headless content extraction. The page is loaded in the background and
 * the content is extracted.
 */
add_task(async function test_headless_extraction() {
  const { PageExtractorParent } = ChromeUtils.importESModule(
    "resource://gre/actors/PageExtractorParent.sys.mjs"
  );
  const { html } = MLTestUtils.serveHTML();
  const { url, cleanup } = html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Headless Document</title>
      </head>
      <body>
        <div>This is a headless document</div>
      </body>
    </html>
  `;

  const result = await PageExtractorParent.getHeadlessExtractor({
    urlString: url,
    callback: async pageExtractor => pageExtractor.getText(),
  });

  is(
    result.text,
    "This is a headless document",
    "The page's content is extracted"
  );

  await cleanup();
});

/**
 * Test what happens on a 404 page.
 */
add_task(async function test_headless_extraction_404() {
  const { PageExtractorParent } = ChromeUtils.importESModule(
    "resource://gre/actors/PageExtractorParent.sys.mjs"
  );
  const { html } = MLTestUtils.serveHTML({ code: 404 });
  const { url, cleanup } = html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>404 not found</title>
      </head>
      <body>
        <div>404 page not found.</div>
      </body>
    </html>
  `;

  const result = await PageExtractorParent.getHeadlessExtractor({
    urlString: url,
    callback: async pageExtractor => pageExtractor.getText(),
  });

  is(
    result.text,
    "404 page not found.",
    "The page's content is extracted even if it's a 404"
  );

  await cleanup();
});

/**
 * Test page extraction on a restricted page.
 */
add_task(async function test_headless_extraction_about_blank() {
  const { PageExtractorParent } = ChromeUtils.importESModule(
    "resource://gre/actors/PageExtractorParent.sys.mjs"
  );

  await Assert.rejects(
    PageExtractorParent.getHeadlessExtractor({
      urlString: "about:blank",
      callback: () => {},
    }),
    /Only http: and https: URLs are supported/,
    "PageExtractor fails on about: pages."
  );
});

/**
 * Test page extraction on a file URL.
 */
add_task(async function test_headless_extraction_about_blank() {
  const { PageExtractorParent } = ChromeUtils.importESModule(
    "resource://gre/actors/PageExtractorParent.sys.mjs"
  );

  await Assert.rejects(
    PageExtractorParent.getHeadlessExtractor({
      urlString: "file:///NeverGonnaGiveYouUp.mp4",
      callback: () => {},
    }),
    /Only http: and https: URLs are supported/,
    "PageExtractor fails on file: URLs."
  );
});
