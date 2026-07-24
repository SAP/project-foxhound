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
  const { url, serverClosed } = serveOnce(`
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
  `);

  const result = await PageExtractorParent.getHeadlessExtractor(
    url,
    async pageExtractor => pageExtractor.getText()
  );

  is(
    result.text,
    "This is a headless document",
    "The page's content is extracted"
  );

  await serverClosed;
});

/**
 * Test what happens on a 404 page.
 */
add_task(async function test_headless_extraction_404() {
  const { PageExtractorParent } = ChromeUtils.importESModule(
    "resource://gre/actors/PageExtractorParent.sys.mjs"
  );
  const { url, serverClosed } = serveOnce(
    `
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
    `,
    404
  );

  const result = await PageExtractorParent.getHeadlessExtractor(
    url,
    async pageExtractor => pageExtractor.getText()
  );

  is(
    result.text,
    "404 page not found.",
    "The page's content is extracted even if it's a 404"
  );

  await serverClosed;
});

/**
 * Test page extraction on a restricted page.
 */
add_task(async function test_headless_extraction_about_blank() {
  const { PageExtractorParent } = ChromeUtils.importESModule(
    "resource://gre/actors/PageExtractorParent.sys.mjs"
  );

  await Assert.rejects(
    PageExtractorParent.getHeadlessExtractor("about:blank", () => {}),
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
    PageExtractorParent.getHeadlessExtractor(
      "file:///NeverGonnaGiveYouUp.mp4",
      () => {}
    ),
    /Only http: and https: URLs are supported/,
    "PageExtractor fails on file: URLs."
  );
});
