/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { WindowGlobalBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/WindowGlobalBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ConsoleAPIListener:
    "chrome://remote/content/shared/listeners/ConsoleAPIListener.sys.mjs",
  ConsoleListener:
    "chrome://remote/content/shared/listeners/ConsoleListener.sys.mjs",
  formatConsoleMessage:
    "chrome://remote/content/webdriver-bidi/ConsoleMessageFormatter.sys.mjs",
  isChromeFrame: "chrome://remote/content/shared/Stack.sys.mjs",
  OwnershipModel: "chrome://remote/content/webdriver-bidi/RemoteValue.sys.mjs",
  setDefaultSerializationOptions:
    "chrome://remote/content/webdriver-bidi/RemoteValue.sys.mjs",
});

const METHODS_WITHOUT_PRINTER = ["clear", "groupEnd"];

class LogModule extends WindowGlobalBiDiModule {
  #consoleAPIListener;
  #consoleMessageListener;
  #subscribedEvents;

  constructor(messageHandler) {
    super(messageHandler);

    // Create the console-api listener and listen on "message" events.
    this.#consoleAPIListener = new lazy.ConsoleAPIListener(
      this.messageHandler.innerWindowId
    );
    this.#consoleAPIListener.on("message", this.#onConsoleAPIMessage);

