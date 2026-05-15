const { TabGroupTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TabGroupTestUtils.sys.mjs"
);

const LOCALE_LTR = "ltr";
const LOCALE_RTL = "rtl";

/**
 * @param {Element} src
 * @param {Element} dest
 * @param {Promise<void>} [dragCond]
 * @param {Promise<void>} [dropCond]
 * @param {object} [dragEvent={}]
 */
async function customDragAndDrop(
  src,
  dest,
  dragCond = null,
  dropCond = null,
  dragEvent = {}
) {
  EventUtils.startDragSession(window, "move");

  info("Start drag");
  let [result, dataTransfer] = EventUtils.synthesizeDragOver(
    src,
    // In some cases, the dest is hidden and we use coords instead.
    // Default to src in this scenario.
    BrowserTestUtils.isHidden(dest) && dragEvent?.clientX && dragEvent?.clientY
      ? src
      : dest,
    null,
    "move",
    window,
    window,
    dragEvent
  );
  await dragCond;

  info("Start drop");
  EventUtils.synthesizeDropAfterDragOver(result, dataTransfer, dest);
  let srcWindowUtils = EventUtils._getDOMWindowUtils(window);
  const srcDragSession = srcWindowUtils.dragSession;
  srcDragSession.endDragSession(true, EventUtils._parseModifiers(dragEvent));
  await dropCond;
  Assert.ok(
    !gBrowser.tabContainer.hasAttribute("movingtab"),
    "tab strip state is no longer in drag-drop mode"
  );
}

/**
 * @param {string} url
 * @param {object} params
 *   Parameters for `Tabbrowser.addTab`
 * @returns {Promise<MozTabbrowserTab>}
 * @see Tabbrowser.addTab
 */
async function addTab(url = "http://mochi.test:8888/", params = {}) {
  params.skipAnimation = true;
  const tab = BrowserTestUtils.addTab(gBrowser, url, params);
  const browser = gBrowser.getBrowserForTab(tab);
  await BrowserTestUtils.browserLoaded(browser);
  return tab;
}

/**
 * @param {"ltr"|"rtl"} localeDirection
 * @param {() => Promise<void>} testFn
 */
async function runAndCleanup(localeDirection, testFn) {
  // We assume that the test window is in its default state: a single blank
  // tab with a horizontal tab strip in an LTR locale.
  if (gBrowser.tabs.length > 1) {
    throw new Error(
      `Expected window to start with 1 tab, but it had ${gBrowser.tabs.length} tabs instead`
    );
  }

  if (localeDirection != LOCALE_LTR && localeDirection != LOCALE_RTL) {
    throw new Error(
      `Locale dir must be either '${LOCALE_LTR}' or '${LOCALE_RTL}'`
    );
  }

  if (localeDirection === LOCALE_RTL) {
    await BrowserTestUtils.enableRtlLocale();
  }

  try {
    await testFn();
  } finally {
    if (localeDirection === LOCALE_RTL) {
      await BrowserTestUtils.disableRtlLocale();
    }
  }
}

/**
 * @param {Element} el
 * @returns {DOMRect}
 */
const bounds = el => window.windowUtils.getBoundsWithoutFlushing(el);

/**
 * Run an operation with a time limit; if the time limit is exceeded, the
 * operation should fail.
 *
 * The main motivation for this helper was the lack of a time budget for
 * `BrowserTestUtils.waitForEvent` -- if an expected event never fired,
 * then the test would hang until the test runner timed out. That felt like
 * too long to wait for some events that should be triggered in short order.
 *
 * @template T
 * @param {Promise<T>} operation
 *   Async operation to run within a time budget
 * @param {number} timeLimit
 *   The time budget (in milliseconds) for `operation` to run
 * @param {string} message
 *   Rejection message if `operation` loses the race due to exceeding `timeLimit`
 * @returns {Promise<T>}
 */
function raceTimeout(operation, timeLimit, message) {
  return Promise.race([
    operation,
    new Promise((_, reject) => {
      /* eslint-disable mozilla/no-arbitrary-setTimeout */
      window.setTimeout(() => {
        reject(message);
      }, timeLimit);
    }),
  ]);
}

/**
 * @param {MozTabbrowserTab} tab
 * @returns {Promise<CustomEvent>}
 *   Resolves to the `TabMove` event emitted from `tab`. Rejects if `tab` did
 *   not move in a timely fashion.
 */
function waitForTabMove(tab) {
  return raceTimeout(
    BrowserTestUtils.waitForEvent(tab, "TabMove"),
    1000,
    "Tab did not change position after a drop"
  );
}

/**
 * @param {boolean} Optional
 * Whether to apply to vertical or horizontal tabs
 * @returns {object}
 *   Returns properties used to emulate a drag event.
 */
function getDragEvent(isVertical = false) {
  let tabContainerRect = window.windowUtils.getBoundsWithoutFlushing(
    gBrowser.tabContainer
  );
  // Drag to the starting edge of the tab container
  return {
    clientX: isVertical
      ? tabContainerRect.x + tabContainerRect.width / 2
      : tabContainerRect.x + 1,
    clientY: isVertical
      ? tabContainerRect.y + 1
      : tabContainerRect.y + tabContainerRect.height / 2,
    dropEffect: "move",
  };
}

function triggerClickOn(target, options) {
  let promise = BrowserTestUtils.waitForEvent(target, "click");
  if (AppConstants.platform == "macosx") {
    options = {
      metaKey: options.ctrlKey,
      shiftKey: options.shiftKey,
    };
  }
  EventUtils.synthesizeMouseAtCenter(target, options);
  return promise;
}

/**
 * Removes a tab group (along with its tabs). Resolves when the tab group
 * is gone.
 *
 * @param {MozTabbrowserTabGroup} group
 * @returns {Promise<void>}
 */
async function removeTabGroup(group) {
  return TabGroupTestUtils.removeTabGroup(group);
}
