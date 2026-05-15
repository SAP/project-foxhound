/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

const LIGHT_THEME_COLORS = {
  frame: "#FFF",
  tab_background_text: "#000",
};

const DARK_THEME_COLORS = {
  frame: "#000",
  tab_background_text: "#FFF",
};

const TOOLBAR_MAPPING = {
  navbar: "nav-bar",
  tabstrip: "TabsToolbar",
};

const DEFAULT_ICON = "default.png";
const LIGHT_THEME_ICON = "black.png";
const DARK_THEME_ICON = "white.png";

async function testBrowserAction(extension, expectedIcon) {
  const browserActionWidget = getBrowserActionWidget(extension);
  await promiseAnimationFrame();
  const browserActionButton = browserActionWidget
    .forWindow(window)
    .node.querySelector(".unified-extensions-item-action-button");
  const image = getListStyleImage(browserActionButton);
  ok(
    image?.includes(expectedIcon),
    `Expected browser action icon (${image}) to be ${expectedIcon}`
  );
}

async function testStaticTheme(options) {
  const {
    themeData,
    themeIcons,
    withDefaultIcon,
    expectedIcon,
    defaultArea = "navbar",
  } = options;

  const manifest = {
    browser_action: {
      theme_icons: themeIcons,
      default_area: defaultArea,
    },
  };

  if (withDefaultIcon) {
    manifest.browser_action.default_icon = DEFAULT_ICON;
  }

  const extension = ExtensionTestUtils.loadExtension({ manifest });

  await extension.startup();

  // Ensure we show the menupanel at least once. This makes sure that the
  // elements we're going to query the style of are in the flat tree.
  if (defaultArea == "menupanel") {
    const shown = BrowserTestUtils.waitForPopupEvent(
      window.gUnifiedExtensions.panel,
      "shown"
    );
    window.gUnifiedExtensions.togglePanel();
    await shown;
  }

  // Confirm that the browser action has the correct default icon before a theme is loaded.
  const toolbarId = TOOLBAR_MAPPING[defaultArea];

  // Some platforms have dark toolbars by default, take it in account when picking the default icon.
  const hasDarkToolbar =
    toolbarId && document.getElementById(toolbarId).hasAttribute("brighttext");
  const expectedDefaultIcon = hasDarkToolbar
    ? DARK_THEME_ICON
    : LIGHT_THEME_ICON;

  if (Services.appinfo.nativeMenubar) {
    ok(
      !document.getElementById("toolbar-menubar").hasAttribute("brighttext"),
      "Shouldn't change menubar icon colors for native menubar"
    );
  }
  await testBrowserAction(extension, expectedDefaultIcon);

  const theme = ExtensionTestUtils.loadExtension({
    manifest: {
      theme: {
        colors: themeData,
      },
    },
  });

  await theme.startup();

  // Confirm that the correct icon is used when the theme is loaded.
  await testBrowserAction(extension, expectedIcon);

  await theme.unload();

  // Confirm that the browser action has the correct default icon when the theme is unloaded.
  await testBrowserAction(extension, expectedDefaultIcon);

  await extension.unload();
}

add_task(async function browseraction_theme_icons_light_theme() {
  await testStaticTheme({
    themeData: LIGHT_THEME_COLORS,
    expectedIcon: LIGHT_THEME_ICON,
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 19,
      },
    ],
    withDefaultIcon: true,
  });
  await testStaticTheme({
    themeData: LIGHT_THEME_COLORS,
    expectedIcon: LIGHT_THEME_ICON,
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 16,
      },
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 32,
      },
    ],
    withDefaultIcon: false,
  });
});

add_task(async function browseraction_theme_icons_dark_theme() {
  await testStaticTheme({
    themeData: DARK_THEME_COLORS,
    expectedIcon: DARK_THEME_ICON,
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 19,
      },
    ],
    withDefaultIcon: true,
  });
  await testStaticTheme({
    themeData: DARK_THEME_COLORS,
    expectedIcon: DARK_THEME_ICON,
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 16,
      },
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 32,
      },
    ],
    withDefaultIcon: false,
  });
});

