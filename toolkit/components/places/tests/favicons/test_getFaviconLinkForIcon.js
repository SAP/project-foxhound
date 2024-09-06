/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Test getFaviconLinkForIcon API.
 */

add_task(async function test_basic() {
  // Check these protocols are pass-through.
  for (let protocol of ["http://", "https://"]) {
    let url = PlacesUtils.favicons.getFaviconLinkForIcon(
      Services.io.newURI(protocol + "test/test.png")
    ).spec;
    Assert.equal(url, "cached-favicon:" + protocol + "test/test.png");
  }
});

add_task(async function test_directRequestProtocols() {
  // Check these protocols are pass-through.
  for (let protocol of [
    "about:",
    "cached-favicon:",
    "chrome://",
    "data:",
    "file:///",
    "moz-page-thumb://",
    "page-icon:",
    "resource://",
  ]) {
    let url = PlacesUtils.favicons.getFaviconLinkForIcon(
      Services.io.newURI(protocol + "test/test.png")
    ).spec;
    Assert.equal(url, protocol + "test/test.png");
  }
});
