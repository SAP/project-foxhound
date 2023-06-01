/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Module } from "chrome://remote/content/shared/messagehandler/Module.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  assert: "chrome://remote/content/shared/webdriver/Assert.sys.mjs",
  ContextDescriptorType:
    "chrome://remote/content/shared/messagehandler/MessageHandler.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  OwnershipModel: "chrome://remote/content/webdriver-bidi/RemoteValue.sys.mjs",
  RealmType: "chrome://remote/content/webdriver-bidi/Realm.sys.mjs",
  TabManager: "chrome://remote/content/shared/TabManager.sys.mjs",
  WindowGlobalMessageHandler:
    "chrome://remote/content/shared/messagehandler/WindowGlobalMessageHandler.sys.mjs",
});

/**
 * @typedef {string} ScriptEvaluateResultType
 **/

/**
 * Enum of possible evaluation result types.
 *
 * @readonly
 * @enum {ScriptEvaluateResultType}
 **/
const ScriptEvaluateResultType = {
  Exception: "exception",
  Success: "success",
};

class ScriptModule extends Module {
  #preloadScriptMap;

  constructor(messageHandler) {
    super(messageHandler);

    // Map in which the keys are UUIDs, and the values are structs
    // with an item named expression, which is a string,
    // and an item named sandbox which is a string or null.
    this.#preloadScriptMap = new Map();
  }

  destroy() {
    this.#preloadScriptMap = null;
  }

  /**
   * Used to represent a frame of a JavaScript stack trace.
   *
   * @typedef StackFrame
   *
   * @property {number} columnNumber
   * @property {string} functionName
   * @property {number} lineNumber
   * @property {string} url
   */

  /**
   * Used to represent a JavaScript stack at a point in script execution.
   *
   * @typedef StackTrace
   *
   * @property {Array<StackFrame>} callFrames
   */

  /**
   * Used to represent a JavaScript exception.
   *
   * @typedef ExceptionDetails
   *
   * @property {number} columnNumber
   * @property {RemoteValue} exception
   * @property {number} lineNumber
   * @property {StackTrace} stackTrace
   * @property {string} text
   */

  /**
   * Used as return value for script.evaluate, as one of the available variants
   * {ScriptEvaluateResultException} or {ScriptEvaluateResultSuccess}.
   *
   * @typedef ScriptEvaluateResult
   */

  /**
   * Used as return value for script.evaluate when the script completes with a
   * thrown exception.
   *
   * @typedef ScriptEvaluateResultException
   *
   * @property {ExceptionDetails} exceptionDetails
   * @property {string} realm
   * @property {ScriptEvaluateResultType} [type=ScriptEvaluateResultType.Exception]
   */

  /**
   * Used as return value for script.evaluate when the script completes
   * normally.
   *
   * @typedef ScriptEvaluateResultSuccess
   *
   * @property {string} realm
   * @property {RemoteValue} result
   * @property {ScriptEvaluateResultType} [type=ScriptEvaluateResultType.Success]
   */

  /**
   * Calls a provided function with given arguments and scope in the provided
   * target, which is either a realm or a browsing context.
   *
   * @param {Object=} options
   * @param {Array<RemoteValue>=} arguments
   *     The arguments to pass to the function call.
   * @param {boolean} awaitPromise
   *     Determines if the command should wait for the return value of the
   *     expression to resolve, if this return value is a Promise.
   * @param {string} functionDeclaration
   *     The expression to evaluate.
   * @param {OwnershipModel=} resultOwnership
   *     The ownership model to use for the results of this evaluation. Defaults
   *     to `OwnershipModel.None`.
   * @param {Object} target
   *     The target for the evaluation, which either matches the definition for
   *     a RealmTarget or for ContextTarget.
   * @param {RemoteValue=} this
   *     The value of the this keyword for the function call.
   *
   * @returns {ScriptEvaluateResult}
   *
   * @throws {InvalidArgumentError}
   *     If any of the arguments does not have the expected type.
   * @throws {NoSuchFrameError}
   *     If the target cannot be found.
   */
  async callFunction(options = {}) {
    const {
      arguments: commandArguments = null,
      awaitPromise,
      functionDeclaration,
      resultOwnership = lazy.OwnershipModel.None,
      target = {},
      this: thisParameter = null,
    } = options;

    lazy.assert.string(
      functionDeclaration,
      `Expected "functionDeclaration" to be a string, got ${functionDeclaration}`
    );

    lazy.assert.boolean(
      awaitPromise,
      `Expected "awaitPromise" to be a boolean, got ${awaitPromise}`
    );

    this.#assertResultOwnership(resultOwnership);

    if (commandArguments != null) {
      lazy.assert.array(
        commandArguments,
        `Expected "arguments" to be an array, got ${commandArguments}`
      );
    }

    const { contextId, realmId, sandbox } = this.#assertTarget(target);
    const context = await this.#getContextFromTarget({ contextId, realmId });
    const evaluationResult = await this.messageHandler.forwardCommand({
      moduleName: "script",
      commandName: "callFunctionDeclaration",
      destination: {
        type: lazy.WindowGlobalMessageHandler.type,
        id: context.id,
      },
      params: {
        awaitPromise,
        commandArguments,
        functionDeclaration,
        realmId,
        resultOwnership,
        sandbox,
        thisParameter,
      },
    });

    return this.#buildReturnValue(evaluationResult);
  }

