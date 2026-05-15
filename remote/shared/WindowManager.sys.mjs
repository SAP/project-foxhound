/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  URILoadingHelper: "resource:///modules/URILoadingHelper.sys.mjs",

  AnimationFramePromise: "chrome://remote/content/shared/Sync.sys.mjs",
  AppInfo: "chrome://remote/content/shared/AppInfo.sys.mjs",
  BiMap: "chrome://remote/content/shared/BiMap.sys.mjs",
  BrowsingContextListener:
    "chrome://remote/content/shared/listeners/BrowsingContextListener.sys.mjs",
  ChromeWindowListener:
    "chrome://remote/content/shared/listeners/ChromeWindowListener.sys.mjs",
  DebounceCallback: "chrome://remote/content/marionette/sync.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  EventPromise: "chrome://remote/content/shared/Sync.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  TimedPromise: "chrome://remote/content/shared/Sync.sys.mjs",
  UserContextManager:
    "chrome://remote/content/shared/UserContextManager.sys.mjs",
  waitForObserverTopic: "chrome://remote/content/marionette/sync.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () => lazy.Log.get());

// Timeout used to abort fullscreen, maximize, and minimize
// commands if no window manager is present.
const TIMEOUT_NO_WINDOW_MANAGER = 5000;

/**
 * Provides helpers to interact with Window objects.
 *
 * @class WindowManager
 */
class WindowManager {
  #chromeWindowListener;
  #clientWindowIds;
  #contextListener;
  #contextToWindowMap;
  #tracking;

  constructor() {
    /**
     * Keep track of the client window for any registered contexts. When the
     * contextDestroyed event is fired, the context is already destroyed so
     * we cannot query for the client window at that time.
     */
    this.#clientWindowIds = new lazy.BiMap();

    // For content browsing contexts, the embedder element may already be
    // gone by the time when it is getting discarded. To ensure we can still
    // retrieve the corresponding chrome window, we maintain a mapping from
    // each top-level content browsing context to its chrome window.
    this.#contextToWindowMap = new WeakMap();
    this.#contextListener = new lazy.BrowsingContextListener();

    this.#tracking = false;

    this.#chromeWindowListener = new lazy.ChromeWindowListener();
  }

  destroy() {
    this.stopTracking();
  }

  startTracking() {
    if (this.#tracking) {
      return;
    }

    this.#chromeWindowListener.on("closed", this.#onChromeWindowClosed);
    this.#chromeWindowListener.on("opened", this.#onChromeWindowOpened);
    this.#chromeWindowListener.startListening();

    this.#contextListener.on("attached", this.#onContextAttached);
    this.#contextListener.startListening();

    // Pre-fill the internal window id mapping.
    this.windows.forEach(window => this.getIdForWindow(window));

    this.#tracking = true;
  }

  stopTracking() {
    if (!this.#tracking) {
      return;
    }

    this.#chromeWindowListener.stopListening();
    this.#chromeWindowListener.off("closed", this.#onChromeWindowClosed);
    this.#chromeWindowListener.off("opened", this.#onChromeWindowOpened);

    this.#contextListener.stopListening();
    this.#contextListener.off("attached", this.#onContextAttached);

    this.#clientWindowIds = new lazy.BiMap();
    this.#contextToWindowMap = new WeakMap();

    this.#tracking = false;
  }

  /**
   * Retrieve all the open windows.
   *
   * @returns {Array<Window>}
   *     All the open windows. Will return an empty list if no window is open.
   */
  get windows() {
    const windows = [];

    for (const win of Services.wm.getEnumerator(null)) {
      if (win.closed) {
        continue;
      }
      windows.push(win);
    }

    return windows;
  }

  /**
   * Retrieves an id for the given chrome window. The id is a dynamically
   * generated uuid by the WindowManager and associated with the
   * top-level browsing context of that chrome window.
   *
   * @param {ChromeWindow} win
   *     The chrome window for which we want to retrieve the id.
   *
   * @returns {string|null}
   *     The unique id for this chrome window or `null` if not a valid window.
   */
  getIdForWindow(win) {
    if (win) {
      return this.#clientWindowIds.getOrInsert(win);
    }

    return null;
  }

