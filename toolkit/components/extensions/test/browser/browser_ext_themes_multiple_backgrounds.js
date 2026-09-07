"use strict";

async function waitForConsole(task, message) {
  let p = new Promise(resolve => {
    // Not necessary in browser-chrome tests, but monitorConsole gripes
    // if we don't call it.
    SimpleTest.waitForExplicitFinish();
    SimpleTest.monitorConsole(resolve, [{ message: new RegExp(message) }]);
  });
  await task();
  SimpleTest.endMonitorConsole();
  await p;
}

// Splits a computed `background-image` value into its top-level comma-separated
// layers, without breaking on the commas inside e.g. linear-gradient(...).
function splitBackgroundImageLayers(value) {
  let layers = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; ++i) {
    let c = value[i];
    if (c == "(") {
      depth++;
    } else if (c == ")") {
      depth--;
    } else if (c == "," && depth == 0) {
      layers.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers;
}

add_setup(async function () {
  // Required by SimpleTest.monitorConsole, used below.
  SimpleTest.waitForExplicitFinish();
});

add_task(async function test_support_backgrounds_position() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      theme: {
        images: {
          theme_frame: "face1.png",
          additional_backgrounds: ["face2.png", "face2.png", "face2.png"],
        },
        colors: {
          frame: `rgb(${FRAME_COLOR.join(",")})`,
          tab_background_text: `rgb(${TAB_BACKGROUND_TEXT_COLOR.join(",")})`,
        },
        properties: {
          additional_backgrounds_alignment: [
            "left top",
            "center top",
            "right bottom",
          ],
        },
      },
    },
    files: {
      "face1.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
      "face2.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
    },
  });

  await extension.startup();

  let docEl = document.documentElement;

  Assert.ok(docEl.hasAttribute("lwtheme"), "LWT attribute should be set");
  Assert.ok(
    docEl.hasAttribute("lwtheme-brighttext"),
    "LWT text color attribute should be set"
  );

  let bgImageElement = gNavToolbox;
  let bgImageCS = window.getComputedStyle(bgImageElement);
  let mainBgImage = bgImageCS.backgroundImage.split(",")[0].trim();
  Assert.equal(
    bgImageCS.backgroundImage,
    [1, 2, 2, 2]
      .map(num => mainBgImage.replace(/face[\d]*/, `face${num}`))
      .join(", "),
    "The backgroundImage should use face1.png once and face2.png three times."
  );
  Assert.equal(
    bgImageCS.backgroundPosition,
    "100% 0%, 0% 0%, 50% 0%, 100% 100%",
    "The backgroundPosition should use the three values provided, preceded by the default for theme_frame."
  );
  /**
   * We expect duplicate background-repeat values because we apply `no-repeat`
   * once for theme_frame, and again as the default value of
   * --lwt-background-tiling.
   */
  Assert.equal(
    bgImageCS.backgroundRepeat,
    "no-repeat, no-repeat",
    "The backgroundPosition should use the default value."
  );

  await extension.unload();

  Assert.ok(!docEl.hasAttribute("lwtheme"), "LWT attribute should not be set");
  bgImageCS = window.getComputedStyle(bgImageElement);

  // Styles should've reverted to their initial values.
  Assert.equal(bgImageCS.backgroundImage, "none");
  Assert.equal(bgImageCS.backgroundPosition, "0% 0%");
  Assert.equal(bgImageCS.backgroundRepeat, "repeat");
});

add_task(async function test_support_backgrounds_repeat() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      theme: {
        images: {
          theme_frame: "face0.png",
          additional_backgrounds: ["face1.png", "face2.png", "face3.png"],
        },
        colors: {
          frame: FRAME_COLOR,
          tab_background_text: TAB_BACKGROUND_TEXT_COLOR,
        },
        properties: {
          additional_backgrounds_tiling: ["repeat-x", "repeat-y", "repeat"],
        },
      },
    },
    files: {
      "face0.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
      "face1.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
      "face2.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
      "face3.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
    },
  });

  await extension.startup();

  let docEl = window.document.documentElement;

  let bgImageElement = document.body;
  let bgImageCS = window.getComputedStyle(bgImageElement);

  Assert.ok(docEl.hasAttribute("lwtheme"), "LWT attribute should be set");
  Assert.ok(
    docEl.hasAttribute("lwtheme-brighttext"),
    "LWT text color attribute should be set"
  );

  let mainBgImage = bgImageCS.backgroundImage.split(",")[0].trim();
  Assert.equal(
    [0, 1, 2, 3]
      .map(num => mainBgImage.replace(/face[\d]*/, `face${num}`))
      .join(", "),
    bgImageCS.backgroundImage,
    "The backgroundImage should use face.png four times."
  );
  /**
   * We expect duplicate background-position values because we apply `right top`
   * once for theme_frame, and again as the default value of
   * --lwt-background-alignment.
   */
  Assert.equal(
    bgImageCS.backgroundPosition,
    "100% 0%, 100% 0%",
    "The backgroundPosition should use the default value."
  );
  Assert.equal(
    bgImageCS.backgroundRepeat,
    "no-repeat, repeat-x, repeat-y, repeat",
    "The backgroundRepeat should use the three values provided for --lwt-background-tiling, preceeded by the default for theme_frame."
  );

  await extension.unload();

  Assert.ok(!docEl.hasAttribute("lwtheme"), "LWT attribute should not be set");
});

