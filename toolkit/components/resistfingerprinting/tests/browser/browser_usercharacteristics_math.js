/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

add_task(async function test_math_and_binary_arch() {
  info("Testing firefox_binary_arch and math_ops_fdlibm_2 metrics");

  await BrowserTestUtils.withNewTab({ gBrowser, url: emptyPage }, () =>
    GleanPings.userCharacteristics.testSubmission(
      () => {
        // Test firefox_binary_arch metric
        const firefoxBinaryArch =
          Glean.characteristics.firefoxBinaryArch.testGetValue();
        Assert.ok(firefoxBinaryArch, "firefox_binary_arch should have a value");
        Assert.notEqual(
          firefoxBinaryArch,
          "",
          "firefox_binary_arch should not be empty"
        );
        info(`firefox_binary_arch: ${firefoxBinaryArch}`);

        // Test math_ops_fdlibm_2 metric
        const mathOpsFdlibm2 =
          Glean.characteristics.mathOpsFdlibm2.testGetValue();
        Assert.ok(mathOpsFdlibm2, "math_ops_fdlibm_2 should have a value");
        Assert.notEqual(
          mathOpsFdlibm2,
          "",
          "math_ops_fdlibm_2 should not be empty"
        );

        // Parse the JSON array and check the count
        let mathValues;
        try {
          mathValues = JSON.parse(mathOpsFdlibm2);
        } catch (e) {
          Assert.ok(false, `math_ops_fdlibm_2 should be valid JSON: ${e}`);
          return;
        }

        Assert.ok(
          Array.isArray(mathValues),
          "math_ops_fdlibm_2 should be an array"
        );

        // The function collects 36 values
        const expectedCount = 36;
        Assert.equal(
          mathValues.length,
          expectedCount,
          `math_ops_fdlibm_2 should have ${expectedCount} values`
        );

        info(`math_ops_fdlibm_2 has ${mathValues.length} values as expected`);
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