  /**
   * Retrieve the Chrome Window corresponding to the provided window id.
   *
   * @param {string} id
   *     A unique id for the chrome window.
   *
   * @returns {ChromeWindow|undefined}
   *     The chrome window found for this id, `null` if none
   *     was found.
   */
  getWindowById(id) {
    return this.#clientWindowIds.getObject(id);
  }

  /**
   * Close the specified window.
   *
   * @param {window} win
   *     The window to close.
   * @returns {Promise}
   *     A promise which is resolved when the current window has been closed.
   */
  async closeWindow(win) {
    const destroyed = lazy.waitForObserverTopic("xul-window-destroyed", {
      checkFn: () => win && win.closed,
    });

    win.close();

    return destroyed;
  }

  /**
   * Adjusts the window geometry.
   *
   *@param {window} win
   *     The browser window to adjust.
   * @param {number} x
   *     The x-coordinate of the window.
   * @param {number} y
   *     The y-coordinate of the window.
   * @param {number} width
   *     The width of the window.
   * @param {number} height
   *     The height of the window.
   *
   * @returns {Promise}
   *     A promise that resolves when the window geometry has been adjusted.
   *
   * @throws {TimeoutError}
   *     Raised if the operating system fails to honor the requested move or resize.
   */
  async adjustWindowGeometry(win, x, y, width, height) {
    // we find a matching position on e.g. resize, then resolve, then a geometry
    // change comes in, then the window pos listener runs, we might try to
    // incorrectly reset the position without this check.
    let foundMatch = false;

    function geometryMatches() {
      lazy.logger.trace(
        `Checking window geometry ${win.outerWidth}x${win.outerHeight} @ (${win.screenX}, ${win.screenY})`
      );

      if (foundMatch) {
        lazy.logger.trace(`Already found a previous match for this request`);
        return true;
      }

      let sizeMatches = true;
      let posMatches = true;

      if (
        width !== null &&
        height !== null &&
        (win.outerWidth !== width || win.outerHeight !== height)
      ) {
        sizeMatches = false;
      }

      // Wayland doesn't support getting the window position.
      if (
        x !== null &&
        y !== null &&
        (win.screenX !== x || win.screenY !== y)
      ) {
        if (lazy.AppInfo.isWayland) {
          lazy.logger.info(
            `Wayland doesn't support setting the window position`
          );
        } else {
          posMatches = false;
        }
      }

      if (sizeMatches && posMatches) {
        lazy.logger.trace(`Requested window geometry matches`);
        foundMatch = true;
        return true;
      }

      return false;
    }

    if (!geometryMatches()) {
      // There might be more than one resize or MozUpdateWindowPos event due
      // to previous geometry changes, such as from restoreWindow(), so
      // wait longer if window geometry does not match.
      const options = {
        checkFn: geometryMatches,
        timeout: 500,
      };
      const promises = [];

      const resize = width !== null && height !== null;
      if (resize) {
        promises.push(new lazy.EventPromise(win, "resize", options));
      }

      // Wayland doesn't support setting the window position.
      const move = !lazy.AppInfo.isWayland && x !== null && y !== null;
      if (move) {
        promises.push(
          new lazy.EventPromise(win.windowRoot, "MozUpdateWindowPos", options)
        );
      }

      if (move && resize) {
        win.moveResize(x, y, width, height);
      } else if (move) {
        win.moveTo(x, y);
      } else if (resize) {
        win.resizeTo(width, height);
      }

      try {
        await Promise.race(promises);
      } catch (e) {
        if (e instanceof lazy.error.TimeoutError) {
          // The operating system might not honor the move or resize, in which
          // case assume that geometry will have been adjusted "as close as
          // possible" to that requested.  There may be no event received if the
          // geometry is already as close as possible.
        } else {
          throw e;
        }
      }
    }
  }

  /**
   * Focus the specified window.
   *
   * @param {window} win
   *     The window to focus.
   * @returns {Promise}
   *     A promise which is resolved when the window has been focused.
   */
  async focusWindow(win) {
    if (Services.focus.activeWindow != win) {
      let activated = new lazy.EventPromise(win, "activate");
      let focused = new lazy.EventPromise(win, "focus", { capture: true });

      win.focus();

      await Promise.all([activated, focused]);
    }
  }

