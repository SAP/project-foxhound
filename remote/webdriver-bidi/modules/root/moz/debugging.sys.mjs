/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RootBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/RootBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  assert: "chrome://remote/content/shared/webdriver/Assert.sys.mjs",
  ContextDescriptorType:
    "chrome://remote/content/shared/messagehandler/MessageHandler.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  generateUUID: "chrome://remote/content/shared/UUID.sys.mjs",
  pprint: "chrome://remote/content/shared/Format.sys.mjs",
  RootMessageHandler:
    "chrome://remote/content/shared/messagehandler/RootMessageHandler.sys.mjs",
  SessionDataMethod:
    "chrome://remote/content/shared/messagehandler/sessiondata/SessionData.sys.mjs",
});

const NULL = Symbol("NULL");

class DebuggingModule extends RootBiDiModule {
  #breakpointIdMap;

  constructor(messageHandler) {
    super(messageHandler);
    this.#breakpointIdMap = new Map();
  }

  destroy() {
    this.#breakpointIdMap = null;
  }

  /**
   * An object that identifies the location of a breakpoint via url, line and
   * column information.
   *
   * @typedef BreakpointLocation
   *
   * @property {number=} column
   *    The column of the breakpoint location. (optional)
   * @property {number} line
   *    The line of the breakpoint location.
   * @property {string} url
   *    The URL (as a string) of the script where the breakpoint is located.
   */

  /**
   * An object that holds the result of moz:debugging.listScripts command.
   *
   * @typedef ListScriptsResult
   *
   * @property {Array<string>} scripts
   *    Array of URLs corresponding to available scripts.
   */

  /**
   * Retrieve the source text of a script at the provided URL and for a specific
   * navigable.
   *
   * Note: this will not fetch the source at the provided URL, but will read the
   * script known by the debugger attached to the global of the navigable.
   * This means the script needs to be currently loaded for the global and not
   * garbage collected.
   *
   * @param {object=} options
   * @param {string} options.context
   *     The id of the navigable where the source should be retrieved.
   * @param {string} options.scriptUrl
   *     The URL of the script for which the source should be retrieved.
   *
   * @returns {string}
   *     The source text of the script.
   */
  async getScriptSource(options = {}) {
    const { context: contextId, scriptUrl } = options;

    lazy.assert.string(
      contextId,
      lazy.pprint`Expected "context" to be a string, got ${contextId}`
    );
    const context = this._getNavigable(contextId);

    lazy.assert.string(
      scriptUrl,
      lazy.pprint`Expected "scriptUrl" to be a string, got ${scriptUrl}`
    );

    return this._forwardToWindowGlobal("_getScriptSource", context.id, {
      scriptUrl,
    });
  }

  /**
   * Retrieve the list of script URLs known by a specific navigable.
   *
   * @param {object=} options
   * @param {string} options.context
   *     The id of the navigable where the scripts should be retrieved.
   * @returns {ListScriptsResult}
   *     An object which holds the list of scripts currently loaded for the
   *     provided navigable.
   */
  async listScripts(options = {}) {
    const { context: contextId } = options;

    lazy.assert.string(
      contextId,
      lazy.pprint`Expected "context" to be a string, got ${contextId}`
    );
    const context = this._getNavigable(contextId);

    return this._forwardToWindowGlobal("_listScripts", context.id, {});
  }

  /**
   * Remove an existing breakpoint by breakpoint id.
   *
   * @param {object=} options
   * @param {string} options.breakpoint
   *     The id of the breakpoint to remove.
   */
  async removeBreakpoint(options = {}) {
    const { breakpoint: breakpointId } = options;

    lazy.assert.string(
      breakpointId,
      lazy.pprint`Expected "breakpointId" to be a string, got ${breakpointId}`
    );

    const breakpointData = this.#breakpointIdMap.get(breakpointId);
    if (!breakpointData) {
      throw new lazy.error.InvalidArgumentError(
        `Breakpoint with id ${breakpointId} not found`
      );
    }

    this.#breakpointIdMap.delete(breakpointId);
    await this.messageHandler.updateSessionData([
      {
        method: lazy.SessionDataMethod.Remove,
        moduleName: "moz:debugging",
        category: "breakpoint",
        contextDescriptor: {
          type: lazy.ContextDescriptorType.All,
        },
        values: [breakpointData],
      },
    ]);
  }

  /**
   * Resume the execution on the currently paused frame for the provided
   * navigable.
   *
   * @param {object=} options
   * @param {string} options.context
   *     The id of the navigable where the debugger is paused.
   */
  async resume(options = {}) {
    const { context: contextId } = options;

    lazy.assert.string(
      contextId,
      lazy.pprint`Expected "context" to be a string, got ${contextId}`
    );
    const context = this._getNavigable(contextId);

    await this._forwardToWindowGlobal("_resume", context.id, {});
  }