    // Create the console listener and listen on error messages.
    this.#consoleMessageListener = new lazy.ConsoleListener(
      this.messageHandler.innerWindowId
    );
    this.#consoleMessageListener.on("error", this.#onJavaScriptError);

    // Set of event names which have active subscriptions.
    this.#subscribedEvents = new Set();
  }

  destroy() {
    this.#consoleAPIListener.off("message", this.#onConsoleAPIMessage);
    this.#consoleAPIListener.destroy();
    this.#consoleMessageListener.off("error", this.#onJavaScriptError);
    this.#consoleMessageListener.destroy();

    this.#subscribedEvents = null;
  }

  #buildSource(realm) {
    return {
      realm: realm.id,
      context: this.messageHandler.context,
    };
  }

  /**
   * Map the internal stacktrace representation to a WebDriver BiDi
   * compatible one.
   *
   * Currently chrome frames will be filtered out until chrome scope
   * is supported (bug 1722679).
   *
   * @param {Array<StackFrame>=} stackTrace
   *     Stack frames to process.
   *
   * @returns {object=} Object, containing the list of frames as `callFrames`.
   */
  #buildStackTrace(stackTrace) {
    if (stackTrace == undefined) {
      return undefined;
    }

    const callFrames = stackTrace
      .filter(frame => !lazy.isChromeFrame(frame))
      .map(frame => {
        return {
          columnNumber: frame.columnNumber - 1,
          functionName: frame.functionName,
          lineNumber: frame.lineNumber - 1,
          url: frame.filename,
        };
      });

    return { callFrames };
  }

  #getLogEntryLevelFromConsoleMethod(method) {
    switch (method) {
      case "assert":
      case "error":
        return "error";
      case "debug":
      case "trace":
        return "debug";
      case "warn":
        return "warn";
      default:
        return "info";
    }
  }

  #onConsoleAPIMessage = (eventName, data = {}) => {
    const {
      // `arguments` cannot be used as variable name in functions
      arguments: messageArguments,
      columnNumber,
      counter,
      filename,
      functionName,
      // `level` corresponds to the console method used
      level: method,
      lineNumber,
      stacktrace,
      timer,
      timeStamp,
    } = data;

    // Skip the console methods which don't print anything in the console.
    // And "console.time" if it doesn't contain error
    // (the error has to be reported in the console).
    if (
      METHODS_WITHOUT_PRINTER.includes(method) ||
      (method === "time" && !timer?.error)
    ) {
      return;
    }

    // Step numbers below refer to the specifications at
    //   https://w3c.github.io/webdriver-bidi/#event-log-entryAdded

    let logEntrylevel;
    if (
      (["time", "timeEnd", "timeLog"].includes(method) && timer?.error) ||
      (method === "countReset" && counter?.error)
    ) {
      // For the "console.countReset/time/timeEnd/timeLog"
      // we have to report a warning in a case of an error.
      logEntrylevel = "warn";
    } else {
      // Translate the console message method to a log.LogEntry level
      logEntrylevel = this.#getLogEntryLevelFromConsoleMethod(method);
    }

    // Use the message's timeStamp or fallback on the current time value.
    const timestamp = timeStamp || Date.now();

    const args = messageArguments || [];

    const defaultRealm = this.messageHandler.getRealm();
    const serializedArgs = [];
    const seenNodeIds = new Map();

    // Serialize each arg as remote value.
    for (const arg of args) {
      // Note that we can pass a default realm for now since realms are only
      // involved when creating object references, which will not happen with
      // OwnershipModel.None. This will be revisited in Bug 1742589.
      serializedArgs.push(
        this.serialize(
          Cu.waiveXrays(arg),
          lazy.setDefaultSerializationOptions(),
          lazy.OwnershipModel.None,
          defaultRealm,
          { seenNodeIds }
        )
      );
    }

    // Start assembling the text representation of the message.
    const text = lazy.formatConsoleMessage({
      counter,
      messageArguments,
      method,
      serializedArgs,
      timer,
    });

    // Set source to an object which contains realm and browsing context.
    // TODO: Bug 1742589. Use an actual realm from which the event came from.
    const source = this.#buildSource(defaultRealm);

    let stackTrace;
    if (stacktrace) {
      stackTrace = this.#buildStackTrace(stacktrace);
    } else if (filename) {
      // Bug 1944136: Build a top-most frame until we have
      // full stacktrace support for all console API types.
      stackTrace = this.#buildStackTrace([
        { columnNumber, filename, functionName, lineNumber },
      ]);
    }

    // Build the ConsoleLogEntry
    const entry = {
      type: "console",
      method,
      source,
      args: serializedArgs,
      level: logEntrylevel,
      text,
      timestamp,
      stackTrace,
      _extraData: { seenNodeIds },
    };

    // TODO: Those steps relate to:
    // - emitting associated BrowsingContext. See log.entryAdded full support
    //   in https://bugzilla.mozilla.org/show_bug.cgi?id=1724669#c0
    // - handling cases where session doesn't exist or the event is not
    //   monitored. The implementation differs from the spec here because we
    //   only react to events if there is a session & if the session subscribed
    //   to those events.

    this.emitEvent("log.entryAdded", entry);
  };

  #onJavaScriptError = (eventName, data = {}) => {
    const { level, message, stacktrace, timeStamp } = data;
    const defaultRealm = this.messageHandler.getRealm();

    // Build the JavascriptLogEntry
    const entry = {
      type: "javascript",
      level,
      // TODO: Bug 1742589. Use an actual realm from which the event came from.
      source: this.#buildSource(defaultRealm),
      text: message,
      timestamp: timeStamp || Date.now(),
      stackTrace: this.#buildStackTrace(stacktrace),
    };

    this.emitEvent("log.entryAdded", entry);
  };

  #subscribeEvent(event) {
    if (event === "log.entryAdded") {
      this.#consoleAPIListener.startListening();
      this.#consoleMessageListener.startListening();
      this.#subscribedEvents.add(event);
    }
  }

  #unsubscribeEvent(event) {
    if (event === "log.entryAdded") {
      this.#consoleAPIListener.stopListening();
      this.#consoleMessageListener.stopListening();
      this.#subscribedEvents.delete(event);
    }
  }

  /**
   * Internal commands
   */

  _applySessionData(params) {
    // TODO: Bug 1775231. Move this logic to a shared module or an abstract
    // class.
    const { category } = params;
    if (category === "event") {
      const filteredSessionData = params.sessionData.filter(item =>
        this.messageHandler.matchesContext(item.contextDescriptor)
      );
      for (const event of this.#subscribedEvents.values()) {
        const hasSessionItem = filteredSessionData.some(
          item => item.value === event
        );
        // If there are no session items for this context, we should unsubscribe from the event.
        if (!hasSessionItem) {
          this.#unsubscribeEvent(event);
        }
      }

      // Subscribe to all events, which have an item in SessionData.
      for (const { value } of filteredSessionData) {
        this.#subscribeEvent(value);
      }
    }
  }
}

export const log = LogModule;
