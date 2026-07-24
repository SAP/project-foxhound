/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const emptyPage =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty.html";

add_task(async function test_css_system_colors_and_fonts() {
  info("Testing CSS system colors and fonts collection...");

  await BrowserTestUtils.withNewTab({ gBrowser, url: emptyPage }, () =>
    GleanPings.userCharacteristics.testSubmission(
      () => {
        const colorsValue =
          Glean.characteristics.cssSystemColors.testGetValue();
        Assert.notEqual(
          colorsValue,
          null,
          "CSS system colors should be collected"
        );
        Assert.notEqual(
          colorsValue,
          "",
          "CSS system colors should not be empty"
        );

        const colorsParsed = JSON.parse(colorsValue);
        Assert.ok(
          Array.isArray(colorsParsed),
          "CSS system colors should be an array"
        );
        Assert.greater(
          colorsParsed.length,
          0,
          "CSS system colors should contain entries"
        );

        const firstColorEntry = colorsParsed[0];
        Assert.strictEqual(
          typeof firstColorEntry,
          "object",
          "Each color entry should be an object"
        );

        const colorKeys = Object.keys(firstColorEntry);
        Assert.equal(
          colorKeys.length,
          1,
          "Each color entry should have exactly one key"
        );

        const colorValue = firstColorEntry[colorKeys[0]];
        Assert.ok(
          /^[0-9A-F]{6}$/.test(colorValue),
          "Color value should be in uppercase HEX format (e.g., FFFFFF)"
        );

        info(`Collected ${colorsParsed.length} system colors`);

        const fontsValue = Glean.characteristics.cssSystemFonts.testGetValue();
        Assert.notEqual(
          fontsValue,
          null,
          "CSS system fonts should be collected"
        );
        Assert.notEqual(fontsValue, "", "CSS system fonts should not be empty");

        const fontsParsed = JSON.parse(fontsValue);
        Assert.ok(
          Array.isArray(fontsParsed),
          "CSS system fonts should be an array"
        );
        Assert.greater(
          fontsParsed.length,
          0,
          "CSS system fonts should contain entries"
        );

        const firstFontEntry = fontsParsed[0];
        Assert.strictEqual(
          typeof firstFontEntry,
          "object",
          "Each font entry should be an object"
        );

        const fontKeys = Object.keys(firstFontEntry);
        Assert.equal(
          fontKeys.length,
          1,
          "Each font entry should have exactly one key"
        );

        const fontValue = firstFontEntry[fontKeys[0]];
        Assert.ok(
          fontValue.includes("px"),
          "Font value should include pixel size"
        );

        info(`Collected ${fontsParsed.length} system fonts`);
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
