"use strict";

const TEST_PATH =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content/",
    "https://example.com/"
  ) + "file_clobbered_property.html";

add_task(async function test_clobbered_properties() {
  Services.fog.testResetFOG();

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PATH);
  BrowserTestUtils.removeTab(tab);

  ok(true, "before wait");

  let result = await TestUtils.waitForCondition(() =>
    Glean.security.shadowedHtmlDocumentPropertyAccess.testGetValue()
  );

  is(result.length, 3, "Got three HTMLDocument metrics");

  let names = result.map(entry => entry.extra.name);
  ok(
    names.includes("currentScript"),
    "Clobbering of 'currentScript' was collected"
  );
  ok(
    names.includes("onreadystatechange"),
    "Clobbering of 'onreadystatechange' was collected"
  );
  ok(names.includes("hasFocus"), "Clobbering of 'hasFocus' was collected");
});
