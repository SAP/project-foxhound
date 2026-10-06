/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test setting animationsPlayBackRateMultiplier browsing context flag.
const TEST_DOCUMENT = "target_configuration_test_doc.sjs";
const TEST_URI = URL_ROOT_COM_SSL + TEST_DOCUMENT;

const INITIAL_MULTIPLER = 1;
const UPDATED_MULTIPLER = 0.1;

add_task(async function () {
  const tab = await addTab(TEST_URI);

  is(
    await getTopLevelDocumentMultiplier(),
    INITIAL_MULTIPLER,
    "The top level document has expected animationsPlayBackRateMultiplier after loading"
  );
  is(
    await getIframeDocumentMultiplier(),
    INITIAL_MULTIPLER,
    "The iframe document has expected animationsPlayBackRateMultiplier after loading"
  );

  info("Create a target list for a tab target");
  const commands = await CommandsFactory.forTab(tab);

  const targetConfigurationCommand = commands.targetConfigurationCommand;
  const targetCommand = commands.targetCommand;
  await targetCommand.startListening();

  info("Update configuration to set a custom multiplier");
  await targetConfigurationCommand.updateConfiguration({
    animationsPlayBackRateMultiplier: UPDATED_MULTIPLER,
  });

  is(
    await getTopLevelDocumentMultiplier(),
    UPDATED_MULTIPLER,
    "The top level document has expected animationsPlayBackRateMultiplier after updating the configuration"
  );
  is(
    await getIframeDocumentMultiplier(),
    UPDATED_MULTIPLER,
    "The iframe document has expected animationsPlayBackRateMultiplier after updating the configuration"
  );

  info("Reload the page");
  await BrowserTestUtils.reloadTab(tab, {
    includeSubFrames: true,
  });

  is(
    await getTopLevelDocumentMultiplier(),
    UPDATED_MULTIPLER,
    "The top level document has expected animationsPlayBackRateMultiplier after reloading"
  );
  is(
    await getIframeDocumentMultiplier(),
    UPDATED_MULTIPLER,
    "The iframe document has expected animationsPlayBackRateMultiplier after reloading"
  );

  const previousBrowsingContextId = gBrowser.selectedBrowser.browsingContext.id;
  info(
    "Check that navigating to a page that forces the creation of a new browsing context keep the simulation enabled"
  );

  const onPageLoaded = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    /* includeSubFrames */ true
  );
  BrowserTestUtils.startLoadingURIString(
    gBrowser.selectedBrowser,
    URL_ROOT_ORG_SSL + TEST_DOCUMENT + "?crossOriginIsolated=true"
  );
  await onPageLoaded;

  isnot(
    gBrowser.selectedBrowser.browsingContext.id,
    previousBrowsingContextId,
    "A new browsing context was created"
  );

  is(
    await getTopLevelDocumentMultiplier(),
    UPDATED_MULTIPLER,
    "The top level document has expected animationsPlayBackRateMultiplier after navigating to a new browsing context"
  );
  is(
    await getIframeDocumentMultiplier(),
    UPDATED_MULTIPLER,
    "The iframe document has expected animationsPlayBackRateMultiplier after navigating to a new browsing context"
  );

  targetCommand.destroy();
  await commands.destroy();

  is(
    await getTopLevelDocumentMultiplier(),
    INITIAL_MULTIPLER,
    "The top level document has expected animationsPlayBackRateMultiplier after destroying the commands"
  );
  is(
    await getIframeDocumentMultiplier(),
    INITIAL_MULTIPLER,
    "The iframe document has expected animationsPlayBackRateMultiplier after destroying the commands"
  );
});

async function getTopLevelDocumentMultiplier() {
  return SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => content.browsingContext.animationsPlayBackRateMultiplier
  );
}

async function getIframeDocumentMultiplier() {
  const iframeBC = await getIframeBrowsingContext();
  return iframeBC.animationsPlayBackRateMultiplier;
}

function getIframeBrowsingContext() {
  return SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => content.document.querySelector("iframe").browsingContext
  );
}
