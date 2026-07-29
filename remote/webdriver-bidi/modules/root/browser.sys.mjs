/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RootBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/RootBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  assert: "chrome://remote/content/shared/webdriver/Assert.sys.mjs",
  Certificates: "chrome://remote/content/shared/webdriver/Certificates.sys.mjs",
  DownloadBehaviorManager:
    "chrome://remote/content/webdriver-bidi/DownloadBehaviorManager.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  getWebDriverSessionById:
    "chrome://remote/content/shared/webdriver/Session.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  NavigableManager: "chrome://remote/content/shared/NavigableManager.sys.mjs",
  pprint: "chrome://remote/content/shared/Format.sys.mjs",
  ProxyConfiguration:
    "chrome://remote/content/shared/webdriver/Capabilities.sys.mjs",
  ProxyPerUserContextManager:
    "chrome://remote/content/webdriver-bidi/ProxyPerUserContextManager.sys.mjs",
  ProxyTypes: "chrome://remote/content/shared/webdriver/Capabilities.sys.mjs",
  RootMessageHandler:
    "chrome://remote/content/shared/messagehandler/RootMessageHandler.sys.mjs",
  SessionDataCategory:
    "chrome://remote/content/shared/messagehandler/sessiondata/SessionData.sys.mjs",
  TabManager: "chrome://remote/content/shared/TabManager.sys.mjs",
  UserContextManager:
    "chrome://remote/content/shared/UserContextManager.sys.mjs",
  windowManager: "chrome://remote/content/shared/WindowManager.sys.mjs",
  WindowState: "chrome://remote/content/shared/WindowManager.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () =>
  lazy.Log.get(lazy.Log.TYPES.WEBDRIVER_BIDI)
);

/**
 * An object that holds information about the client window
 *
 * @typedef ClientWindowInfo
 *
 * @property {boolean} active
 *    True if client window is keyboard-interactable. False, if
 *    otherwise.
 * @property {string} clientWindow
 *    The id of the client window.
 * @property {number} height
 *    The height of the client window.
 *  @property {WindowState} state
 *    The client window state.
 * @property {number} width
 *    The width of the client window.
 * @property {number} x
 *    The x-coordinate of the client window.
 * @property {number} y
 *    The y-coordinate of the client window.
 */

/**
 * Return value of the getClientWindows command.
 *
 * @typedef GetClientWindowsResult
 *
 * @property {Array<ClientWindowInfo>} clientWindows
 */

/**
 * Enum representing the possible named states of a client window.
 *
 * @readonly
 * @enum {ClientWindowNamedState}
 */
export const ClientWindowNamedState = {
  Fullscreen: "fullscreen",
  Maximized: "maximized",
  Minimized: "minimized",
  Normal: "normal",
};

/**
 * An object that holds information about a user context.
 *
 * @typedef UserContextInfo
 *
 * @property {string} userContext
 *     The id of the user context.
 */

/**
 * Return value for the getUserContexts command.
 *
 * @typedef GetUserContextsResult
 *
 * @property {Array<UserContextInfo>} userContexts
 *     Array of UserContextInfo for the current user contexts.
 */

/**
 * Enum of download behavior types supported by the browser.setDownloadBehavior
 * command.
 *
 * @readonly
 * @enum {DownloadBehaviorType}
 */
const DownloadBehaviorType = {
  allowed: "allowed",
  denied: "denied",
};

/**
 * Used as an argument for browser.setDownloadBehavior command
 * to represent an object which holds information about download behavior.
 *
 * @typedef DownloadBehavior
 *
 * @property {DownloadBehaviorType} type
 *     A type of download behavior to set.
 * @property {string=} destinationFolder
 *     Optional destination folder to save the downloaded file.
 */

class BrowserModule extends RootBiDiModule {
  #downloadBehaviorManager;
  #proxyManager;
  #userContextsWithInsecureCertificatesOverrides;

  constructor(messageHandler) {
    super(messageHandler);

    this.#downloadBehaviorManager = new lazy.DownloadBehaviorManager();

    this.#proxyManager = new lazy.ProxyPerUserContextManager();

    // A set of internal user context ids to keep track of user contexts
    // which had insecure certificates overrides set for them.
    this.#userContextsWithInsecureCertificatesOverrides = new Set();
  }