  /**
   * Returns the chrome window for a specific browsing context.
   *
   * @param {BrowsingContext} context
   *    The browsing context for which we want to retrieve the window.
   *
   * @returns {ChromeWindow|null}
   *    The chrome window associated with the browsing context.
   *    Otherwise `null` is returned.
   */
  getChromeWindowForBrowsingContext(context) {
    if (!context.isContent) {
      // Chrome browsing contexts always have a chrome window set.
      return context.topChromeWindow;
    }

    if (this.#contextToWindowMap.has(context.top)) {
      return this.#contextToWindowMap.get(context.top);
    }

    return this.#setChromeWindowForBrowsingContext(context);
  }

  /**
   * Open a new browser window.
   *
   * @param {object=} options
   * @param {boolean=} options.focus
   *     If true, the opened window will receive the focus. Defaults to false.
   * @param {boolean=} options.isPrivate
   *     If true, the opened window will be a private window. Defaults to false.
   * @param {ChromeWindow=} options.openerWindow
   *     Use this window as the opener of the new window. Defaults to the
   *     topmost window.
   * @param {string=} options.userContextId
   *     The id of the user context which should own the initial tab of the new
   *     window.
   *
   * @returns {Promise<ChromeWindow>}
   *     A promise resolving to the newly created chrome window.
   *
   * @throws {UnsupportedOperationError}
   *     When opening a new browser window is not supported.
   */
  async openBrowserWindow(options = {}) {
    let {
      focus = false,
      isPrivate = false,
      openerWindow = null,
      userContextId = null,
    } = options;

    switch (lazy.AppInfo.name) {
      case "Firefox": {
        if (openerWindow === null) {
          // If no opener was provided, fallback to the topmost window.
          openerWindow = Services.wm.getMostRecentBrowserWindow();
        }

        if (!openerWindow) {
          throw new lazy.error.UnsupportedOperationError(
            `openWindow() could not find a valid opener window`
          );
        }

        // Open new browser window, and wait until it is fully loaded.
        // Also wait for the window to be focused and activated to prevent a
        // race condition when promptly focusing to the original window again.
        const browser = await new Promise(resolveOnContentBrowserCreated =>
          lazy.URILoadingHelper.openTrustedLinkIn(
            openerWindow,
            "about:blank",
            "window",
            {
              private: isPrivate,
              resolveOnContentBrowserCreated,
              userContextId:
                lazy.UserContextManager.getInternalIdById(userContextId),
            }
          )
        );

        // TODO: Both for WebDriver BiDi and classic, opening a new window
        // should not run the focus steps. When focus is false we should avoid
        // focusing the new window completely. See Bug 1766329

        if (focus) {
          // Focus the currently selected tab.
          browser.focus();
        } else {
          // If the new window shouldn't get focused, set the
          // focus back to the opening window.
          await this.focusWindow(openerWindow);
        }

        const chromeWindow = browser.ownerGlobal;
        await this.waitForChromeWindowLoaded(chromeWindow);

        return chromeWindow;
      }

      default:
        throw new lazy.error.UnsupportedOperationError(
          `openWindow() not supported in ${lazy.AppInfo.name}`
        );
    }
  }

  supportsWindows() {
    return !lazy.AppInfo.isAndroid;
  }

  /**
   * Minimize the specified window.
   *
   * @param {window} win
   *     The window to minimize.
   *
   * @returns {Promise}
   *     A promise resolved when the window is minimized, or times out if no window manager is present.
   */
  async minimizeWindow(win) {
    if (WindowState.from(win.windowState) != WindowState.Minimized) {
      await waitForWindowState(win, () => win.minimize());
    }
  }

  /**
   * Maximize the specified window.
   *
   * @param {window} win
   *     The window to maximize.
   *
   * @returns {Promise}
   *     A promise resolved when the window is maximized, or times out if no window manager is present.
   */
  async maximizeWindow(win) {
    if (WindowState.from(win.windowState) != WindowState.Maximized) {
      await waitForWindowState(win, () => win.maximize());
    }
  }

  /**
   * Restores the specified window to its normal state.
   *
   * @param {window} win
   *     The window to restore.
   *
   * @returns {Promise}
   *     A promise resolved when the window is restored, or times out if no window manager is present.
   */
  async restoreWindow(win) {
    if (WindowState.from(win.windowState) !== WindowState.Normal) {
      await waitForWindowState(win, () => win.restore());
    }
  }

