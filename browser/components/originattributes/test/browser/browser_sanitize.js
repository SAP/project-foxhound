/**
 * Bug 1270338 - Add a mochitest to ensure Sanitizer clears data for all containers
 */

if (SpecialPowers.useRemoteSubframes) {
  requestLongerTimeout(4);
}

const CC = Components.Constructor;

const TEST_DOMAIN = "https://example.net/";

async function setCookies(aBrowser) {
  await SpecialPowers.spawn(aBrowser, [], function () {
    content.document.cookie = "key=value";
  });
}
/**
 * Force-populate the HTTP cache with a synthetic 200 OK for TEST_DOMAIN
 * for each loadContextInfo bucket that checkCacheExists() inspects.
 */
async function warmHttpCacheForAllContexts() {
  let loadContextInfos = [
    Services.loadContextInfo.default,
    Services.loadContextInfo.custom(false, { userContextId: 1 }),
    Services.loadContextInfo.custom(false, { userContextId: 2 }),
    Services.loadContextInfo.custom(false, { firstPartyDomain: "example.com" }),
    Services.loadContextInfo.custom(false, { firstPartyDomain: "example.org" }),
  ];

  const uri = Services.io.newURI(TEST_DOMAIN);

  // Writes a tiny body with plausible response headers so the entry is kept.
  function putEntry(lci) {
    return new Promise(resolve => {
      let storage = Services.cache2.diskCacheStorage(lci);
      storage.asyncOpenURI(
        uri,
        /* idExtension */ "",
        Ci.nsICacheStorage.OPEN_TRUNCATE,
        {
          onCacheEntryAvailable(entry, isNew, appCache, status) {
            try {
              if (Components.isSuccessCode(status)) {
                // Minimal HTTP metadata
                entry.setMetaDataElement("request-method", "GET");
                entry.setMetaDataElement(
                  "response-head",
                  "HTTP/1.1 200 OK\r\n" +
                    "Date: Mon, 01 Jan 2000 00:00:00 GMT\r\n" +
                    "Content-Type: text/plain\r\n" +
                    "Cache-Control: max-age=600\r\n" +
                    "Content-Length: 2\r\n\r\n"
                );
                // Tiny body
                let os = entry.openOutputStream(0);
                os.write("OK", 2);
                os.close();
              }
            } catch (e) {
              info("Failed to write cache entry: " + e);
            } finally {
              try {
                entry.close();
              } catch (_) {}
              resolve();
            }
          },
        }
      );
    });
  }

  for (let lci of loadContextInfos) {
    await putEntry(lci);
  }
}

function cacheDataForContext(loadContextInfo) {
  return new Promise(resolve => {
    let cachedURIs = [];
    let cacheVisitor = {
      onCacheStorageInfo() {},
      onCacheEntryInfo(uri) {
        cachedURIs.push(uri.asciiSpec);
      },
      onCacheEntryVisitCompleted() {
        resolve(cachedURIs);
      },
      QueryInterface: ChromeUtils.generateQI(["nsICacheStorageVisitor"]),
    };
    // Visiting the disk cache also visits memory storage so we do not
    // need to use Services.cache2.memoryCacheStorage() here.
    let storage = Services.cache2.diskCacheStorage(loadContextInfo);
    storage.asyncVisitStorage(cacheVisitor, true);
  });
}

async function checkCookiesSanitized(aBrowser) {
  await SpecialPowers.spawn(aBrowser, [], function () {
    Assert.equal(
      content.document.cookie,
      "",
      "Cookies of all origin attributes should be cleared."
    );
  });
}

function checkCacheExists(aShouldExist) {
  return async function () {
    let loadContextInfos = [
      Services.loadContextInfo.default,
      Services.loadContextInfo.custom(false, { userContextId: 1 }),
      Services.loadContextInfo.custom(false, { userContextId: 2 }),
      Services.loadContextInfo.custom(false, {
        firstPartyDomain: "example.com",
      }),
      Services.loadContextInfo.custom(false, {
        firstPartyDomain: "example.org",
      }),
    ];
    let i = 0;
    for (let loadContextInfo of loadContextInfos) {
      let cacheURIs = await cacheDataForContext(loadContextInfo);
      is(
        cacheURIs.includes(TEST_DOMAIN),
        aShouldExist,
        TEST_DOMAIN +
          " should " +
          (aShouldExist ? "not " : "") +
          "be cached for all origin attributes." +
          i++
      );
    }
  };
}

add_setup(async function () {
  Services.cache2.clear();
});

// This will set the cookies and the cache.
IsolationTestTools.runTests(TEST_DOMAIN, setCookies, () => true);

add_task(async function warmCache() {
  await warmHttpCacheForAllContexts();
});

add_task(checkCacheExists(true));

add_task(async function sanitize() {
  await Sanitizer.sanitize(["cookies", "cache"]);
});

add_task(checkCacheExists(false));
IsolationTestTools.runTests(TEST_DOMAIN, checkCookiesSanitized, () => true);
