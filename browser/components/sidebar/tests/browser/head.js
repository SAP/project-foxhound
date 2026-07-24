/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const imageBuffer = imageBufferFromDataURI(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg=="
);

function imageBufferFromDataURI(encodedImageData) {
  const decodedImageData = atob(encodedImageData);
  return Uint8Array.from(decodedImageData, byte => byte.charCodeAt(0)).buffer;
}

const SIDEBAR_VISIBILITY_PREF = "sidebar.visibility";
const POSITION_SETTING_PREF = "sidebar.position_start";
const VERTICAL_TABS_PREF = "sidebar.verticalTabs";
const kPrefCustomizationState = "browser.uiCustomization.state";
const kPrefCustomizationHorizontalTabstrip =
  "browser.uiCustomization.horizontalTabstrip";
const kPrefCustomizationNavBarWhenVerticalTabs =
  "browser.uiCustomization.navBarWhenVerticalTabs";

const MODIFIED_PREFS = Object.freeze([
  kPrefCustomizationState,
  kPrefCustomizationHorizontalTabstrip,
  kPrefCustomizationNavBarWhenVerticalTabs,
  "sidebar.new-sidebar.has-used",
  "browser.engagement.home-button.has-removed",
  "browser.engagement.home-button.has-removed",
  "browser.engagement.sidebar-button.has-used",
  "browser.toolbarbuttons.introduced.sidebar-button",
  "sidebar.verticalTabs.dragToPinPromo.dismissed",
]);

function clearModifiedPrefs() {
  for (const pref of MODIFIED_PREFS) {
    Services.prefs.clearUserPref(pref);
  }
}

// Ensure we clear any previous pref values
clearModifiedPrefs();

/* global browser */
const extData = {
  manifest: {
    sidebar_action: {
      default_icon: {
        16: "icon.png",
        32: "icon@2x.png",
      },
      default_panel: "default.html",
      default_title: "Default Title",
    },
  },
  useAddonManager: "temporary",

  files: {
    "default.html": `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"/>
          <script src="sidebar.js"></script>
          </head>
          <body>
          A Test Sidebar
          </body></html>
        `,
    "sidebar.js": function () {
      window.onload = () => {
        browser.test.sendMessage("sidebar");
      };
    },
    "1.html": `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"/></head>
          <body>
          A Test Sidebar
          </body></html>
        `,
    "icon.png": imageBuffer,
    "icon@2x.png": imageBuffer,
    "updated-icon.png": imageBuffer,
  },

  background() {
    browser.test.onMessage.addListener(async ({ msg, data }) => {
      switch (msg) {
        case "set-icon":
          await browser.sidebarAction.setIcon({ path: data });
          break;
        case "set-panel":
          await browser.sidebarAction.setPanel({ panel: data });
          break;
        case "set-title":
          await browser.sidebarAction.setTitle({ title: data });
          break;
        case "reload-extension":
          browser.runtime.reload();
          break;
      }
      browser.test.sendMessage("done");
    });
  },
};

// Ensure each test leaves the sidebar in its initial state when it completes
const initialSidebarState = { ...SidebarController.getUIState(), command: "" };
async function resetSidebarToInitialState() {
  info(
    `Restoring sidebar state from: ${JSON.stringify(SidebarController.getUIState())}, back to: ${JSON.stringify(initialSidebarState)}`
  );
  await SidebarController.initializeUIState(initialSidebarState);
}
registerCleanupFunction(async () => {
  await resetSidebarToInitialState();
  // Reset the Glean events after each test.
  Services.fog.testResetFOG();
  clearModifiedPrefs();
});

function waitForBrowserWindowActive(win) {
  // eslint-disable-next-line consistent-return
  return new Promise(resolve => {
    if (Services.focus.activeWindow == win) {
      resolve();
    } else {
      return BrowserTestUtils.waitForEvent(win, "activate");
    }
  });
}

async function openAndWaitForContextMenu(popup, button, onShown) {
  const menuShownPromise = BrowserTestUtils.waitForPopupEvent(popup, "shown");
  button.scrollIntoView();

  const eventDetails = { type: "contextmenu", button: 2 };
  EventUtils.synthesizeMouseAtCenter(
    button,
    eventDetails,
    // eslint-disable-next-line mozilla/use-ownerGlobal
    button.ownerDocument.defaultView
  );
  await menuShownPromise;
  if (onShown) {
    await onShown();
  }
  return popup;
}

function isActiveElement(el) {
  return el.getRootNode().activeElement == el;
}

async function toggleSidebarPanel(win, commandID) {
  const promiseFocused = BrowserTestUtils.waitForEvent(win, "SidebarFocused");
  win.SidebarController.toggle(commandID);
  await promiseFocused;
}