  destroy() {
    this.#downloadBehaviorManager.destroy();
    this.#downloadBehaviorManager = null;

    // Reset "allowInsecureCerts" for the userContexts,
    // which were created in the scope of this session.
    for (const userContext of this
      .#userContextsWithInsecureCertificatesOverrides) {
      lazy.Certificates.resetSecurityChecksForUserContext(userContext);
    }

    this.#userContextsWithInsecureCertificatesOverrides = null;

    this.#proxyManager.destroy();
  }

  /**
   * Commands
   */

  /**
   * Terminate all WebDriver sessions and clean up automation state in the
   * remote browser instance.
   *
   * The actual session clean-up and closing the browser will happen later
   * in WebDriverBiDiConnection class.
   */
  async close() {
    const session = lazy.getWebDriverSessionById(this.messageHandler.sessionId);

    // TODO Bug 1838269. Enable browser.close command for the case of classic + bidi session, when
    // session ending for this type of session is supported.
    if (session.http) {
      throw new lazy.error.UnsupportedOperationError(
        "Closing the browser in a session started with WebDriver classic" +
          ' is not supported. Use the WebDriver classic "Delete Session"' +
          " command instead which will also close the browser."
      );
    }

    // Close all open top-level browsing contexts by not prompting for beforeunload.
    for (const tab of lazy.TabManager.allTabs) {
      lazy.TabManager.removeTab(tab, { skipPermitUnload: true });
    }
  }

  /**
   * Returns a list of client windows info
   *
   * @returns {GetClientWindowsResult}
   *     The list of client windows info
   */
  async getClientWindows() {
    const clientWindowsIds = new Set();
    const clientWindows = [];

    for (const win of lazy.windowManager.windows) {
      let clientWindowId = lazy.windowManager.getIdForWindow(win);
      if (clientWindowsIds.has(clientWindowId)) {
        continue;
      }
      clientWindowsIds.add(clientWindowId);
      let clientWindowInfo = this.#getClientWindowInfo(win);
      clientWindows.push(clientWindowInfo);
    }

    return { clientWindows };
  }

  /**
   * Creates a user context.
   *
   * @param {object=} options
   * @param {boolean=} options.acceptInsecureCerts
   *     Indicates whether untrusted and self-signed TLS certificates
   *     should be implicitly trusted on navigation for this user context.
   * @param {object=} options.proxy
   *     An object which holds the proxy settings.
   *
   * @returns {UserContextInfo}
   *     UserContextInfo object for the created user context.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {UnsupportedOperationError}
   *     Raised when the command is called with unsupported proxy types.
   */
  async createUserContext(options = {}) {
    const { acceptInsecureCerts = null, proxy = null } = options;

    if (acceptInsecureCerts !== null) {
      lazy.assert.boolean(
        acceptInsecureCerts,
        lazy.pprint`Expected "acceptInsecureCerts" to be a boolean, got ${acceptInsecureCerts}`
      );
    }

    let proxyObject;
    if (proxy !== null) {
      proxyObject = lazy.ProxyConfiguration.fromJSON(proxy);

      if (
        proxyObject.proxyType === lazy.ProxyTypes.System ||
        proxyObject.proxyType === lazy.ProxyTypes.Autodetect ||
        proxyObject.proxyType === lazy.ProxyTypes.Pac
      ) {
        // Bug 1968887: Add support for "system", "autodetect" and "pac" proxy types.
        throw new lazy.error.UnsupportedOperationError(
          `Proxy type "${proxyObject.proxyType}" is not supported`
        );
      }
    }

    const userContextId = lazy.UserContextManager.createContext("webdriver");
    const internalId = lazy.UserContextManager.getInternalIdById(userContextId);

    if (acceptInsecureCerts !== null) {
      this.#userContextsWithInsecureCertificatesOverrides.add(internalId);
      if (acceptInsecureCerts) {
        lazy.Certificates.disableSecurityChecks(internalId);
      } else {
        lazy.Certificates.enableSecurityChecks(internalId);
      }
    }

    if (proxy !== null) {
      this.#proxyManager.addConfiguration(internalId, proxyObject);
    }

    return { userContext: userContextId };
  }

  /**
   * Returns the list of available user contexts.
   *
   * @returns {GetUserContextsResult}
   *     Object containing an array of UserContextInfo.
   */
  async getUserContexts() {
    const userContexts = lazy.UserContextManager.getUserContextIds().map(
      userContextId => ({
        userContext: userContextId,
      })
    );

    return { userContexts };
  }

