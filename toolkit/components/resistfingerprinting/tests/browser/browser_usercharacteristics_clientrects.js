/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

add_task(async function test_clientrects_all_metrics() {
  info("Testing all ClientRects metrics collection...");

  await BrowserTestUtils.withNewTab({ gBrowser, url: emptyPage }, () =>
    GleanPings.userCharacteristics.testSubmission(
      () => {
        info("Testing Element.getClientRects() metrics...");
        for (let i = 1; i <= 12; i++) {
          const metricNum = String(i).padStart(2, "0");
          const value =
            Glean.characteristics[
              `clientrectsElementGcr${metricNum}`
            ].testGetValue();
          Assert.notEqual(
            value,
            null,
            `Element GCR ${metricNum} should be collected`
          );
          Assert.notEqual(
            value,
            "",
            `Element GCR ${metricNum} should not be empty`
          );

          const parsed = JSON.parse(value);
          Assert.strictEqual(
            typeof parsed,
            "object",
            `Element GCR ${metricNum} should be an object`
          );
          Assert.ok(
            "w" in parsed && "h" in parsed,
            `Element GCR ${metricNum} should have width and height`
          );
        }
        info("All 12 Element.getClientRects() metrics validated");

        info("Testing Element.getBoundingClientRect() metrics...");
        for (let i = 1; i <= 12; i++) {
          const metricNum = String(i).padStart(2, "0");
          const value =
            Glean.characteristics[
              `clientrectsElementGbcr${metricNum}`
            ].testGetValue();
          Assert.notEqual(
            value,
            null,
            `Element GBCR ${metricNum} should be collected`
          );
          Assert.notEqual(
            value,
            "",
            `Element GBCR ${metricNum} should not be empty`
          );

          const parsed = JSON.parse(value);
          Assert.strictEqual(
            typeof parsed,
            "object",
            `Element GBCR ${metricNum} should be an object`
          );
          Assert.ok(
            "w" in parsed && "h" in parsed,
            `Element GBCR ${metricNum} should have width and height`
          );
        }
        info("All 12 Element.getBoundingClientRect() metrics validated");

        info("Testing Range.getClientRects() metrics...");
        for (let i = 1; i <= 12; i++) {
          const metricNum = String(i).padStart(2, "0");
          const value =
            Glean.characteristics[
              `clientrectsRangeGcr${metricNum}`
            ].testGetValue();
          Assert.notEqual(
            value,
            null,
            `Range GCR ${metricNum} should be collected`
          );
          Assert.notEqual(
            value,
            "",
            `Range GCR ${metricNum} should not be empty`
          );

          const parsed = JSON.parse(value);
          Assert.strictEqual(
            typeof parsed,
            "object",
            `Range GCR ${metricNum} should be an object`
          );
          Assert.ok(
            "w" in parsed && "h" in parsed,
            `Range GCR ${metricNum} should have width and height`
          );
        }
        info("All 12 Range.getClientRects() metrics validated");

        info("Testing Range.getBoundingClientRect() metrics...");
        for (let i = 1; i <= 12; i++) {
          const metricNum = String(i).padStart(2, "0");
          const value =
            Glean.characteristics[
              `clientrectsRangeGbcr${metricNum}`
            ].testGetValue();
          Assert.notEqual(
            value,
            null,
            `Range GBCR ${metricNum} should be collected`
          );
          Assert.notEqual(
            value,
            "",
            `Range GBCR ${metricNum} should not be empty`
          );

          const parsed = JSON.parse(value);
          Assert.strictEqual(
            typeof parsed,
            "object",
            `Range GBCR ${metricNum} should be an object`
          );
          Assert.ok(
            "w" in parsed && "h" in parsed,
            `Range GBCR ${metricNum} should have width and height`
          );
        }
        info("All 12 Range.getBoundingClientRect() metrics validated");

        info("Testing additional ClientRects metrics...");
        const knownDimensions =
          Glean.characteristics.clientrectsKnownDimensions.testGetValue();
        Assert.notEqual(
          knownDimensions,
          null,
          "Known dimensions should be collected"
        );
        const knownParsed = JSON.parse(knownDimensions);
        Assert.ok(
          "w" in knownParsed && "h" in knownParsed,
          "Known dimensions should have width and height"
        );

        const ghostDimensions =
          Glean.characteristics.clientrectsGhostDimensions.testGetValue();
        Assert.notEqual(
          ghostDimensions,
          null,
          "Ghost dimensions should be collected"
        );
        const ghostParsed = JSON.parse(ghostDimensions);
        Assert.equal(ghostParsed.w, 0, "Ghost element width should be 0");
        Assert.equal(ghostParsed.h, 0, "Ghost element height should be 0");

        info("Testing individual emoji metrics...");
        for (let i = 1; i <= 6; i++) {
          const metricNum = String(i).padStart(2, "0");
          const value =
            Glean.characteristics[
              `clientrectsEmoji${metricNum}`
            ].testGetValue();
          Assert.notEqual(
            value,
            null,
            `Emoji ${metricNum} should be collected`
          );
          Assert.notEqual(value, "", `Emoji ${metricNum} should not be empty`);

          const parsed = JSON.parse(value);
          Assert.strictEqual(
            typeof parsed,
            "object",
            `Emoji ${metricNum} should be an object`
          );
          Assert.ok(
            "w" in parsed && "h" in parsed,
            `Emoji ${metricNum} should have width and height`
          );
        }
        info("All 6 emoji metrics validated");

        info("All additional ClientRects metrics validated");
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
