/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ProvidersManager:
    "moz-src:///browser/components/urlbar/UrlbarProvidersManager.sys.mjs",
});

add_task(async function test_providers() {
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  Assert.throws(
    () => providersManager.registerProvider(),
    /invalid provider/,
    "Should throw with no arguments"
  );
  Assert.throws(
    () => providersManager.registerProvider({}),
    /invalid provider/,
    "Should throw with empty object"
  );
  Assert.throws(
    () =>
      providersManager.registerProvider({
        name: "",
      }),
    /invalid provider/,
    "Should throw with empty name"
  );
  Assert.throws(
    () =>
      providersManager.registerProvider({
        name: "test",
        startQuery: "no",
      }),
    /invalid provider/,
    "Should throw with invalid startQuery"
  );
  Assert.throws(
    () =>
      providersManager.registerProvider({
        name: "test",
        startQuery: () => {},
        cancelQuery: "no",
      }),
    /invalid provider/,
    "Should throw with invalid cancelQuery"
  );

  let match = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.TAB_SWITCH,
    source: UrlbarUtils.RESULT_SOURCE.TABS,
    payload: { url: "http://mozilla.org/foo/" },
  });

  let provider = registerBasicTestProvider([match]);
  let context = createContext(undefined, { providers: [provider.name] });
  let controller = UrlbarTestUtils.newMockController();
  let resultsPromise = promiseControllerNotification(
    controller,
    "onQueryResults"
  );

  await providersManager.startQuery(context, controller);
  // Sanity check that this doesn't throw. It should be a no-op since we await
  // for startQuery.
  providersManager.cancelQuery(context);

  let params = await resultsPromise;
  Assert.deepEqual(params[0].results, [match]);
});

add_task(async function test_criticalSection() {
  // Just a sanity check, this shouldn't throw.
  await ProvidersManager.runInCriticalSection(async () => {
    let db = await PlacesUtils.promiseLargeCacheDBConnection();
    await db.execute(`PRAGMA page_cache`);
  });
});
