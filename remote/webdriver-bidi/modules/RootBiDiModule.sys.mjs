/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Module } from "chrome://remote/content/shared/messagehandler/Module.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  assert: "chrome://remote/content/shared/webdriver/Assert.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  NavigableManager: "chrome://remote/content/shared/NavigableManager.sys.mjs",
  WindowGlobalMessageHandler:
    "chrome://remote/content/shared/messagehandler/WindowGlobalMessageHandler.sys.mjs",
});

export class RootBiDiModule extends Module {
  /**
   * Emits an event for a specific browsing context.
   *
   * @param {string} browsingContextId
   *     The ID of the browsing context to which the event should be emitted.
   * @param {string} eventName
   *     The name of the event to be emitted.
   * @param {object} eventPayload
   *     The payload to be sent with the event.
   *
   * @returns {boolean}
   *     Returns `true` if the event was successfully emitted, otherwise `false`.
   */
  _emitEventForBrowsingContext(browsingContextId, eventName, eventPayload) {
    return this._emitEventForBrowsingContexts(
      [browsingContextId],
      eventName,
      eventPayload
    );
  }

  /**
   * Emits an event for a set of related browsing contexts.
   *
   * @param {Array<string>} browsingContextIds
   *     An array of browsing context ids to which the event is related.
   * @param {string} eventName
   *     The name of the event to be emitted.
   * @param {object} eventPayload
   *     The payload to be sent with the event.
   *
   * @returns {boolean}
   *     Returns `true` if the event was successfully emitted, otherwise `false`.
   */
  _emitEventForBrowsingContexts(browsingContextIds, eventName, eventPayload) {
    // This event is emitted from the parent process but for a given browsing
    // context. Set the event's contextInfo to the message handler corresponding
    // to this browsing context.
    const relatedContexts = browsingContextIds.map(contextId => ({
      contextId,
      type: lazy.WindowGlobalMessageHandler.type,
    }));
    return this.emitEvent(eventName, eventPayload, relatedContexts);
  }

  /**
   * Retrieves a browsing context based on its navigable id.
   *
   * @see https://w3c.github.io/webdriver-bidi/#get-a-navigable
   *
   * @param {string} navigableId
   *     Unique id of the browsing context.
   * @param {object=} options
   * @param {boolean=} options.supportsChromeScope
   *     If set to `true` chrome browsing contexts are supported
   *     for the BiDi command. Defaults to `false`.
   *
   * @returns {BrowsingContext|null}
   *     The browsing context, or null if `navigableId` is null.
   *
   * @throws {NoSuchFrameError}
   *     If the browsing context cannot be found.
   */
  _getNavigable(navigableId, options = {}) {
    const { supportsChromeScope = false } = options;

    if (navigableId === null) {
      // The WebDriver BiDi specification expects `null` to be
      // returned if navigable id is `null`.
      return null;
    }

    const context = lazy.NavigableManager.getBrowsingContextById(navigableId);

    if (context && !context.isContent) {
      lazy.assert.hasSystemAccess();

      if (!supportsChromeScope) {
        throw new lazy.error.UnsupportedOperationError(
          "The command does not support browsing contexts in privileged (chrome) scope"
        );
      }
    }

    if (context === null) {
      throw new lazy.error.NoSuchFrameError(
        `Browsing Context with id ${navigableId} not found`
      );
    }

    return context;
  }

  /**
   * Checks if there is a listener for a specific event and context information.
   *
   * @param {string} eventName
   *     The name of the event to check for listeners.
   * @param {ContextInfo} contextInfo
   *     The context information to check for listeners within.
   * @returns {boolean}
   *     Returns `true` if there is at least one listener for the specified event and context, otherwise `false`.
   */
  _hasListener(eventName, contextInfo) {
    return this.messageHandler.eventsDispatcher.hasListener(
      eventName,
      contextInfo
    );
  }

  /**
   * Forwards a command to the windowglobal module corresponding to the provided
   * browsing context id, using the same module name as the current one.
   *
   * @param {string} commandName
   *     The name of the command to execute.
   * @param {number} browsingContextID
   *     The debuggable context ID.
   * @param {object} params
   *    Any command parameters to pass.
   * @param {object=} args
   *     Any additional command arguments to pass.
   * @returns {Promise}
   *     A Promise that will resolve with the return value of the
   *     command once it has been executed.
   */
  _forwardToWindowGlobal(commandName, browsingContextID, params, args = {}) {
    return this.messageHandler.forwardCommand({
      moduleName: this.moduleName,
      commandName,
      destination: {
        type: lazy.WindowGlobalMessageHandler.type,
        id: browsingContextID,
      },
      ...args,
      params,
    });
  }
}
