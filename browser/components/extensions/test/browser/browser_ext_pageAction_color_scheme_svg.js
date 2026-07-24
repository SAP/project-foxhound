/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

const COLOR_SCHEME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <style>
    rect { fill: #ff0000; }
    @media (prefers-color-scheme: dark) {
      rect { fill: #0000ff; }
    }
  </style>
  <rect width="16" height="16" />
</svg>`;

const LIGHT_THEME = {
  manifest: {
    theme: {
      colors: {
        frame: "#FFF",
        tab_background_text: "#000",
        toolbar: "#FFF",
        toolbar_field: "#FFF",
        toolbar_field_text: "#000",
      },
    },
  },
};

const DARK_THEME = {
  manifest: {
    theme: {
      colors: {
        frame: "#000",
        tab_background_text: "#FFF",
        toolbar: "#000",
        toolbar_field: "#000",
        toolbar_field_text: "#FFF",
      },
    },
  },
};

const DEPRECATION_ROLLBACK_PREF =
  "extensions.webextensions.pageActionIconDarkModeFilter.enabled";

async function testPageActionFilter(options) {
  const { rollbackPrefEnabled, useDarkTheme, expectFilter } = options;

  await SpecialPowers.pushPrefEnv({
    set: [[DEPRECATION_ROLLBACK_PREF, rollbackPrefEnabled]],
  });

  let themeExtension = ExtensionTestUtils.loadExtension(
    useDarkTheme ? DARK_THEME : LIGHT_THEME
  );
  await themeExtension.startup();

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      page_action: {
        default_icon: "icon.svg",
        show_matches: ["<all_urls>"],
      },
    },
    files: {
      "icon.svg": COLOR_SCHEME_SVG,
    },
    async background() {
      let tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      await browser.pageAction.show(tabs[0].id);
      browser.test.sendMessage("page-action-shown");
    },
  });

  await extension.startup();
  await extension.awaitMessage("page-action-shown");

  let button = await getPageActionButton(extension);
  await promiseAnimationFrame();

  let iconElement = button.querySelector(".urlbar-icon");
  let computedStyle = window.getComputedStyle(iconElement);
  let filterValue = computedStyle.filter;

  // Sanity check.
  Assert.equal(
    window.matchMedia("(prefers-color-scheme: dark)").matches,
    useDarkTheme,
    `Expect the browser windows to prefer-color-scheme ${useDarkTheme ? "dark" : "light"}`
  );

  if (expectFilter) {
    ok(
      filterValue && filterValue !== "none",
      "Deprecated CSS Filter should be applied to the pageAction icon while dark theme and emergency rollback pref are enabled"
    );
    ok(
      filterValue.includes("grayscale") &&
        filterValue.includes("brightness") &&
        filterValue.includes("invert"),
      `Deprecated CSS Filter should include all three transformations, got: ${filterValue}`
    );
  } else {
    is(
      filterValue,
      "none",
      `Deprecated CSS Filter should not be applied to the pageAction icon`
    );
  }

  await extension.unload();
  await themeExtension.unload();

  await SpecialPowers.popPrefEnv();
}

add_task(async function testFilterWithPrefDisabledDarkTheme() {
  await testPageActionFilter({
    rollbackPrefEnabled: false,
    useDarkTheme: true,
    expectFilter: false,
  });
});

add_task(async function testFilterWithPrefDisabledLightTheme() {
  await testPageActionFilter({
    rollbackPrefEnabled: false,
    useDarkTheme: false,
    expectFilter: false,
  });
});

add_task(async function testFilterWithPrefEnabledDarkTheme() {
  await testPageActionFilter({
    rollbackPrefEnabled: true,
    useDarkTheme: true,
    expectFilter: true,
  });
});

add_task(async function testFilterWithPrefEnabledLightTheme() {
  await testPageActionFilter({
    rollbackPrefEnabled: true,
    useDarkTheme: false,
    expectFilter: false,
  });
});
