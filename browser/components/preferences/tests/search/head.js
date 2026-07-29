/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

async function doSuggestVisibilityTest({
  initialSuggestEnabled,
  initialExpected,
  nimbusVariables,
  newExpected = initialExpected,
  pane = "search",
}) {
  info(
    "Running Suggest visibility test: " +
      JSON.stringify(
        {
          initialSuggestEnabled,
          initialExpected,
          nimbusVariables,
          newExpected,
        },
        null,
        2
      )
  );

  // Set the initial enabled status.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.quicksuggest.enabled", initialSuggestEnabled]],
  });

  // Open prefs and check the initial visibility.
  await openPreferencesViaOpenPreferencesAPI(pane, { leaveOpen: true });
  await assertSuggestVisibility(initialExpected);

  // Install a Nimbus experiment.
  await QuickSuggestTestUtils.withExperiment({
    valueOverrides: nimbusVariables,
    callback: async () => {
      // Check visibility again.
      await assertSuggestVisibility(newExpected);

      // To make sure visibility is properly updated on load, close the tab,
      // open the prefs again, and check visibility.
      gBrowser.removeCurrentTab();
      await openPreferencesViaOpenPreferencesAPI(pane, { leaveOpen: true });
      await assertSuggestVisibility(newExpected);
    },
  });

  gBrowser.removeCurrentTab();
  await SpecialPowers.popPrefEnv();
}

/**
 * Checks the visibility of the Suggest UI.
 *
 * @param {object} expectedByElementId
 *   An object that maps IDs of elements in the current tab to objects with the
 *   following properties:
 *
 *   {bool} isVisible
 *     Whether the element is expected to be visible.
 *   {string} l10nId
 *     The expected l10n ID of the element. Optional.
 */

async function assertSuggestVisibility(expectedByElementId) {
  let doc = gBrowser.selectedBrowser.contentDocument;
  for (let [elementId, { isVisible, l10nId }] of Object.entries(
    expectedByElementId
  )) {
    let element = doc.getElementById(elementId);
    await TestUtils.waitForCondition(
      () => BrowserTestUtils.isVisible(element) == isVisible,
      "Waiting for element visbility: " +
        JSON.stringify({ elementId, isVisible })
    );
    Assert.strictEqual(
      BrowserTestUtils.isVisible(element),
      isVisible,
      "Element should have expected visibility: " + elementId
    );
    if (l10nId) {
      Assert.equal(
        element.dataset.l10nId,
        l10nId,
        "The l10n ID should be correct for element: " + elementId
      );
    }
  }
}