  /**
   * Set the download behavior globally or per user context.
   *
   * @param {object=} options
   * @param {DownloadBehavior|null} options.downloadBehavior
   *     The download behavior configuration, or null to reset.
   * @param {Array<string>=} options.userContexts
   *     Optional list of user context ids to apply the behavior to.
   *     If not provided the download behavior configuration will
   *     apply globally.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {NoSuchUserContextError}
   *     Raised if a user context id could not be found.
   */
  async setDownloadBehavior(options = {}) {
    const {
      downloadBehavior = undefined,
      userContexts: userContextIds = undefined,
    } = options;
    let behavior = null;

    if (downloadBehavior !== null) {
      lazy.assert.object(
        downloadBehavior,
        lazy.pprint`Expected "downloadBehavior" to be an object or null, got ${downloadBehavior}`
      );

      const type = downloadBehavior.type;
      lazy.assert.string(
        type,
        lazy.pprint`Expected "type" to be a string, got ${type}`
      );

      const behaviorTypes = Object.values(DownloadBehaviorType);
      lazy.assert.that(
        value => behaviorTypes.includes(value),
        lazy.pprint`Expected "type" to be one of ${behaviorTypes}, got ${type}`
      )(type);

      behavior = { allowed: type === "allowed" };

      if (behavior.allowed && "destinationFolder" in downloadBehavior) {
        const destinationFolder = downloadBehavior.destinationFolder;
        lazy.assert.string(
          destinationFolder,
          lazy.pprint`Expected "destinationFolder" to be a string, got ${destinationFolder}`
        );

        behavior.destinationFolder = destinationFolder;
      }
    }

    const userContexts = new Set();

    if (userContextIds !== undefined) {
      lazy.assert.isNonEmptyArray(
        userContextIds,
        lazy.pprint`Expected "userContexts" to be a non-empty array, got ${userContextIds}`
      );

      for (const userContextId of userContextIds) {
        lazy.assert.string(
          userContextId,
          lazy.pprint`Expected elements of "userContexts" to be strings, got ${userContextId}`
        );

        const internalId =
          lazy.UserContextManager.getInternalIdById(userContextId);

        if (internalId === null) {
          throw new lazy.error.NoSuchUserContextError(
            `User Context with id ${userContextId} was not found`
          );
        }

        userContexts.add(internalId);
      }

      for (const userContext of userContexts) {
        this.#downloadBehaviorManager.setUserContextBehavior(
          userContext,
          behavior
        );
      }
    } else {
      this.#downloadBehaviorManager.setDefaultBehavior(behavior);
    }