add_task(async function browseraction_theme_icons_different_toolbars() {
  const themeData = {
    frame: "#000",
    tab_background_text: "#fff",
    toolbar: "#fff",
    bookmark_text: "#000",
  };
  await testStaticTheme({
    themeData,
    expectedIcon: LIGHT_THEME_ICON,
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 19,
      },
    ],
    withDefaultIcon: true,
  });
  await testStaticTheme({
    themeData,
    expectedIcon: LIGHT_THEME_ICON,
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 16,
      },
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 32,
      },
    ],
  });
  await testStaticTheme({
    themeData,
    expectedIcon: DARK_THEME_ICON,
    defaultArea: "tabstrip",
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 19,
      },
    ],
    withDefaultIcon: true,
  });
  await testStaticTheme({
    themeData,
    expectedIcon: DARK_THEME_ICON,
    defaultArea: "tabstrip",
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 16,
      },
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 32,
      },
    ],
  });
});

add_task(async function browseraction_theme_icons_overflow_panel() {
  const themeData = {
    popup: "#000",
    popup_text: "#fff",
  };
  await testStaticTheme({
    themeData,
    expectedIcon: LIGHT_THEME_ICON,
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 19,
      },
    ],
    withDefaultIcon: true,
  });
  await testStaticTheme({
    themeData,
    expectedIcon: LIGHT_THEME_ICON,
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 16,
      },
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 32,
      },
    ],
  });

  await testStaticTheme({
    themeData,
    expectedIcon: DARK_THEME_ICON,
    defaultArea: "menupanel",
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 19,
      },
    ],
    withDefaultIcon: true,
  });
  await testStaticTheme({
    themeData,
    expectedIcon: DARK_THEME_ICON,
    defaultArea: "menupanel",
    themeIcons: [
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 16,
      },
      {
        dark: LIGHT_THEME_ICON,
        light: DARK_THEME_ICON,
        size: 32,
      },
    ],
  });
});

add_task(async function browseraction_theme_icons_dynamic_theme() {
  const themeExtension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["theme"],
    },
    background() {
      browser.test.onMessage.addListener((msg, colors) => {
        if (msg === "update-theme") {
          browser.theme.update({
            colors: colors,
          });
          browser.test.sendMessage("theme-updated");
        }
      });
    },
  });

  await themeExtension.startup();

  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_action: {
        default_icon: DEFAULT_ICON,
        default_area: "navbar",
        theme_icons: [
          {
            dark: LIGHT_THEME_ICON,
            light: DARK_THEME_ICON,
            size: 16,
          },
          {
            dark: LIGHT_THEME_ICON,
            light: DARK_THEME_ICON,
            size: 32,
          },
        ],
      },
    },
  });

  await extension.startup();

  // Confirm that the browser action has the default icon before a theme is set.
  await testBrowserAction(extension, LIGHT_THEME_ICON);

  // Update the theme to a light theme.
  themeExtension.sendMessage("update-theme", LIGHT_THEME_COLORS);
  await themeExtension.awaitMessage("theme-updated");

  // Confirm that the dark icon is used for the light theme.
  await testBrowserAction(extension, LIGHT_THEME_ICON);

  // Update the theme to a dark theme.
  themeExtension.sendMessage("update-theme", DARK_THEME_COLORS);
  await themeExtension.awaitMessage("theme-updated");

  // Confirm that the light icon is used for the dark theme.
  await testBrowserAction(extension, DARK_THEME_ICON);

  // Unload the theme.
  await themeExtension.unload();

  // Confirm that the light icon is used when the theme is unloaded.
  await testBrowserAction(extension, LIGHT_THEME_ICON);

  await extension.unload();
});
