/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from head.js */

async function doSearchEngineDefaultIdTest({ trigger, assert }) {
  await doTest(async () => {
    info("Test with current engine");
    const defaultEngine = await SearchService.getDefault();

    await openPopup("x");
    await trigger();
    await assert(defaultEngine.telemetryId);
  });

  await doTest(async () => {
    info("Test with new engine");
    const defaultEngine = await SearchService.getDefault();
    const newEngineName = "NewDummyEngine";
    await SearchTestUtils.installSearchExtension({
      name: newEngineName,
      search_url: "https://example.com/",
      search_url_get_params: "q={searchTerms}",
    });
    const newEngine = await SearchService.getEngineByName(newEngineName);
    Assert.notEqual(defaultEngine.telemetryId, newEngine.telemetryId);
    await SearchService.setDefault(
      newEngine,
      SearchService.CHANGE_REASON.UNKNOWN
    );

    await openPopup("x");
    await trigger();
    await assert(newEngine.telemetryId);

    await SearchService.setDefault(
      defaultEngine,
      SearchService.CHANGE_REASON.UNKNOWN
    );
  });
}
