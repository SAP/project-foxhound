/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

add_task(async function test_svg_metrics() {
  info("Testing SVG fingerprinting metrics collection...");

  await BrowserTestUtils.withNewTab({ gBrowser, url: emptyPage }, () =>
    GleanPings.userCharacteristics.testSubmission(
      () => {
        info("Testing SVG getBBox metric...");
        const svgBbox = Glean.characteristics.svgBbox.testGetValue();
        Assert.notEqual(svgBbox, null, "SVG bbox should be collected");
        const bboxParsed = JSON.parse(svgBbox);
        Assert.strictEqual(
          typeof bboxParsed,
          "object",
          "SVG bbox should be a JSON object"
        );
        Assert.ok(
          "x" in bboxParsed && "y" in bboxParsed,
          "SVG bbox should have x and y"
        );
        Assert.ok(
          "w" in bboxParsed && "h" in bboxParsed,
          "SVG bbox should have w and h"
        );

        info("Testing SVG getComputedTextLength metric...");
        const svgComputedTextLength =
          Glean.characteristics.svgComputedTextLength.testGetValue();
        Assert.notEqual(
          svgComputedTextLength,
          null,
          "SVG computed text length should be collected"
        );
        Assert.ok(
          !isNaN(parseFloat(svgComputedTextLength)),
          "SVG computed text length should be numeric"
        );

        info("Testing SVG getExtentOfChar metric...");
        const svgExtentOfChar =
          Glean.characteristics.svgExtentOfChar.testGetValue();
        Assert.notEqual(
          svgExtentOfChar,
          null,
          "SVG extent of char should be collected"
        );
        const extentParsed = JSON.parse(svgExtentOfChar);
        Assert.strictEqual(
          typeof extentParsed,
          "object",
          "SVG extent of char should be a JSON object"
        );
        Assert.ok(
          "w" in extentParsed && "h" in extentParsed,
          "SVG extent of char should have w and h"
        );

        info("Testing SVG getSubStringLength metric...");
        const svgSubstringLength =
          Glean.characteristics.svgSubstringLength.testGetValue();
        Assert.notEqual(
          svgSubstringLength,
          null,
          "SVG substring length should be collected"
        );
        Assert.ok(
          !isNaN(parseFloat(svgSubstringLength)),
          "SVG substring length should be numeric"
        );

        info("Testing SVG emoji set metric...");
        const svgEmojiSet = Glean.characteristics.svgEmojiSet.testGetValue();
        Assert.notEqual(svgEmojiSet, null, "SVG emoji set should be collected");
        const emojiParsed = JSON.parse(svgEmojiSet);
        Assert.ok(
          Array.isArray(emojiParsed),
          "SVG emoji set should be a JSON array"
        );
        Assert.greater(
          emojiParsed.length,
          0,
          "SVG emoji set should have at least one emoji"
        );

        info("All SVG fingerprinting metrics validated");
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