  /**
   * Step over to the next instruction on the currently paused frame for the
   * provided navigable.
   *
   * @param {object=} options
   * @param {string} options.context
   *     The id of the navigable where the debugger is paused.
   */
  async stepOver(options = {}) {
    const { context: contextId } = options;

    lazy.assert.string(
      contextId,
      lazy.pprint`Expected "context" to be a string, got ${contextId}`
    );
    const context = this._getNavigable(contextId);

    await this._forwardToWindowGlobal("_stepOver", context.id, {});
  }

  /**
   * Step into the function call at the current paused location.
   *
   * @param {object=} options
   * @param {string} options.context
   *     The id of the navigable where the debugger is paused.
   */
  async stepInto(options = {}) {
    const { context: contextId } = options;

    lazy.assert.string(
      contextId,
      lazy.pprint`Expected "context" to be a string, got ${contextId}`
    );
    const context = this._getNavigable(contextId);

    await this._forwardToWindowGlobal("_stepInto", context.id, {});
  }

  /**
   * Step out of the frame for the current paused location.
   *
   * @param {object=} options
   * @param {string} options.context
   *     The id of the navigable where the debugger is paused.
   */
  async stepOut(options = {}) {
    const { context: contextId } = options;

    lazy.assert.string(
      contextId,
      lazy.pprint`Expected "context" to be a string, got ${contextId}`
    );
    const context = this._getNavigable(contextId);

    await this._forwardToWindowGlobal("_stepOut", context.id, {});
  }

  /**
   * Set a breakpoint at the provided breakpoint location.
   * The breakpoint location contains a URL, line offset and optional column
   * offset.
   *
   * If any script on a context where debugging is enabled matches the
   * breakpoint location, the breakpoint will be set immediately.
   *
   * Whenever a new script becomes available on a context where debugging is
   * enabled, all active breakpoints will be checked against this script and set
   * if applicable.
   *
   * @param {object=} options
   * @param {BreakpointLocation} options.location
   *     The requested location for setting the new breakpoint
   * @returns {object}
   *     An object with the following property:
   *     - breakpoint {string} The unique id of the breakpoint.
   */
  async setBreakpoint(options = {}) {
    const { location } = options;

    lazy.assert.object(
      location,
      lazy.pprint`Expected "location" to be an object, got ${location}`
    );

    const { url, line, column = NULL } = location;

    if (column != NULL) {
      lazy.assert.positiveInteger(
        column,
        lazy.pprint`Expected "location.column" to be a positive integer, got ${column}`
      );
    }

    lazy.assert.positiveInteger(
      line,
      lazy.pprint`Expected "location.line" to be a positive integer, got ${line}`
    );

    lazy.assert.string(
      url,
      lazy.pprint`Expected "location.url" to be a string, got ${url}`
    );

    const breakpointId = lazy.generateUUID();
    const breakpointData = {
      url,
      line,
      column: column != NULL ? column : undefined,
      id: breakpointId,
    };
    this.#breakpointIdMap.set(breakpointId, breakpointData);

    await this.messageHandler.updateSessionData([
      {
        method: lazy.SessionDataMethod.Add,
        moduleName: "moz:debugging",
        category: "breakpoint",
        contextDescriptor: {
          type: lazy.ContextDescriptorType.All,
        },
        values: [breakpointData],
      },
    ]);

    return { breakpoint: breakpointId };
  }

  /**
   * Enable / disable the debugger for the contexts, user contexts or
   * globally.
   * When debugging is enabled the browser will stop at breakpoints added via
   * moz:debugging.setBreakpoint or on debugger statements.
   *
   * @param {object=} options
   * @param {Array<string>=} options.contexts
   *     Optional list of top-level browsing context ids.
   * @param {boolean|null} options.enabled
   *     Whether to enable the debugger (true) or reset to default behavior (null).
   * @param {Array<string>=} options.userContexts
   *     Optional list of user context ids.
   */
  async setDebuggerEnabled(options = {}) {
    const {
      contexts: contextIds,
      enabled,
      userContexts: userContextIds,
    } = options;

    if (enabled !== true && enabled !== null) {
      throw new lazy.error.InvalidArgumentError(
        lazy.pprint`Expected "enabled" to be true or null, got ${enabled}`
      );
    }

    await this.messageHandler.handleCommand({
      moduleName: "_configuration",
      commandName: "_applyConfigurationParameters",
      destination: { type: lazy.RootMessageHandler.type },
      params: {
        async: false,
        category: "debugging-enabled",
        contextIds,
        moduleName: "moz:debugging",
        resetValue: null,
        supportsGlobalConfiguration: true,
        userContextIds,
        value: enabled,
      },
    });
  }

  static get supportedEvents() {
    return ["moz:debugging.paused", "moz:debugging.resumed"];
  }
}

// To export the class as lower-case
export const debugging = DebuggingModule;
