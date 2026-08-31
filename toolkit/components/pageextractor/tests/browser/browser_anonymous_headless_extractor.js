/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PageExtractorParent } = ChromeUtils.importESModule(
  "resource://gre/actors/PageExtractorParent.sys.mjs"
);
const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const SIMPLE_PAGE = `
  <!DOCTYPE html>
  <html><head><meta charset="utf-8"><title>t</title></head>
  <body><div>stripped page body</div></body></html>
`;

/**
 * Spin up a one-shot HttpServer that records the headers of every request it
 * sees. Returns the served URL, the captured-request log, helpers to install
 * per-test side effects (cookies, observers), and a `cleanup` function the
 * caller must invoke when done.
 *
 * @param {string} [body]
 */
function setupHeadlessExtractionTest(body) {
  const server = new HttpServer();
  const requests = [];
  const cleanupTasks = [];
  const channelInfo = { loadFlags: null, referrerPolicy: null };

  server.registerPathHandler("/page.html", (request, response) => {
    const captured = {};
    for (const name of ["Cookie", "Authorization"]) {
      captured[name] = request.hasHeader(name) ? request.getHeader(name) : null;
    }
    requests.push(captured);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setStatusLine(request.httpVersion, 200);
    response.write(body);
  });

  server.start(-1);
  const { primaryHost, primaryPort } = server.identity;
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  const url = `http://${primaryHost}:${primaryPort}/page.html`;
  const uri = Services.io.newURI(url);

  const channelObserver = {
    observe(subject, topic) {
      if (topic !== "http-on-modify-request") {
        return;
      }
      const channel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (channel.URI.spec !== url) {
        return;
      }
      channelInfo.loadFlags = channel.loadFlags;
      channelInfo.referrerPolicy = channel.referrerInfo?.referrerPolicy ?? null;
    },
  };
  Services.obs.addObserver(channelObserver, "http-on-modify-request");
  cleanupTasks.push(() =>
    Services.obs.removeObserver(channelObserver, "http-on-modify-request")
  );

  function addCookie(name, value) {
    const expiry = Date.now() + 60 * 60 * 1000;
    Services.cookies.add(
      uri.host,
      "/",
      name,
      value,
      false /* secure */,
      false /* httpOnly */,
      true /* session */,
      expiry,
      {},
      Ci.nsICookie.SAMESITE_UNSET,
      Ci.nsICookie.SCHEME_HTTP
    );
    cleanupTasks.push(() => Services.cookies.remove(uri.host, name, "/", {}));
  }

  async function cleanup() {
    while (cleanupTasks.length) {
      cleanupTasks.pop()();
    }
    await new Promise(resolve => server.stop(resolve));
  }

  return { url, requests, channelInfo, addCookie, cleanup };
}

function assertAnonymousFetch(requests, channelInfo) {
  is(requests.length, 1, "server should see exactly one request");
  const req = requests[0];
  is(req.Cookie, null, `anonymous fetch should not send Cookie header.`);
  is(
    req.Authorization,
    null,
    `anonymous fetch should not send Authorization header.`
  );

  Assert.notStrictEqual(
    channelInfo.loadFlags,
    null,
    "channel for anonymous fetch should be observed"
  );
  ok(
    channelInfo.loadFlags & Ci.nsIRequest.LOAD_ANONYMOUS,
    `anonymous fetch should set LOAD_ANONYMOUS.`
  );
  ok(
    channelInfo.loadFlags & Ci.nsIRequest.INHIBIT_CACHING,
    `anonymous fetch should set INHIBIT_CACHING.`
  );
  ok(
    channelInfo.loadFlags & Ci.nsIRequest.INHIBIT_PERSISTENT_CACHING,
    `anonymous fetch should set INHIBIT_PERSISTENT_CACHING.`
  );
  is(
    channelInfo.referrerPolicy,
    Ci.nsIReferrerInfo.NO_REFERRER,
    `anonymous fetch should use NO_REFERRER referrer policy.`
  );
}

// Baseline: without `anonymousFetch`, cookies normally flow — the contrast
// the next test deviates from.
add_task(async function test_default_fetch_sends_cookies_baseline() {
  const { url, requests, addCookie, cleanup } =
    setupHeadlessExtractionTest(SIMPLE_PAGE);
  try {
    addCookie("test", "baseline");

    await PageExtractorParent.getHeadlessExtractor({
      urlString: url,
      callback: async pageExtractor => pageExtractor.getText(),
    });

    is(requests.length, 1, "server should see exactly one request");
    ok(
      requests[0].Cookie?.includes("test=baseline"),
      `default fetch should send Cookie header.`
    );
  } finally {
    await cleanup();
  }
});

add_task(async function test_anonymous_fetch_channel_config() {
  const { url, requests, channelInfo, cleanup } =
    setupHeadlessExtractionTest(SIMPLE_PAGE);
  try {
    await PageExtractorParent.getHeadlessExtractor({
      urlString: url,
      callback: async pageExtractor => pageExtractor.getText(),
      anonymousFetch: true,
    });

    assertAnonymousFetch(requests, channelInfo);
  } finally {
    await cleanup();
  }
});

add_task(async function test_anonymous_fetch_rejects_non_loopback_http() {
  await Assert.rejects(
    PageExtractorParent.getHeadlessExtractor({
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      urlString: "http://example.com/page.html",
      callback: async pageExtractor => pageExtractor.getText(),
      anonymousFetch: true,
    }),
    /Only https: URLs are supported for anonymous fetches/,
    "anonymous fetch with non-loopback http: URL should be rejected"
  );
});

