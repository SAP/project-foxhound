/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

import { WindowGlobalBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/WindowGlobalBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  addDebuggerToGlobal: "resource://gre/modules/jsdebugger.sys.mjs",

  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  serialize: "chrome://remote/content/webdriver-bidi/RemoteValue.sys.mjs",
  OwnershipModel: "chrome://remote/content/webdriver-bidi/RemoteValue.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () =>
  lazy.Log.get(lazy.Log.TYPES.WEBDRIVER_BIDI)
);

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "jsInspector",
  "@mozilla.org/jsinspector;1",
  Ci.nsIJSInspector
);

/**
 * An object that identifies a live breakpoint set on a script.
 *
 * @typedef LiveBreakpoint
 *
 * @property {Debugger.Script} script
 *    The script instance where the breakpoint is set.
 * @property {number} offset
 *    The offset corresponding to the live breakpoint location in this script.
 */

class DebuggingModule extends WindowGlobalBiDiModule {
  #breakpointHandler;
  #breakpointLocationMap;
  #dbg;
  #eventLoopEntered;
  #previousPauseLocation;

  constructor(messageHandler) {
    super(messageHandler);

    // Map of breakpoint id to BreakpointLocation with an additional
    // "liveBreakpoints" property which is a set of LiveBreakpoint, initially
    // empty.
    this.#breakpointLocationMap = new Map();

    // State flags.
    this.#eventLoopEntered = false;

    this.#dbg = null;
    this.#previousPauseLocation = null;

    this.#breakpointHandler = {
      hit: this.#pauseAtFrame,
    };
  }

  destroy() {
    this.#destroyDebugger();
    this.#breakpointHandler = null;
    this.#breakpointLocationMap = null;
  }

  #buildScopeChain(frame) {
    const scopeChain = [];
    const realm = this.messageHandler.getRealm({
      realmId: null,
      sandboxName: null,
    });

    let env = frame.environment;
    while (env) {
      if (env.type === "declarative" && env.scopeKind != null) {
        const scope = {
          type: env.scopeKind,
          variables: {},
        };

        const names = env.names();
        for (const name of names) {
          try {
            const value = env.getVariable(name);
            scope.variables[name] = this.#serializeVariable(value, realm);
          } catch (e) {
            lazy.logger.error(
              "Unable to retrieve and serialize the scope variable: " + name
            );
          }
        }

        scopeChain.push(scope);
      }

      env = env.parent;
    }

    return scopeChain;
  }

  #buildCallFrames(startFrame) {
    const callFrames = [];
    let frame = startFrame;
    let frameIndex = 0;

    while (frame) {
      const { url, line, column } = this.#getFrameLocation(frame);
      const scopeChain = this.#buildScopeChain(frame);

      let functionName = "(anonymous)";
      if (frame.callee && frame.callee.name) {
        functionName = frame.callee.name;
      } else if (frame.callee && frame.callee.displayName) {
        functionName = frame.callee.displayName;
      }

      callFrames.push({
        callFrameId: String(frameIndex),
        functionName,
        location: { url, line, column },
        scopeChain,
      });

      frame = frame.older;
      frameIndex++;
    }

    return callFrames;
  }

  #createDebugger() {
    if (this.#dbg) {
      return;
    }

    if (!("Debugger" in globalThis)) {
      // eslint-disable-next-line mozilla/reject-globalThis-modification
      lazy.addDebuggerToGlobal(globalThis);
    }

    // Create a debugger instance and add the current window as debuggee.
    this.#dbg = new Debugger();
    this.#dbg.onNewScript = this.#onNewScript;
    this.#dbg.onDebuggerStatement = this.#onDebuggerStatement;
    try {
      this.#dbg.addDebuggee(this.messageHandler.window);
    } catch {
      lazy.logger.error(
        "Failed to add window as debuggee for browsing context: " +
          this.messageHandler.contextId
      );
    }
  }

  #destroyDebugger() {
    if (!this.#dbg) {
      return;
    }

    // Remove all debuggees and resume.
    this.#dbg.removeAllDebuggees();
    this._resume();

    this.#dbg.onNewScript = undefined;
    this.#dbg.onDebuggerStatement = undefined;
    this.#dbg = null;

    for (const breakpointLocation of this.#breakpointLocationMap.values()) {
      breakpointLocation.liveBreakpoints.clear();
    }
  }

  #getFrameLocation(frame) {
    const { offset, script } = frame;
    const { columnNumber, lineNumber } = script.getOffsetMetadata(offset);
    return { column: columnNumber, line: lineNumber, url: script.url };
  }

  #hasMoved(frame) {
    const newLocation = this.#getFrameLocation(frame);

    if (!this.#previousPauseLocation) {
      return true;
    }

    const { line, column } = this.#previousPauseLocation;

    return line !== newLocation.line || column !== newLocation.column;
  }

  /**
   * Create a Debugger Handler/Callback that will not override `this`.
   * SpiderMonkey forces `this` to be set to the paused frame, the callback
   * wrapper will instead provide the frame as first argument.
   *
   * @param {Function} method
   *     The actual method used for the callback.
   * @param {object} params
   *     Additional fixed parameters which will be passed every time the wrapped
   *     callback is invoked
   *
   * @returns {Function}
   *     A wrapped method which can be consumed by SpiderMonkey as a Debugger
   *     Handler.
   */
  #makeFrameHookCallback(method, params) {
    return function () {
      const frame = this;
      return method(frame, params, ...arguments);
    };
  }

  #makeSteppingHooks({ steppingType, startFrame }) {
    return {
      onEnterFrame: this.#makeFrameHookCallback(this.#onFrameEnter, {}),
      onStep: this.#makeFrameHookCallback(this.#onFrameStep, {
        startFrame,
        steppingType,
      }),
      onPop: this.#makeFrameHookCallback(this.#onFramePop, {
        steppingType,
      }),
    };
  }

  /**
   * Debugger handler function.
   * See https://firefox-source-docs.mozilla.org/devtools-user/debugger-api/debugger/index.html#debugger-handler-functions
   * for signature and return value.
   */
  #onDebuggerStatement = frame => {
    return this.#pauseAtFrame(frame);
  };

  /**
   * Debugger handler function.
   * See https://firefox-source-docs.mozilla.org/devtools-user/debugger-api/debugger/index.html#debugger-handler-functions
   * for signature and return value.
   */
  #onFrameEnter = (frame, params, newFrame) => {
    // Clear the global onEnterFrame hook since we've entered a frame
    this.#dbg.onEnterFrame = undefined;

    // Clear hooks on the older frame since we entered a new frame
    if (newFrame.older) {
      newFrame.older.onStep = undefined;
      newFrame.older.onPop = undefined;
    }

    // Continue forward until we get to a valid step target using "next" mode
    const { onStep, onPop } = this.#makeSteppingHooks({
      steppingType: "next",
      startFrame: newFrame,
    });

    newFrame.onStep = onStep;
    newFrame.onPop = onPop;

    return undefined;
  };

  /**
   * Debugger handler function.
   * See https://firefox-source-docs.mozilla.org/devtools-user/debugger-api/debugger/index.html#debugger-handler-functions
   * for signature and return value.
   */
  #onFramePop = (frame, params) => {
    // If there's no older frame, execution will complete naturally
    if (!frame.older) {
      return undefined;
    }
    const { steppingType } = params;

    // For "finish" (step out), we need to handle two cases:
    // 1. If older frame has remaining code to execute, pause there
    // 2. If older frame is at the end (eval context finishing), let it complete
    if (steppingType === "finish") {
      // Check if we're at a position where we can pause
      const meta = frame.older.script.getOffsetMetadata(frame.older.offset);

      // If not at a breakpoint position or if we haven't moved from prior pause,
      // attach hooks to continue with "next" mode
      if (!meta.isBreakpoint || !this.#hasMoved(frame.older)) {
        const { onStep, onPop } = this.#makeSteppingHooks({
          steppingType: "next",
          startFrame: frame.older,
        });

        this.#dbg.onEnterFrame = undefined;
        frame.older.onStep = onStep;
        frame.older.onPop = onPop;
        return undefined;
      }

      // Otherwise pause immediately in the older frame
      return this.#pauseAtFrame(frame.older);
    }

    // For other stepping modes, pause when frame pops
    return this.#pauseAtFrame(frame.older);
  };

  /**
   * Debugger handler function.
   * See https://firefox-source-docs.mozilla.org/devtools-user/debugger-api/debugger/index.html#debugger-handler-functions
   * for signature and return value.
   */
  #onFrameStep = (frame, params) => {
    const { startFrame } = params;
    if (this.#validFrameStepOffset(frame, startFrame, frame.offset)) {
      return this.#pauseAtFrame(frame);
    }
    return undefined;
  };

  /**
   * Debugger handler function.
   * See https://firefox-source-docs.mozilla.org/devtools-user/debugger-api/debugger/index.html#debugger-handler-functions
   * for signature and return value.
   */
  #onNewScript = script => {
    for (const breakpointLocation of this.#breakpointLocationMap.values()) {
      if (breakpointLocation.url === script.url) {
        this.#setBreakpointOnScript(script, breakpointLocation);
      }
    }
  };

  /**
   * Debugger handler function.
   * See https://firefox-source-docs.mozilla.org/devtools-user/debugger-api/debugger/index.html#debugger-handler-functions
   * for signature and return value.
   */
  #pauseAtFrame = frame => {
    const { url, line, column } = this.#getFrameLocation(frame);
    const callFrames = this.#buildCallFrames(frame);

    // Save the current pause location for hasMoved() checks
    this.#previousPauseLocation = { line, column };

    // Set the paused frame on the message handler so other modules can access it
    this.messageHandler.setPausedDebuggerFrame(frame);

    this.emitEvent("moz:debugging.paused", {
      context: this.messageHandler.context,
      url,
      line,
      column,
      callFrames,
    });

    try {
      this.#eventLoopEntered = true;
      // Bug 2041335: Consider using another approach to avoid conflicts with
      // devtools debugger.
      lazy.jsInspector.enterNestedEventLoop(this);
      this.#eventLoopEntered = false;
    } catch (e) {
      this.#eventLoopEntered = false;
    }

    // Clear the paused frame when resuming
    this.messageHandler.setPausedDebuggerFrame(null);

    return undefined;
  };

  /**
   * Remove the live breakpoints corresponding to the provided BreakpointLocation.
   *
   * @param {BreakpointLocation} breakpointLocation
   *     The breakpoint location data for which live breakpoints should be
   *     removed.
   */
  #removeBreakpoint(breakpointLocation) {
    for (const {
      script,
      offset,
    } of breakpointLocation.liveBreakpoints.values()) {
      script.clearBreakpoint(this.#breakpointHandler, offset);
    }
    breakpointLocation.liveBreakpoints.clear();
  }

  #serializeVariable(value, realm) {
    if (value?.uninitialized) {
      return { type: "uninitialized" };
    }
    if (value?.missingArguments) {
      return { type: "missingArguments" };
    }
    if (value?.optimizedOut) {
      return { type: "optimizedOut" };
    }

    const rawValue = this.#toRawObject(value);
    const serializationOptions = {
      maxDomDepth: 0,
      maxObjectDepth: 1,
    };

    return lazy.serialize(
      rawValue,
      serializationOptions,
      lazy.OwnershipModel.None,
      new Map(),
      realm,
      {}
    );
  }

  /**
   * Set a live breakpoint on the provided script for the provided BreakpointLocation.
   *
   * @param {Debugger.Script} script
   *     The script where the breakpoint should be added.
   * @param {BreakpointLocation} breakpointLocation
   *     The breakpoint location describing where (line, column) the breakpoint
   *     should be added.
   */
  #setBreakpointOnScript(script, breakpointLocation) {
    const { column, line, url } = breakpointLocation;

    const offsets = script
      .getPossibleBreakpoints()
      .filter(offsetMetadata => offsetMetadata.lineNumber === line);

    if (offsets.length === 0) {
      lazy.logger.warn(
        `Unable to set a breakpoint for url: ${url} at line: ${line}`
      );
      return;
    }

    let offsetMetadata = offsets[0];
    if (column !== undefined) {
      const columnOffset = offsets.find(o => o.columnNumber === column);
      if (columnOffset) {
        offsetMetadata = columnOffset;
      } else {
        lazy.logger.warn(
          `Unable to set a column breakpoint for url: ${url}, line: ${line} and column: ${column}.`
        );
        return;
      }
    }

    script.setBreakpoint(offsetMetadata.offset, this.#breakpointHandler);
    breakpointLocation.liveBreakpoints.add({
      script,
      offset: offsetMetadata.offset,
    });
  }

  #toRawObject(maybeDebuggerObject) {
    if (maybeDebuggerObject instanceof Debugger.Object) {
      const rawObject = maybeDebuggerObject.unsafeDereference();
      // Bug 2041412: This might lead to visible side effects on the content
      // page, needs more investigation.
      return Cu.waiveXrays(rawObject);
    }
    return maybeDebuggerObject;
  }

  #validFrameStepOffset(frame, startFrame, offset) {
    const meta = frame.script.getOffsetMetadata(offset);

    // Continue if:
    // 1. the location is not a valid breakpoint position
    // 2. we have not moved since the last pause
    if (!meta.isBreakpoint || !this.#hasMoved(frame)) {
      return false;
    }

    // Pause if:
    // 1. the frame has changed OR
    // 2. the location is a step position
    return frame !== startFrame || meta.isStepStart;
  }

  /**
   * Internal commands
   */

  _applySessionData(params) {
    const { category } = params;

    if (category === "debugging-enabled") {
      const isEnabled = !!this.#dbg;
      const shouldEnable = params.sessionData.some(item =>
        this.messageHandler.matchesContext(item.contextDescriptor)
      );

      if (shouldEnable && !isEnabled) {
        this.#createDebugger();

        // Check if any breakpoint needs to be set on the current scripts.
        for (const breakpointLocation of this.#breakpointLocationMap.values()) {
          const scripts = this.#dbg.findScripts({
            url: breakpointLocation.url,
          });
          for (const script of scripts) {
            this.#setBreakpointOnScript(script, breakpointLocation);
          }
        }
      } else if (!shouldEnable && isEnabled) {
        // Destroy the current debugger. This will clear live breakpoints and
        // resume paused frames.
        this.#destroyDebugger();
      }
    } else if (category === "breakpoint") {
      for (const { value } of params.sessionData) {
        const { id, column, line, url } = value;

        // If the unique breakpoint id is already stored in the map, the
        // corresponding location data is immutable so there is nothing to do.
        if (!this.#breakpointLocationMap.has(id)) {
          // Otherwise this is a new breakpoint, it needs to be stored and
          // applied to existing scripts if debugging is enabled.
          const breakpointLocation = {
            url,
            line,
            column,
            liveBreakpoints: new Set(),
          };
          this.#breakpointLocationMap.set(id, breakpointLocation);

          if (this.#dbg) {
            const scripts = this.#dbg.findScripts({ url });
            for (const script of scripts) {
              this.#setBreakpointOnScript(script, breakpointLocation);
            }
          }
        }
      }

      // Finally remove breakpoints which are in the local map, but no longer
      // listed in SessionData.
      for (const [id, breakpointLocation] of this.#breakpointLocationMap) {
        if (!params.sessionData.some(item => item.value.id === id)) {
          this.#breakpointLocationMap.delete(id);

          if (this.#dbg) {
            this.#removeBreakpoint(breakpointLocation);
          }
        }
      }
    }
  }

  _getScriptSource(params) {
    if (!this.#dbg) {
      throw new lazy.error.UnsupportedOperationError(
        "Debugger is not initialized. Use moz:debugging.enable first."
      );
    }

    const { scriptUrl } = params;
    const scripts = this.#dbg.findScripts({ url: scriptUrl });

    if (scripts.length === 0) {
      throw new lazy.error.InvalidArgumentError(
        `No script found with URL: ${scriptUrl}`
      );
    }

    const script = scripts[0];
    const source = script.source;

    if (!source || source.text === "[no source]") {
      throw new lazy.error.UnknownError(
        `Source text not available for script: ${scriptUrl}`
      );
    }

    return { source: source.text };
  }

  _listScripts() {
    if (!this.#dbg) {
      throw new lazy.error.UnsupportedOperationError(
        "Debugger is not initialized. Use moz:debugging.enable first."
      );
    }

    const urls = new Set();

    // Bug 2041407: garbage collected scripts will not be returned here.
    // They should be listed and resurrected.
    for (const { url } of this.#dbg.findScripts()) {
      if (url) {
        urls.add(url);
      }
    }

    return { scripts: [...urls] };
  }

  _resume() {
    if (this.#eventLoopEntered && lazy.jsInspector.lastNestRequestor === this) {
      const frame = this.messageHandler.getPausedDebuggerFrame();
      if (frame) {
        // Clear any stepping hooks
        frame.onStep = undefined;
        frame.onPop = undefined;
      }

      this.#dbg.onEnterFrame = undefined;

      lazy.jsInspector.exitNestedEventLoop();
      this.emitEvent("moz:debugging.resumed", {
        context: this.messageHandler.context,
      });
    }
  }

  _stepInto() {
    if (this.#eventLoopEntered && lazy.jsInspector.lastNestRequestor === this) {
      const frame = this.messageHandler.getPausedDebuggerFrame();
      if (frame) {
        const { onEnterFrame, onStep, onPop } = this.#makeSteppingHooks({
          steppingType: "step",
          startFrame: frame,
        });

        // Attach onEnterFrame globally to catch function calls
        this.#dbg.onEnterFrame = onEnterFrame;

        // Attach onStep and onPop to current frame
        frame.onStep = onStep;
        frame.onPop = onPop;
      }

      lazy.jsInspector.exitNestedEventLoop();
    }
  }

  _stepOut() {
    if (this.#eventLoopEntered && lazy.jsInspector.lastNestRequestor === this) {
      const frame = this.messageHandler.getPausedDebuggerFrame();
      if (frame) {
        const { onPop } = this.#makeSteppingHooks({
          steppingType: "finish",
          startFrame: frame,
        });

        frame.onPop = onPop;
      }

      lazy.jsInspector.exitNestedEventLoop();
    }
  }

  _stepOver() {
    if (this.#eventLoopEntered && lazy.jsInspector.lastNestRequestor === this) {
      const frame = this.messageHandler.getPausedDebuggerFrame();
      if (frame) {
        const { onStep, onPop } = this.#makeSteppingHooks({
          steppingType: "next",
          startFrame: frame,
        });

        frame.onStep = onStep;
        frame.onPop = onPop;
      }

      lazy.jsInspector.exitNestedEventLoop();
    }
  }
}

export const debugging = DebuggingModule;
