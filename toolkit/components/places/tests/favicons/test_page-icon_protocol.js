/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ICON_DATAURL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==";
const TEST_URI = NetUtil.newURI("http://mozilla.org/");
const ICON_URI = NetUtil.newURI("http://mozilla.org/favicon.ico");

const { XPCShellContentUtils } = ChromeUtils.importESModule(
  "resource://testing-common/XPCShellContentUtils.sys.mjs"
);

const PAGE_ICON_TEST_URLS = [
  "page-icon:http://example.com/",
  "page-icon:http://a-site-never-before-seen.test",
  // For the following, the page-icon protocol is expected to successfully
  // return the default favicon.
  "page-icon:test",
  "page-icon:",
  "page-icon:chrome://something.html",
  "page-icon:foo://bar/baz",
];

const TELEMETRY_TEST_DATA = [
  {
    page: "http://example.com/#size=32",
    expectedSmallIconCount: 1,
    expectedFitIconCount: 0,
  },
  {
    page: "http://example.com/#size=1",
    expectedSmallIconCount: 0,
    expectedFitIconCount: 1,
  },
];

XPCShellContentUtils.init(this);

const HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
</head>
<body>
  Hello from example.com!
</body>
</html>`;

const server = XPCShellContentUtils.createHttpServer({
  hosts: ["example.com"],
});

server.registerPathHandler("/", (request, response) => {
  response.setHeader("Content-Type", "text/html");
  response.write(HTML);
});

function fetchIconForSpec(spec) {
  return new Promise((resolve, reject) => {
    NetUtil.asyncFetch(
      {
        uri: NetUtil.newURI(spec),
        loadUsingSystemPrincipal: true,
        contentPolicyType: Ci.nsIContentPolicy.TYPE_INTERNAL_IMAGE_FAVICON,
      },
      (input, status, request) => {
        if (!Components.isSuccessCode(status)) {
          reject(new Error("unable to load icon"));
          return;
        }

        try {
          let data = NetUtil.readInputStreamToString(input, input.available());
          let contentType = request.QueryInterface(Ci.nsIChannel).contentType;
          input.close();
          resolve({ data, contentType });
        } catch (ex) {
          reject(ex);
        }
      }
    );
  });
}

var gDefaultFavicon;
var gFavicon;

add_task(async function setup() {
  await PlacesTestUtils.addVisits(TEST_URI);
  await PlacesTestUtils.setFaviconForPage(
    TEST_URI,
    ICON_URI,
    ICON_DATAURL,
    (Date.now() + 8640000) * 1000
  );
  gDefaultFavicon = await fetchIconForSpec(
    PlacesUtils.favicons.defaultFavicon.spec
  );
  gFavicon = await fetchIconForSpec(ICON_DATAURL);

  // FOG needs a profile directory to put its data in.
  do_get_profile();

  Services.fog.initializeFOG();
});

add_task(async function known_url() {
  let { data, contentType } = await fetchIconForSpec(
    "page-icon:" + TEST_URI.spec
  );
  Assert.equal(contentType, gFavicon.contentType);
  Assert.deepEqual(data, gFavicon.data, "Got the favicon data");
});

add_task(async function unknown_url() {
  let { data, contentType } = await fetchIconForSpec(
    "page-icon:http://www.moz.org/"
  );
  Assert.equal(contentType, gDefaultFavicon.contentType);
  Assert.deepEqual(data, gDefaultFavicon.data, "Got the default favicon data");
});

add_task(async function invalid_url() {
  let { data, contentType } = await fetchIconForSpec("page-icon:test");
  Assert.equal(contentType, gDefaultFavicon.contentType);
  Assert.ok(data == gDefaultFavicon.data, "Got the default favicon data");
});

add_task(async function subpage_url_fallback() {
  let { data, contentType } = await fetchIconForSpec(
    "page-icon:http://mozilla.org/missing"
  );
  Assert.equal(contentType, gFavicon.contentType);
  Assert.deepEqual(data, gFavicon.data, "Got the root favicon data");
});

add_task(async function svg_icon() {
  let faviconURI = NetUtil.newURI("http://places.test/favicon.svg");
  await PlacesTestUtils.setFaviconForPage(
    TEST_URI,
    faviconURI,
    SMALLSVG_DATA_URI
  );
  let svgIcon = await fetchIconForSpec(SMALLSVG_DATA_URI.spec);
  info(svgIcon.contentType);
  let pageIcon = await fetchIconForSpec("page-icon:" + TEST_URI.spec);
  Assert.equal(svgIcon.contentType, pageIcon.contentType);
  Assert.deepEqual(svgIcon.data, pageIcon.data, "Got the root favicon data");
});

add_task(async function page_with_ref() {
  for (let url of [
    "http://places.test.ref/#myref",
    "http://places.test.ref/#!&b=16",
    "http://places.test.ref/#",
  ]) {
    await PlacesTestUtils.addVisits(url);
    await setFaviconForPage(url, ICON_URI, false);
    let { data, contentType } = await fetchIconForSpec("page-icon:" + url);
    Assert.equal(contentType, gFavicon.contentType);
    Assert.deepEqual(data, gFavicon.data, "Got the favicon data");
    await PlacesUtils.history.remove(url);
  }
});

add_task(async function test_icon_telemetry() {
  for (let {
    page,
    expectedSmallIconCount,
    expectedFitIconCount,
  } of TELEMETRY_TEST_DATA) {
    Services.fog.testResetFOG();

    let telemetryTestURI = NetUtil.newURI(page);

    await PlacesTestUtils.addVisits(telemetryTestURI);

    await PlacesTestUtils.setFaviconForPage(
      telemetryTestURI,
      NetUtil.newURI("http://example.com/favicon.png"),
      ICON_DATAURL // The icon has a size of 1x1.
    );

    await fetchIconForSpec("page-icon:" + telemetryTestURI.spec);

    Assert.equal(
      Glean.pageIcon.smallIconCount.testGetValue() ?? 0,
      expectedSmallIconCount
    );
    Assert.equal(
      Glean.pageIcon.fitIconCount.testGetValue() ?? 0,
      expectedFitIconCount
    );

    await PlacesUtils.history.clear();
  }
});

/**
 * Tests that page-icon does not work in a normal content process.
 */
add_task(async function page_content_process() {
  let contentPage = await XPCShellContentUtils.loadContentPage(
    "http://example.com/",
    {
      remote: true,
    }
  );
  Assert.notEqual(
    contentPage.browsingContext.currentRemoteType,
    "privilegedabout"
  );

  await contentPage.spawn([PAGE_ICON_TEST_URLS], async URLS => {
    // We expect each of these URLs to produce an error event when
    // we attempt to load them in this process type.
    /* global content */
    for (let url of URLS) {
      let img = content.document.createElement("img");
      img.src = url;
      let imgPromise = new Promise((resolve, reject) => {
        img.addEventListener("error", () => {
          Assert.ok(true, "Got expected load error.");
          resolve();
        });
        img.addEventListener("load", () => {
          Assert.ok(false, "Did not expect a successful load.");
          reject();
        });
      });
      content.document.body.appendChild(img);
      await imgPromise;
    }
  });

  await contentPage.close();
});

/**
 * Tests that page-icon does work for privileged about content process
 */
add_task(async function page_privileged_about_content_process() {
  // about:certificate loads in the privileged about content process.
  let contentPage = await XPCShellContentUtils.loadContentPage(
    "about:certificate",
    {
      remote: true,
    }
  );
  Assert.equal(
    contentPage.browsingContext.currentRemoteType,
    "privilegedabout"
  );

  await contentPage.spawn([PAGE_ICON_TEST_URLS], async URLS => {
    // We expect each of these URLs to load correctly in this process
    // type.
    for (let url of URLS) {
      let img = content.document.createElement("img");
      img.src = url;
      let imgPromise = new Promise((resolve, reject) => {
        img.addEventListener("error", () => {
          Assert.ok(false, "Did not expect an error. ");
          reject();
        });
        img.addEventListener("load", () => {
          Assert.ok(true, "Got expected load event.");
          resolve();
        });
      });
      content.document.body.appendChild(img);
      await imgPromise;
    }
  });

  await contentPage.close();
});

add_task(async function test_icon_telemetry_new_stream() {
  // about:certificate loads in the privileged about content process.
  let contentPage = await XPCShellContentUtils.loadContentPage(
    "about:certificate",
    {
      remote: true,
    }
  );
  Assert.equal(
    contentPage.browsingContext.currentRemoteType,
    "privilegedabout"
  );

  for (let {
    page,
    expectedSmallIconCount,
    expectedFitIconCount,
  } of TELEMETRY_TEST_DATA) {
    Services.fog.testResetFOG();

    const URI = NetUtil.newURI(page);

    await PlacesTestUtils.addVisits(URI);
    await PlacesTestUtils.setFaviconForPage(
      URI,
      NetUtil.newURI("http://example.com/favicon/ico"),
      ICON_DATAURL
    );

    const PAGE_ICON_TEST_URI = "page-icon:" + URI.spec;

    await contentPage.spawn([PAGE_ICON_TEST_URI], async url => {
      // We expect the URL to load correctly in this process type.
      let img = content.document.createElement("img");
      img.src = url;
      let imgPromise = new Promise((resolve, reject) => {
        img.addEventListener("error", () => {
          Assert.ok(false, "Did not expect an error. ");
          reject();
        });
        img.addEventListener("load", () => {
          Assert.ok(true, "Got expected load event.");
          resolve();
        });
      });
      content.document.body.appendChild(img);
      await imgPromise;
    });

    Assert.equal(
      Glean.pageIcon.smallIconCount.testGetValue() ?? 0,
      expectedSmallIconCount,
      "small icon count should match expected value"
    );
    Assert.equal(
      Glean.pageIcon.fitIconCount.testGetValue() ?? 0,
      expectedFitIconCount,
      "fit icon count should match expected value"
    );

    await PlacesUtils.history.clear();
  }

  await contentPage.close();
});

add_task(async function test_with_user_pass() {
  info("Test whether can get favicon content regardless of user pass");
  await PlacesUtils.history.clear();

  const PAGE_NORMAL = uri("http://mozilla.org/");
  const PAGE_USERPASS = uri("http://user:pass@mozilla.org/");
  const ICON_NORMAL = uri("http://mozilla.org/favicon.png");
  const ICON_USERPASS = uri("http://user:pass@mozilla.org/favicon.png");
  const PAGE_ICON_NORMAL = "page-icon:http://mozilla.org/";
  const PAGE_ICON_USERPASS = "page-icon:http://user:pass@mozilla.org/";

  const testData = [
    {
      pageURI: PAGE_USERPASS,
      iconURI: ICON_NORMAL,
    },
    {
      pageURI: PAGE_NORMAL,
      iconURI: ICON_USERPASS,
    },
    {
      pageURI: PAGE_USERPASS,
      iconURI: ICON_USERPASS,
    },
  ];

  for (const { pageURI, iconURI } of testData) {
    for (const loadingIconURISpec of [PAGE_ICON_NORMAL, PAGE_ICON_USERPASS]) {
      await PlacesTestUtils.addVisits(pageURI);
      await PlacesTestUtils.setFaviconForPage(pageURI, iconURI, ICON_DATAURL);

      let { data, contentType } = await fetchIconForSpec(loadingIconURISpec);
      Assert.equal(contentType, gFavicon.contentType);
      Assert.deepEqual(data, gFavicon.data, "Got the favicon data");
      await PlacesUtils.history.clear();
    }
  }
});

add_task(async function test_icon_with_port() {
  const ICON_DATAURL_PAGE_WITHOUT_PORT =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4v5ThPwAG7wKklwQ/bwAAAABJRU5ErkJggg==";
  let faviconForPageWithoutPort = await fetchIconForSpec(
    ICON_DATAURL_PAGE_WITHOUT_PORT
  );

  const TEST_URI_WITH_PORT = NetUtil.newURI("http://example.com:5000/");
  const FAVICON_URI_WITH_PORT = NetUtil.newURI(
    "http://example.com:5000/favicon.ico"
  );

  const TEST_URI_WITHOUT_PORT = NetUtil.newURI("http://example.com/");
  const FAVICON_URI_WITHOUT_PORT = NetUtil.newURI(
    "http://example.com/favicon.ico"
  );

  await PlacesTestUtils.addVisits(TEST_URI_WITHOUT_PORT);
  await PlacesTestUtils.setFaviconForPage(
    TEST_URI_WITHOUT_PORT,
    FAVICON_URI_WITHOUT_PORT,
    ICON_DATAURL_PAGE_WITHOUT_PORT
  );

  await PlacesTestUtils.addVisits(TEST_URI_WITH_PORT);
  await PlacesTestUtils.setFaviconForPage(
    TEST_URI_WITH_PORT,
    FAVICON_URI_WITH_PORT,
    ICON_DATAURL
  );

  let { data, contentType } = await fetchIconForSpec(
    "page-icon:" + TEST_URI_WITH_PORT.spec
  );

  Assert.equal(
    contentType,
    gFavicon.contentType,
    "Correct content type for favicon with port"
  );
  Assert.deepEqual(
    data,
    gFavicon.data,
    "Got the correct favicon data for URL with port"
  );

  let icon = await fetchIconForSpec("page-icon:" + TEST_URI_WITHOUT_PORT.spec);

  data = icon.data;
  contentType = icon.contentType;

  Assert.equal(
    contentType,
    faviconForPageWithoutPort.contentType,
    "Correct content type for favicon without port"
  );
  Assert.deepEqual(
    data,
    faviconForPageWithoutPort.data,
    "Got the correct favicon data for URL without port"
  );

  await PlacesUtils.history.clear();
});