// Browser Context fields are set before navigation, but a remoteness change can re-fire
// SetEmbedderElement and reset them — confirm they survive to the loaded Browsing Context.
add_task(async function test_anonymous_fetch_browser_context_fields_persist() {
  const { url, requests, channelInfo, cleanup } =
    setupHeadlessExtractionTest(SIMPLE_PAGE);
  try {
    // From nsSandboxFlags.h.
    const SANDBOXED_AUXILIARY_NAVIGATION = 0x2;
    const SANDBOXED_TOPLEVEL_NAVIGATION = 0x4;
    const SANDBOXED_FORMS = 0x20;
    const SANDBOXED_POINTER_LOCK = 0x40;
    const SANDBOXED_AUTOMATIC_FEATURES = 0x100;
    const SANDBOXED_MODALS = 0x800;
    const SANDBOXED_ORIENTATION_LOCK = 0x2000;
    const SANDBOXED_PRESENTATION = 0x4000;
    const SANDBOXED_STORAGE_ACCESS = 0x8000;
    const SANDBOXED_DOWNLOADS = 0x10000;

    let browsingContextInfo = null;
    await PageExtractorParent.getHeadlessExtractor({
      urlString: url,
      callback: async pageExtractor => {
        const browsingContext = pageExtractor.browsingContext;
        const browserEl = browsingContext.top.embedderElement;
        browsingContextInfo = {
          useTrackingProtection: browsingContext.useTrackingProtection,
          useGlobalHistory: browsingContext.useGlobalHistory,
          sandboxFlags: browsingContext.sandboxFlags,
          disableGlobalHistoryAttr:
            browserEl?.getAttribute("disableglobalhistory") ?? null,
          audioMuted: browserEl?.audioMuted ?? null,
        };
        return pageExtractor.getText();
      },
      anonymousFetch: true,
    });

    assertAnonymousFetch(requests, channelInfo);

    ok(
      browsingContextInfo,
      "should capture Browser Context fields during the actor callback"
    );
    ok(
      browsingContextInfo.useTrackingProtection,
      `useTrackingProtection should still be set on loaded browsingContext, got: ${browsingContextInfo.useTrackingProtection}`
    );
    is(
      browsingContextInfo.useGlobalHistory,
      false,
      `useGlobalHistory should be false on loaded browsingContext, got: ${browsingContextInfo.useGlobalHistory}`
    );
    is(
      browsingContextInfo.disableGlobalHistoryAttr,
      "true",
      `disableglobalhistory attribute should still be set on the <browser> element, got: ${browsingContextInfo.disableGlobalHistoryAttr}`
    );
    is(
      browsingContextInfo.audioMuted,
      true,
      `<browser> element should be muted for anonymous fetch, got: ${browsingContextInfo.audioMuted}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_AUXILIARY_NAVIGATION,
      `SANDBOXED_AUXILIARY_NAVIGATION should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_TOPLEVEL_NAVIGATION,
      `SANDBOXED_TOPLEVEL_NAVIGATION should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_FORMS,
      `SANDBOXED_FORMS should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_POINTER_LOCK,
      `SANDBOXED_POINTER_LOCK should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_AUTOMATIC_FEATURES,
      `SANDBOXED_AUTOMATIC_FEATURES should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_MODALS,
      `SANDBOXED_MODALS should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_ORIENTATION_LOCK,
      `SANDBOXED_ORIENTATION_LOCK should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_PRESENTATION,
      `SANDBOXED_PRESENTATION should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_STORAGE_ACCESS,
      `SANDBOXED_STORAGE_ACCESS should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
    ok(
      browsingContextInfo.sandboxFlags & SANDBOXED_DOWNLOADS,
      `SANDBOXED_DOWNLOADS should be set, got sandboxFlags=${browsingContextInfo.sandboxFlags}`
    );
  } finally {
    await cleanup();
  }
});

add_task(async function test_anonymous_fetch_no_persisted_side_effects() {
  const { url, requests, channelInfo, cleanup } =
    setupHeadlessExtractionTest(SIMPLE_PAGE);
  try {
    await PageExtractorParent.getHeadlessExtractor({
      urlString: url,
      callback: async pageExtractor => pageExtractor.getText(),
      anonymousFetch: true,
    });

    assertAnonymousFetch(requests, channelInfo);

    const after = await PlacesUtils.history.fetch(url);
    is(
      after,
      null,
      `should be no Places entry after anonymous headless fetch.`
    );

    const uri = Services.io.newURI(url);
    const partitions = [
      ["default", Services.loadContextInfo.default],
      ["anonymous", Services.loadContextInfo.anonymous],
    ];
    for (const [name, loadContextInfo] of partitions) {
      const storage = Services.cache2.diskCacheStorage(loadContextInfo);
      const hasCacheEntry = await new Promise(resolve => {
        storage.asyncOpenURI(uri, "", Ci.nsICacheStorage.OPEN_READONLY, {
          onCacheEntryAvailable(entry) {
            resolve(entry !== null);
          },
        });
      });
      is(
        hasCacheEntry,
        false,
        `should be no cache entry in ${name} partition after fetch.`
      );
    }
  } finally {
    await cleanup();
  }
});
