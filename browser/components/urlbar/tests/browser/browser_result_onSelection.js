/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.scotchBonnet.enableOverride", false]],
  });

  let results = [
    new UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.URL,
      source: UrlbarUtils.RESULT_SOURCE.HISTORY,
      heuristic: true,
      payload: {
        url: "http://mozilla.org/1",
        helpUrl: "http://example.com/",
        isBlockable: true,
        blockL10n: { id: "urlbar-result-menu-remove-from-history" },
      },
    }),
    new UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.URL,
      source: UrlbarUtils.RESULT_SOURCE.HISTORY,
      payload: {
        url: "http://mozilla.org/2",
        helpUrl: "http://example.com/",
        isBlockable: true,
        blockL10n: { id: "urlbar-result-menu-remove-from-history" },
      },
    }),
    new UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.TIP,
      source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
      payload: {
        helpUrl: "http://example.com/",
        type: "test",
        titleL10n: { id: "urlbar-search-tips-confirm" },
        buttons: [
          {
            url: "http://example.com/",
            l10n: { id: "urlbar-search-tips-confirm" },
          },
        ],
      },
    }),
  ];

  let selectionCount = 0;
  let provider = new UrlbarTestUtils.TestProvider({
    results,
    priority: 1,
    onSelection: () => {
      selectionCount++;
    },
  });
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  providersManager.registerProvider(provider);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "test",
  });

  EventUtils.synthesizeKey("KEY_Tab", {
    repeat: 5,
  });
  EventUtils.synthesizeKey("KEY_ArrowDown");
  ok(
    UrlbarTestUtils.getOneOffSearchButtons(window).selectedButton,
    "a one off button is selected"
  );

  Assert.equal(selectionCount, 6, "Number of elements selected in the view.");
  providersManager.unregisterProvider(provider);
});