  /**
   * The script.disown command disowns the given handles. This does not
   * guarantee the handled object will be garbage collected, as there can be
   * other handles or strong ECMAScript references.
   *
   * @param {Object=} options
   * @param {Array<string>} handles
   *     Array of handle ids to disown.
   * @param {Object} target
   *     The target owning the handles, which either matches the definition for
   *     a RealmTarget or for ContextTarget.
   */
  async disown(options = {}) {
    const { handles, target = {} } = options;

    lazy.assert.array(
      handles,
      `Expected "handles" to be an array, got ${handles}`
    );
    handles.forEach(handle => {
      lazy.assert.string(
        handle,
        `Expected "handles" to be an array of strings, got ${handle}`
      );
    });

    const { contextId, realmId, sandbox } = this.#assertTarget(target);
    const context = await this.#getContextFromTarget({ contextId, realmId });
    await this.messageHandler.forwardCommand({
      moduleName: "script",
      commandName: "disownHandles",
      destination: {
        type: lazy.WindowGlobalMessageHandler.type,
        id: context.id,
      },
      params: {
        handles,
        realmId,
        sandbox,
      },
    });
  }

  /**
   * Evaluate a provided expression in the provided target, which is either a
   * realm or a browsing context.
   *
   * @param {Object=} options
   * @param {boolean} awaitPromise
   *     Determines if the command should wait for the return value of the
   *     expression to resolve, if this return value is a Promise.
   * @param {string} expression
   *     The expression to evaluate.
   * @param {OwnershipModel=} resultOwnership
   *     The ownership model to use for the results of this evaluation. Defaults
   *     to `OwnershipModel.None`.
   * @param {Object} target
   *     The target for the evaluation, which either matches the definition for
   *     a RealmTarget or for ContextTarget.
   *
   * @returns {ScriptEvaluateResult}
   *
   * @throws {InvalidArgumentError}
   *     If any of the arguments does not have the expected type.
   * @throws {NoSuchFrameError}
   *     If the target cannot be found.
   */
  async evaluate(options = {}) {
    const {
      awaitPromise,
      expression: source,
      resultOwnership = lazy.OwnershipModel.None,
      target = {},
    } = options;

    lazy.assert.string(
      source,
      `Expected "expression" to be a string, got ${source}`
    );

    lazy.assert.boolean(
      awaitPromise,
      `Expected "awaitPromise" to be a boolean, got ${awaitPromise}`
    );

    this.#assertResultOwnership(resultOwnership);

    const { contextId, realmId, sandbox } = this.#assertTarget(target);
    const context = await this.#getContextFromTarget({ contextId, realmId });
    const evaluationResult = await this.messageHandler.forwardCommand({
      moduleName: "script",
      commandName: "evaluateExpression",
      destination: {
        type: lazy.WindowGlobalMessageHandler.type,
        id: context.id,
      },
      params: {
        awaitPromise,
        expression: source,
        realmId,
        resultOwnership,
        sandbox,
      },
    });

    return this.#buildReturnValue(evaluationResult);
  }

  /**
   * An object that holds basic information about a realm.
   *
   * @typedef BaseRealmInfo
   *
   * @property {string} id
   *     The realm unique identifier.
   * @property {string} origin
   *     The serialization of an origin.
   */

  /**
   *
   * @typedef WindowRealmInfoProperties
   *
   * @property {string} context
   *     The browsing context id, associated with the realm.
   * @property {string=} sandbox
   *     The name of the sandbox. If the value is null or empty
   *     string, the default realm will be returned.
   * @property {RealmType.Window} type
   *     The window realm type.
   */

  /**
   * An object that holds information about a window realm.
   *
   * @typedef {BaseRealmInfo & WindowRealmInfoProperties} WindowRealmInfo
   */

  /**
   * An object that holds information about a realm.
   *
   * @typedef {WindowRealmInfo} RealmInfo
   */

  /**
   * An object that holds a list of realms.
   *
   * @typedef ScriptGetRealmsResult
   *
   * @property {Array<RealmInfo>} realms
   *     List of realms.
   */

