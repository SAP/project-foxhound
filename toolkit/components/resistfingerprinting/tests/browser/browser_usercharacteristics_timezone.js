/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

add_task(async function test_timezone_metrics() {
  info("Testing timezone metrics collection");

  await BrowserTestUtils.withNewTab({ gBrowser, url: emptyPage }, () =>
    GleanPings.userCharacteristics.testSubmission(
      () => {
        // Test timezone_web metric
        const timezoneWeb = Glean.characteristics.timezoneWeb.testGetValue();
        Assert.ok(timezoneWeb, "timezone_web should have a value");
        Assert.notEqual(timezoneWeb, "", "timezone_web should not be empty");
        info(`timezone_web: ${timezoneWeb}`);

        // Test timezone_offset_web metric
        const timezoneOffsetWeb =
          Glean.characteristics.timezoneOffsetWeb.testGetValue();
        Assert.strictEqual(
          typeof timezoneOffsetWeb,
          "string",
          "timezone_offset_web should be a string"
        );
        info(`timezone_offset_web: ${timezoneOffsetWeb} minutes`);

        // Timezone offset is typically in the range of -720 to +840 minutes
        // (UTC-12 to UTC+14, though most are -12 to +12)
        const offsetNum = Number(timezoneOffsetWeb);
        Assert.ok(
          offsetNum >= -720 && offsetNum <= 840,
          `timezone_offset_web (${timezoneOffsetWeb}) should be in valid range`
        );
      },
      async () => {
        const populated = TestUtils.topicObserved(
          "user-characteristics-populating-data-done",
          () => true
        );
        Services.obs.notifyObservers(
          null,
          "user-characteristics-testing-please-populate-data"
        );
        await populated;
        GleanPings.userCharacteristics.submit();
      }
    )
  );
});