async function ensureSidebarLauncherIsVisible(win = window) {
  const {
    promiseInitialized,
    toolbarButton,
    sidebarMain: sidebarLauncher,
    sidebarContainer,
  } = win.SidebarController;
  await promiseInitialized;
  // Show the sidebar launcher if the container is hidden
  if (sidebarContainer.hidden) {
    toolbarButton.doCommand();
    await sidebarLauncher.updateComplete;
    await BrowserTestUtils.waitForMutationCondition(
      sidebarContainer,
      { attributes: true, attributeFilter: ["hidden"] },
      () => !sidebarContainer.hidden
    );
  }
  Assert.ok(
    BrowserTestUtils.isVisible(sidebarLauncher),
    "Sidebar launcher is visible"
  );
}

async function waitForTabstripOrientation(
  toOrientation = "vertical",
  win = window
) {
  await win.SidebarController.promiseInitialized;
  // We use the orient attribute on the tabstrip element as a reliable signal that
  // tabstrip orientation has changed/is settled into the given orientation
  info(
    `waitForTabstripOrientation: waiting for orient attribute to be "${toOrientation}"`
  );
  await BrowserTestUtils.waitForMutationCondition(
    win.gBrowser.tabContainer,
    { attributes: true, attributeFilter: ["orient"] },
    () => win.gBrowser.tabContainer.getAttribute("orient") == toOrientation
  );
  // This change is followed by a update/render step for the lit elements.
  // We need to wait for that too
  await win.SidebarController.sidebarMain?.updateComplete;
}

/**
 * Wait until Style and Layout information have been calculated and the paint
 * has occurred.
 *
 * @see https://firefox-source-docs.mozilla.org/performance/bestpractices.html
 */
async function waitForRepaint() {
  await SidebarController.waitUntilStable();
  return new Promise(resolve =>
    requestAnimationFrame(() => {
      Services.tm.dispatchToMainThread(resolve);
    })
  );
}

function cleanUpExtraTabs() {
  while (window.gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(window.gBrowser.tabs.at(-1));
  }
}

async function showHistorySidebar({ waitForPendingHistory = true } = {}) {
  if (SidebarController.currentID !== "viewHistorySidebar") {
    await SidebarController.show("viewHistorySidebar");
  }
  const { contentDocument, contentWindow } = SidebarController.browser;
  const component = contentDocument.querySelector("sidebar-history");
  if (waitForPendingHistory) {
    await BrowserTestUtils.waitForCondition(
      () => !component.controller.isHistoryPending
    );
  }
  await component.updateComplete;
  return { component, contentWindow };
}

/**
 * Insert visits for history testing.
 *
 * @returns {{ URLs: string[]; dates: Date[]; }}
 */
async function populateHistory() {
  const URLs = [
    "http://mochi.test:8888/browser/",
    "https://www.example.com/",
    "https://example.net/",
    "https://example.org/",
  ];

  const today = new Date();
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1
  );
  // Get date for the second-last day of the previous month.
  // (Do not use the last day, since that could be the same as yesterday's date.)
  const lastMonth = new Date(today.getFullYear(), today.getMonth(), -2);

  const dates = [today, yesterday, lastMonth];
  await PlacesUtils.history.clear();
  const pageInfos = URLs.flatMap((url, i) =>
    dates.map(date => ({
      url,
      title: `Example Domain ${i}`,
      visits: [{ date }],
    }))
  );
  await PlacesUtils.history.insertMany(pageInfos);
  return { URLs, dates };
}

/**
 * Synthesize a key press and wait for an element to be focused.
 *
 * @param {Element} element
 * @param {string} keyCode
 * @param {ChromeWindow} contentWindow
 */
async function focusWithKeyboard(element, keyCode, contentWindow) {
  await SimpleTest.promiseFocus(contentWindow);
  const focused = BrowserTestUtils.waitForEvent(
    element,
    "focus",
    contentWindow
  );
  EventUtils.synthesizeKey(keyCode, {}, contentWindow);
  await focused;
}

/**
 * Perform a task function and wait for a specific URL to load.
 *
 * @param {Function} pageLoadTask
 * @param {string} expectedUrl
 */
async function waitForPageLoadTask(pageLoadTask, expectedUrl) {
  const promiseTabOpen = BrowserTestUtils.waitForEvent(
    window.gBrowser.tabContainer,
    "TabOpen"
  );
  await pageLoadTask();
  await promiseTabOpen;
  await BrowserTestUtils.browserLoaded(window.gBrowser, false, expectedUrl);
  info(`Navigated to ${expectedUrl}.`);
}