    // Apply configuration to set the download folder override to a BrowsingContext instance.
    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: false,
        category: lazy.SessionDataCategory.DownloadBehaviorOverride,
        resetValue: null,
        supportsGlobalConfiguration: true,
        userContextIds,
        // Store the whole "behavior" object to ensure that reset logic works correctly.
        value: behavior,
      },
    });
  }

  /**
   * Closes a user context and all browsing contexts in it without running
   * beforeunload handlers.
   *
   * @param {object=} options
   * @param {string} options.userContext
   *     Id of the user context to close.
   *
   * @throws {InvalidArgumentError}
   *     Raised if an argument is of an invalid type or value.
   * @throws {NoSuchUserContextError}
   *     Raised if the user context id could not be found.
   */
  async removeUserContext(options = {}) {
    const { userContext: userContextId } = options;

    lazy.assert.string(
      userContextId,
      lazy.pprint`Expected "userContext" to be a string, got ${userContextId}`
    );

    if (userContextId === lazy.UserContextManager.defaultUserContextId) {
      throw new lazy.error.InvalidArgumentError(
        `Default user context cannot be removed`
      );
    }

    if (!lazy.UserContextManager.hasUserContextId(userContextId)) {
      throw new lazy.error.NoSuchUserContextError(
        `User Context with id ${userContextId} was not found`
      );
    }

    const internalId = lazy.UserContextManager.getInternalIdById(userContextId);

    lazy.UserContextManager.removeUserContext(userContextId, {
      closeContextTabs: true,
    });

    // Reset the state to clean up the platform state.
    lazy.Certificates.resetSecurityChecksForUserContext(internalId);
    this.#userContextsWithInsecureCertificatesOverrides.delete(internalId);

    this.#proxyManager.deleteConfiguration(internalId);

    this.#downloadBehaviorManager.setUserContextBehavior(internalId, null);
  }

  /**
   * Sets the position and dimension of a client window.
   *
   * @param {object=} options
   * @param {string} options.clientWindow
   *    The id of the client window to update.
   * @param {ClientWindowNamedState} options.state
   *    The target state of the client window.
   * @param {number=} options.width
   *    The target width of the client window.
   * @param {number=} options.height
   *    The target height of the client window.
   * @param {number=} options.x
   *    The target x-coordinate of the client window.
   * @param {number=} options.y
   *    The target y-coordinate of the client window.
   *
   * @returns {ClientWindowInfo}
   *    The client window info.
   *
   * @throws {InvalidArgumentError}
   *    Raised if an argument is of an invalid type or value.
   * @throws {NoSuchClientWindow}
   *    Raised if the client window could not be found.
   * @throws {UnsupportedOperationError}
   *     Raised when the command is not supported.
   */
  async setClientWindowState(options = {}) {
    const { clientWindow, height, state, width, x, y } = options;

    lazy.assert.string(
      clientWindow,
      lazy.pprint`Expected "clientWindow" to be a string, got ${clientWindow}`
    );

    const window = lazy.windowManager.getWindowById(clientWindow);
    if (!window) {
      throw new lazy.error.NoSuchClientWindow(
        `Client window with id ${clientWindow} not found`
      );
    }

    const windowStateValues = Object.values(lazy.WindowState);
    if (!windowStateValues.includes(state)) {
      throw new lazy.error.InvalidArgumentError(
        `Expected "state" to be one of ${windowStateValues}, got ${state}`
      );
    }

    if (x !== undefined) {
      lazy.assert.integer(
        x,
        lazy.pprint`Expected "x" to be an integer, got ${x}`
      );
    }

    if (y !== undefined) {
      lazy.assert.integer(
        y,
        lazy.pprint`Expected "y" to be an integer, got ${y}`
      );
    }

    if (width !== undefined) {
      lazy.assert.positiveInteger(
        width,
        lazy.pprint`Expected "width" to be a positive integer, got ${width}`
      );
    }

    if (height !== undefined) {
      lazy.assert.positiveInteger(
        height,
        lazy.pprint`Expected "height" to be a positive integer, got ${height}`
      );
    }

    // Window position and size cannot be modified on mobile.
    lazy.assert.desktop();

    await this.#setClientWindowState(window, state);

    if (state === lazy.WindowState.Normal) {
      await lazy.windowManager.adjustWindowGeometry(
        window,
        x ?? null,
        y ?? null,
        width ?? null,
        height ?? null
      );
    }

    return this.#getClientWindowInfo(window);
  }

  #getClientWindowInfo(window) {
    const { height, width, x, y } = lazy.windowManager.getWindowRect(window);

    return {
      active: Services.focus.activeWindow === window,
      clientWindow: lazy.windowManager.getIdForWindow(window),
      height,
      state: lazy.WindowState.from(window.windowState),
      width,
      x,
      y,
    };
  }

  async #setClientWindowState(window, state) {
    const currentState = lazy.WindowState.from(window.windowState);
    const specialWindowStates = [
      lazy.WindowState.Fullscreen,
      lazy.WindowState.Maximized,
      lazy.WindowState.Minimized,
    ];

    if (specialWindowStates.includes(currentState) && currentState === state) {
      // Only continue if we actually switch between special window states.
      return null;
    }

    switch (state) {
      case lazy.WindowState.Fullscreen:
        await lazy.windowManager.fullscreenWindow(window);
        break;
      case lazy.WindowState.Maximized:
        await lazy.windowManager.maximizeWindow(window);
        break;
      case lazy.WindowState.Minimized:
        await lazy.windowManager.minimizeWindow(window);
        break;
    }

    return null;
  }
}

export const setDownloadFolderOverrideForBrowsingContext = options => {
  const { context, value } = options;
  const destinationFolder =
    value && "destinationFolder" in value ? value.destinationFolder : "";

  context.downloadFolderOverride = destinationFolder;

  const contextId = lazy.NavigableManager.getIdForBrowsingContext(context);
  lazy.logger.trace(
    `[${contextId}] ` + destinationFolder === ""
      ? "Reset download folder to default"
      : `Updated download folder override to: ${destinationFolder}`
  );
};

// To export the class as lower-case
export const browser = BrowserModule;
