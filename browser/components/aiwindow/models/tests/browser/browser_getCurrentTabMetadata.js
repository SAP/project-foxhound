/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { getCurrentTabMetadata } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/ChatUtils.sys.mjs"
);

const { PageDataService } = ChromeUtils.importESModule(
  "moz-src:///browser/components/pagedata/PageDataService.sys.mjs"
);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.pagedata.enabled", true]],
  });

  PageDataService.init();

  registerCleanupFunction(() => {
    PageDataService.uninit();
  });
});

add_task(async function test_getCurrentTabMetadata_basic() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Test Page Title</title>
      <meta name="description" content="This is a test page description">
    </head>
    <body>
      <h1>Test Page Content</h1>
    </body>
    </html>
  `;

  const { url, server } = serveHTML(html);
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url, true);

  try {
    const metadata = await getCurrentTabMetadata();

    is(metadata.url, url, "Should return the correct URL");
    is(metadata.title, "Test Page Title", "Should return the correct title");
    Assert.strictEqual(
      typeof metadata.description,
      "string",
      "Should return a string description"
    );
  } finally {
    BrowserTestUtils.removeTab(tab);
    await new Promise(resolve => server.stop(resolve));
  }
});

add_task(async function test_getCurrentTabMetadata_no_description() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Page Without Description</title>
    </head>
    <body>
      <p>This page has no description metadata.</p>
    </body>
    </html>
  `;

  const { url, server } = serveHTML(html);
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url, true);

  try {
    const metadata = await getCurrentTabMetadata();

    is(metadata.url, url, "Should return the correct URL");
    is(
      metadata.title,
      "Page Without Description",
      "Should return the correct title"
    );
    is(
      metadata.description,
      "",
      "Should return empty string when no description available"
    );
  } finally {
    BrowserTestUtils.removeTab(tab);
    await new Promise(resolve => server.stop(resolve));
  }
});

add_task(async function test_getCurrentTabMetadata_about_blank() {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank",
    true
  );

  try {
    const metadata = await getCurrentTabMetadata();

    is(metadata.url, "about:blank", "Should handle about:blank URL");
    Assert.notStrictEqual(
      metadata.title,
      undefined,
      "Should have a title (may be empty)"
    );
    is(
      metadata.description,
      "",
      "Should have empty description for about:blank"
    );
  } finally {
    BrowserTestUtils.removeTab(tab);
  }
});

add_task(async function test_getCurrentTabMetadata_with_cached_data() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cached Test Page</title>
      <meta name="description" content="Cached page description">
    </head>
    <body>
      <p>Testing cached metadata.</p>
    </body>
    </html>
  `;

  const { url, server } = serveHTML(html);
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url, true);

  try {
    // Lock the entry first to create a cache entry
    const browser = tab.linkedBrowser;
    PageDataService.lockEntry(browser, url);

    // Now add the cached data
    PageDataService.pageDataDiscovered({
      url,
      date: Date.now(),
    });

    const metadata = await getCurrentTabMetadata();

    is(metadata.url, url, "Should return the correct URL");
    is(metadata.title, "Cached Test Page", "Should return the correct title");

    // Unlock the entry in cleanup
    PageDataService.unlockEntry(browser, url);
  } finally {
    BrowserTestUtils.removeTab(tab);
    await new Promise(resolve => server.stop(resolve));
  }
});
