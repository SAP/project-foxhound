/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

add_task(async function test_mathml_metrics() {
  info("Testing MathML metrics collection...");

  await BrowserTestUtils.withNewTab({ gBrowser, url: emptyPage }, () =>
    GleanPings.userCharacteristics.testSubmission(
      () => {
        // Test mathml_diag_values metric
        info("Testing mathml_diag_values metric...");
        const mathmlValues =
          Glean.characteristics.mathmlDiagValues.testGetValue();
        Assert.notEqual(
          mathmlValues,
          null,
          "mathml_diag_values should be collected"
        );

        const parsed = JSON.parse(mathmlValues);
        Assert.ok(
          Array.isArray(parsed),
          "mathml_diag_values should be an array"
        );
        Assert.greater(
          parsed.length,
          0,
          "mathml_diag_values should contain entries"
        );
        info(`Collected ${parsed.length} MathML values`);

        // Each value should be a number (width measurement)
        for (const val of parsed) {
          Assert.strictEqual(
            typeof val,
            "number",
            `MathML value should be numeric: ${val}`
          );
          Assert.greaterOrEqual(
            val,
            0,
            `MathML value should be non-negative: ${val}`
          );
        }

        // Test mathml_diag_font_family metric
        info("Testing mathml_diag_font_family metric...");
        const fontFamily =
          Glean.characteristics.mathmlDiagFontFamily.testGetValue();
        Assert.notEqual(
          fontFamily,
          "",
          "mathml_diag_font_family should not be empty"
        );
        info(`MathML font family: ${fontFamily}`);

        info("All MathML metric tests passed!");
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