  /**
   * Sets the fullscreen state of the specified window.
   *
   * @param {window} win
   *     The target window.
   * @param {boolean} enable
   *     Whether to enter fullscreen (true) or exit fullscreen (false).
   *
   * @returns {Promise}
   *     A promise resolved when the window enters or exits fullscreen mode.
   */
  async setFullscreen(win, enable) {
    const isFullscreen =
      WindowState.from(win.windowState) === WindowState.Fullscreen;
    if (enable !== isFullscreen) {
      await waitForWindowState(win, () => (win.fullScreen = enable));
    }
  }

  /**
   * Wait until the browser window is initialized and loaded.
   *
   * @param {ChromeWindow} window
   *     The chrome window to check for completed loading.
   *
   * @returns {Promise}
   *     A promise that resolves when the chrome window finished loading.
   */
  async waitForChromeWindowLoaded(window) {
    const loaded =
      window.document.readyState === "complete" &&
      !window.document.isUncommittedInitialDocument;

    if (!loaded) {
      lazy.logger.trace(
        `Chrome window not loaded yet. Waiting for "load" event`
      );
      await new lazy.EventPromise(window, "load");
    }

    // Only Firefox stores the delayed startup finished status, allowing
    // it to be checked at any time. On Android, this is unnecessary
    // because there is only a single window, and we already wait for
    // that window during startup.
    if (
      lazy.AppInfo.isFirefox &&
      window.document.documentURI === AppConstants.BROWSER_CHROME_URL &&
      !(window.gBrowserInit && window.gBrowserInit.delayedStartupFinished)
    ) {
      lazy.logger.trace(
        `Browser window not initialized yet. Waiting for startup finished`
      );

      // If it's a browser window wait for it to be fully initialized.
      await lazy.waitForObserverTopic("browser-delayed-startup-finished", {
        checkFn: subject => subject === window,
      });
    }
  }

  #setChromeWindowForBrowsingContext(context) {
    const chromeWindow = context.top.embedderElement?.ownerGlobal;
    if (chromeWindow) {
      return this.#contextToWindowMap.getOrInsert(context.top, chromeWindow);
    }

    return null;
  }

  /* Event handlers */

  #onContextAttached = (_, data = {}) => {
    const { browsingContext } = data;

    if (!browsingContext.isContent) {
      return;
    }

    this.#setChromeWindowForBrowsingContext(browsingContext);
  };

  #onChromeWindowClosed = (_, data = {}) => {
    const { window } = data;

    this.#clientWindowIds.deleteByObject(window);
  };

  #onChromeWindowOpened = (_, data = {}) => {
    const { window } = data;

    this.getIdForWindow(window);
  };
}

// Expose a shared singleton.
export const windowManager = new WindowManager();

/**
 * Representation of the {@link ChromeWindow} window state.
 *
 * @enum {string}
 */
export const WindowState = {
  Maximized: "maximized",
  Minimized: "minimized",
  Normal: "normal",
  Fullscreen: "fullscreen",

  /**
   * Converts {@link Window.windowState} to WindowState.
   *
   * @param {number} windowState
   *     Attribute from {@link Window.windowState}.
   *
   * @returns {WindowState}
   *     JSON representation.
   *
   * @throws {TypeError}
   *     If <var>windowState</var> was unknown.
   */
  from(windowState) {
    switch (windowState) {
      case 1:
        return WindowState.Maximized;

      case 2:
        return WindowState.Minimized;

      case 3:
        return WindowState.Normal;

      case 4:
        return WindowState.Fullscreen;

      default:
        throw new TypeError(`Unknown window state: ${windowState}`);
    }
  },
};

/**
 * Waits for the window to reach a specific state after invoking a callback.
 *
 * @param {window} win
 *     The target window.
 * @param {Function} callback
 *     The function to invoke to change the window state.
 *
 * @returns {Promise}
 *     A promise resolved when the window reaches the target state, or times out if no window manager is present.
 */
async function waitForWindowState(win, callback) {
  let cb;
  // Use a timed promise to abort if no window manager is present
  await new lazy.TimedPromise(
    resolve => {
      cb = new lazy.DebounceCallback(resolve);
      win.addEventListener("sizemodechange", cb);
      callback();
    },
    { throws: null, timeout: TIMEOUT_NO_WINDOW_MANAGER }
  );
  win.removeEventListener("sizemodechange", cb);
  await new lazy.AnimationFramePromise(win);
}
