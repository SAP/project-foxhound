/* global content */
const testContext = {
  scope: null,
  windowGlobal: null,
};

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const isMac = AppConstants.platform == "macosx";

export var DOMFullscreenTestUtils = {
  /**
   * Running this init allows helpers to access test scope helpers, like Assert
   * and SimpleTest.
   * Tests should call init() before using the helpers which rely on properties assigned here.
   *
   * @param {object} scope The global scope where tests are being run.
   * @param {Window} win The DOM Window global
   */
  init(scope, win) {
    if (!scope) {
      throw new Error(
        "Must initialize DOMFullscreenTestUtils with a test scope"
      );
    }
    if (!win) {
      throw new Error(
        "Must initialize DOMFullscreenTestUtils with a windowGlobal"
      );
    }
    testContext.scope = scope;
    testContext.windowGlobal = win;
    testContext.scope.registerCleanupFunction(() => {
      delete testContext.scope;
      delete testContext.windowGlobal;
    });
  },

  waitForFullScreenState(browser, state, actionAfterFSEvent) {
    return new Promise(resolve => {
      let eventReceived = false;

      let observe = () => {
        if (!eventReceived) {
          return;
        }
        Services.obs.removeObserver(observe, "fullscreen-painted");
        resolve();
      };
      Services.obs.addObserver(observe, "fullscreen-painted");

      browser.documentGlobal.addEventListener(
        `MozDOMFullscreen:${state ? "Entered" : "Exited"}`,
        () => {
          eventReceived = true;
          if (actionAfterFSEvent) {
            actionAfterFSEvent();
          }
        },
        { once: true }
      );
    });
  },

  /**
   * Spawns content task in browser to enter / leave fullscreen
   *
   * @param browser - Browser to use for JS fullscreen requests
   * @param {boolean} fullscreenState - true to enter fullscreen, false to leave
   * @param {object} fullscreenOptions - Options to be passed to requestFullscreen
   * @returns {Promise} - Resolves once fullscreen change is applied
   */
  async changeFullscreen(browser, fullScreenState, fullscreenOptions) {
    if (!testContext.scope) {
      throw new Error(
        "Must first initialize DOMFullscreenTestUtils with a test scope"
      );
    }
    await new Promise(resolve =>
      testContext.scope.SimpleTest.waitForFocus(resolve, browser.documentGlobal)
    );
    let fullScreenChange = DOMFullscreenTestUtils.waitForFullScreenState(
      browser,
      fullScreenState
    );
    if (!fullscreenOptions) {
      fullscreenOptions = {};
    }
    testContext.windowGlobal.SpecialPowers.spawn(
      browser,
      [fullScreenState, fullscreenOptions],
      async (state, options) => {
        // Wait for document focus before requesting full-screen
        const { ContentTaskUtils } = ChromeUtils.importESModule(
          "resource://testing-common/ContentTaskUtils.sys.mjs"
        );
        await ContentTaskUtils.waitForCondition(
          () => content.browsingContext.isActive && content.document.hasFocus(),
          "Waiting for document focus"
        );
        if (state) {
          content.document.body.requestFullscreen(options);
        } else {
          content.document.exitFullscreen();
        }
      }
    );
    return fullScreenChange;
  },

  /**
   * Valid attribute states for the fullscreen warning element.
   */
  warningStates: ["hidden", "ontop", "onscreen"],

  /**
   * Check that the fullscreen warning element has the expected state attribute.
   *
   * @param {MozBrowser} browser - Browser to get the fullscreen warning.
   * @param {string} expectedState - Expected state, one of warningStates.
   * @param {string} msg - Message prefix for test assertions.
   */
  checkWarningState(browser, expectedState, msg) {
    if (!testContext.scope) {
      throw new Error(
        "Must first initialize DOMFullscreenTestUtils with a test scope"
      );
    }
    if (!this.warningStates.includes(expectedState)) {
      throw new Error(`Invalid fullscreen warning state: ${expectedState}`);
    }
    let warning = browser.ownerDocument.getElementById("fullscreen-warning");
    this.warningStates.forEach(state => {
      testContext.scope.SimpleTest.is(
        warning.hasAttribute(state),
        state == expectedState,
        `${msg} - check ${state} attribute`
      );
    });
  },

  /**
   * Wait for the fullscreen warning to be in the expected state, and verify
   * the warning message if it's shown.
   *
   * @param {MozBrowser} browser - Browser to get the fullscreen warning.
   * @param {string} expectedState - one of "hidden", "ontop", "onscreen" state.
   * @param {boolean} isKeyboardLocked - true if keyboard is locked, false otherwise
   * @returns {Promise} - Resolves once fullscreen warning state is applied
   */
  async waitForWarningState(browser, expectedState, isKeyboardLocked = false) {
    if (!testContext.scope) {
      throw new Error(
        "Must first initialize DOMFullscreenTestUtils with a test scope"
      );
    }
    if (!this.warningStates.includes(expectedState)) {
      throw new Error(`Invalid fullscreen warning state: ${expectedState}`);
    }

    let warning = browser.ownerDocument.getElementById("fullscreen-warning");
    await testContext.scope.BrowserTestUtils.waitForAttribute(
      expectedState,
      warning,
      ""
    );
    this.checkWarningState(
      browser,
      expectedState,
      `Wait for ${expectedState} state`
    );

    // Wait for the next paint to ensure UI is ready.
    await new Promise(resolve => {
      testContext.windowGlobal.requestAnimationFrame(() => {
        testContext.windowGlobal.requestAnimationFrame(resolve);
      });
    });

    if (expectedState === "hidden") {
      return;
    }

    // Check whether the warning message is correct when it's shown.
    let exitBtn = warning.querySelector("#fullscreen-exit-button");
    let expectedBtnL10nId = `fullscreen${isKeyboardLocked ? "-keyboardlock" : ""}-exit${isMac ? "-mac" : ""}-button`;
    testContext.scope.SimpleTest.is(
      exitBtn.getAttribute("data-l10n-id"),
      expectedBtnL10nId
    );
  },
};