  /**
   * Returns a list of all realms, optionally filtered to realms
   * of a specific type, or to the realms associated with
   * a specified browsing context.
   *
   * @param {Object=} options
   * @param {string=} context
   *     The id of the browsing context to filter
   *     only realms associated with it. If not provided, return realms
   *     associated with all browsing contexts.
   * @param {RealmType=} type
   *     Type of realm to filter.
   *     If not provided, return realms of all types.
   *
   * @returns {ScriptGetRealmsResult}
   *
   * @throws {InvalidArgumentError}
   *     If any of the arguments does not have the expected type.
   * @throws {NoSuchFrameError}
   *     If the context cannot be found.
   */
  async getRealms(options = {}) {
    const { context: contextId = null, type = null } = options;
    const destination = {};

    if (contextId !== null) {
      lazy.assert.string(
        contextId,
        `Expected "context" to be a string, got ${contextId}`
      );
      destination.id = this.#getBrowsingContext(contextId).id;
    } else {
      destination.contextDescriptor = {
        type: lazy.ContextDescriptorType.All,
      };
    }

    if (type !== null) {
      const supportedRealmTypes = Object.values(lazy.RealmType);
      if (!supportedRealmTypes.includes(type)) {
        throw new lazy.error.InvalidArgumentError(
          `Expected "type" to be one of ${supportedRealmTypes}, got ${type}`
        );
      }

      // Remove this check when other realm types are supported
      if (type !== lazy.RealmType.Window) {
        throw new lazy.error.UnsupportedOperationError(
          `Unsupported "type": ${type}. Only "type" ${lazy.RealmType.Window} is currently supported.`
        );
      }
    }

    return { realms: await this.#getRealmInfos(destination) };
  }

  #assertResultOwnership(resultOwnership) {
    if (
      ![lazy.OwnershipModel.None, lazy.OwnershipModel.Root].includes(
        resultOwnership
      )
    ) {
      throw new lazy.error.InvalidArgumentError(
        `Expected "resultOwnership" to be one of ${Object.values(
          lazy.OwnershipModel
        )}, got ${resultOwnership}`
      );
    }
  }

  #assertTarget(target) {
    lazy.assert.object(
      target,
      `Expected "target" to be an object, got ${target}`
    );

    const {
      context: contextId = null,
      realm: realmId = null,
      sandbox = null,
    } = target;

    if (realmId != null && (contextId != null || sandbox != null)) {
      throw new lazy.error.InvalidArgumentError(
        `A context and a realm reference are mutually exclusive`
      );
    }

    if (contextId != null) {
      lazy.assert.string(
        contextId,
        `Expected "context" to be a string, got ${contextId}`
      );

      if (sandbox != null) {
        lazy.assert.string(
          sandbox,
          `Expected "sandbox" to be a string, got ${sandbox}`
        );
      }
    } else if (realmId != null) {
      lazy.assert.string(
        realmId,
        `Expected "realm" to be a string, got ${realmId}`
      );
    } else {
      throw new lazy.error.InvalidArgumentError(`No context or realm provided`);
    }

    return { contextId, realmId, sandbox };
  }

  #buildReturnValue(evaluationResult) {
    const rv = { realm: evaluationResult.realmId };
    switch (evaluationResult.evaluationStatus) {
      // TODO: Compare with EvaluationStatus.Normal after Bug 1774444 is fixed.
      case "normal":
        rv.type = ScriptEvaluateResultType.Success;
        rv.result = evaluationResult.result;
        break;
      // TODO: Compare with EvaluationStatus.Throw after Bug 1774444 is fixed.
      case "throw":
        rv.type = ScriptEvaluateResultType.Exception;
        rv.exceptionDetails = evaluationResult.exceptionDetails;
        break;
      default:
        throw new lazy.error.UnsupportedOperationError(
          `Unsupported evaluation status ${evaluationResult.evaluationStatus}`
        );
    }
    return rv;
  }

  #getBrowsingContext(contextId) {
    const context = lazy.TabManager.getBrowsingContextById(contextId);
    if (context === null) {
      throw new lazy.error.NoSuchFrameError(
        `Browsing Context with id ${contextId} not found`
      );
    }

    if (!context.currentWindowGlobal) {
      throw new lazy.error.NoSuchFrameError(
        `No window found for BrowsingContext with id ${contextId}`
      );
    }

    return context;
  }

  async #getContextFromTarget({ contextId, realmId }) {
    if (contextId !== null) {
      return this.#getBrowsingContext(contextId);
    }

    const destination = {
      contextDescriptor: {
        type: lazy.ContextDescriptorType.All,
      },
    };
    const realms = await this.#getRealmInfos(destination);
    const realm = realms.find(realm => realm.realm == realmId);

    if (realm && realm.context !== null) {
      return this.#getBrowsingContext(realm.context);
    }

    throw new lazy.error.NoSuchFrameError(`Realm with id ${realmId} not found`);
  }

  async #getRealmInfos(destination) {
    let realms = await this.messageHandler.forwardCommand({
      moduleName: "script",
      commandName: "getWindowRealms",
      destination: {
        type: lazy.WindowGlobalMessageHandler.type,
        ...destination,
      },
    });

    const isBroadcast = !!destination.contextDescriptor;
    if (!isBroadcast) {
      realms = [realms];
    }

    return realms
      .flat()
      .map(realm => {
        // Resolve browsing context to a TabManager id.
        realm.context = lazy.TabManager.getIdForBrowsingContext(realm.context);
        return realm;
      })
      .filter(realm => realm.context !== null);
  }

  static get supportedEvents() {
    return [];
  }
}

export const script = ScriptModule;