add_task(async function test_support_backgrounds_gradient() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      theme: {
        images: {
          theme_frame: "face0.png",
          additional_backgrounds: [
            "face1.png",
            { "linear-gradient": "to right, rgb(1, 2, 3), rgb(4, 5, 6)" },
            "face2.png",
          ],
        },
        colors: {
          frame: FRAME_COLOR,
          tab_background_text: TAB_BACKGROUND_TEXT_COLOR,
        },
        properties: {
          additional_backgrounds_tiling: ["repeat-x", "no-repeat", "repeat-y"],
          additional_backgrounds_size: ["auto", "100% 100%", "auto"],
        },
      },
    },
    files: {
      "face0.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
      "face1.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
      "face2.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
    },
  });

  await extension.startup();

  let docEl = window.document.documentElement;
  let bgImageCS = window.getComputedStyle(document.body);

  Assert.ok(docEl.hasAttribute("lwtheme"), "LWT attribute should be set");

  let layers = splitBackgroundImageLayers(bgImageCS.backgroundImage);
  Assert.equal(
    layers.length,
    4,
    "The backgroundImage should have one layer for theme_frame and three for the additional backgrounds."
  );
  Assert.ok(
    layers[0].includes("face0.png") &&
      layers[1].includes("face1.png") &&
      layers[3].includes("face2.png"),
    `The image layers should reference the packaged images. Actual value is: ${bgImageCS.backgroundImage}`
  );
  Assert.equal(
    layers[2],
    "linear-gradient(to right, rgb(1, 2, 3), rgb(4, 5, 6))",
    "The gradient should be used verbatim as a background-image layer, interleaved with the images."
  );
  /**
   * The duplicate leading value is the default applied for theme_frame, then
   * the three values provided for the additional backgrounds.
   */
  Assert.equal(
    bgImageCS.backgroundRepeat,
    "no-repeat, repeat-x, no-repeat, repeat-y",
    "The gradient layer should respect additional_backgrounds_tiling."
  );
  Assert.equal(
    bgImageCS.backgroundSize,
    "auto, auto, 100% 100%, auto",
    "The gradient layer should respect additional_backgrounds_size."
  );

  await extension.unload();

  Assert.ok(!docEl.hasAttribute("lwtheme"), "LWT attribute should not be set");
});

add_task(async function test_invalid_gradient_arguments() {
  // A static theme with invalid gradient arguments should report a validation
  // error and drop the gradient, rather than being silently mishandled.
  let staticExtension = ExtensionTestUtils.loadExtension({
    manifest: {
      theme: {
        images: {
          additional_backgrounds: [
            { "linear-gradient": "not a valid gradient" },
          ],
        },
        colors: {
          frame: FRAME_COLOR,
          tab_background_text: TAB_BACKGROUND_TEXT_COLOR,
        },
      },
    },
  });
  await waitForConsole(
    staticExtension.startup,
    "Invalid value for theme gradient: linear-gradient\\(not a valid gradient\\)"
  );

  Assert.equal(
    document.documentElement.style.getPropertyValue("--lwt-additional-images"),
    "image(transparent)",
    "An invalid gradient should fall back to image(transparent)."
  );

  await staticExtension.unload();

  // Invalid arguments through the theme API should fail the update.
  let extension = ExtensionTestUtils.loadExtension({
    manifest: { permissions: ["theme"] },
    background() {
      browser.test.onMessage.addListener(async details => {
        let error;
        try {
          await browser.theme.update(details);
        } catch (e) {
          error = e;
        }
        browser.test.assertTrue(
          error && /Invalid value for theme gradient/.test(error.message),
          `Updating the theme with an invalid gradient should fail: ${
            error && error.message
          }`
        );
        browser.test.sendMessage("done");
      });
    },
  });

  await extension.startup();
  extension.sendMessage({
    images: {
      additional_backgrounds: [
        { "linear-gradient": "red), url(https://example.com/evil.png" },
      ],
    },
  });
  await extension.awaitMessage("done");
  await extension.unload();
});

add_task(async function test_additional_images_check() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      theme: {
        images: {
          theme_frame: "face.png",
        },
        colors: {
          frame: FRAME_COLOR,
          tab_background_text: TAB_BACKGROUND_TEXT_COLOR,
        },
        properties: {
          additional_backgrounds_tiling: ["repeat-x", "repeat-y", "repeat"],
        },
      },
    },
    files: {
      "face.png": imageBufferFromDataURI(ENCODED_IMAGE_DATA),
    },
  });

  await extension.startup();

  let docEl = window.document.documentElement;
  let body = document.body;

  Assert.ok(docEl.hasAttribute("lwtheme"), "LWT attribute should be set");
  Assert.ok(
    docEl.hasAttribute("lwtheme-brighttext"),
    "LWT text color attribute should be set"
  );

  let bgImageCS = window.getComputedStyle(body);
  let mainBgImage = bgImageCS.backgroundImage.split(",")[0].trim();
  Assert.ok(
    mainBgImage.includes("face.png"),
    `The backgroundImage should use face.png. Actual value is: ${mainBgImage}`
  );
  Assert.ok(
    mainBgImage.includes("face.png"),
    `The backgroundImage should use face.png. Actual value is: ${mainBgImage}`
  );
  Assert.equal(
    bgImageCS.backgroundPosition,
    "100% 0%, 100% 0%",
    "The backgroundPosition should use the default value."
  );
  Assert.equal(
    bgImageCS.backgroundRepeat,
    "no-repeat, no-repeat",
    "The backgroundRepeat should use the default value."
  );

  await extension.unload();

  Assert.ok(!docEl.hasAttribute("lwtheme"), "LWT attribute should not be set");
});
