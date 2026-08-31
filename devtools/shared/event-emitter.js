/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const BAD_LISTENER = "The event listener must be a function.";

const eventListeners = Symbol("EventEmitter/listeners");
const onceResolvers = Symbol("EventEmitter/once-resolvers");
loader.lazyRequireGetter(this, "flags", "resource://devtools/shared/flags.js");

class EventEmitter {
  /**
   * Decorate an object with event emitter functionality; basically using the
   * class' prototype as mixin.
   *
   * @param Object target
   *    The object to decorate.
   * @return Object
   *    The object given, mixed.
   */
  static decorate(target) {
    const descriptors = Object.getOwnPropertyDescriptors(this.prototype);
    delete descriptors.constructor;
    return Object.defineProperties(target, descriptors);
  }

  /**
   * Registers an event `listener` that is called every time events of
   * specified `type` is emitted on this instance.
   *
   * @param {string} type
   *    The type of event.
   * @param {Function} listener
   *    The listener that processes the event.
   * @param {object} options
   * @param {AbortSignal} options.signal
   *     The listener will be removed when linked AbortController’s abort() method is called
   * @returns {Function}
   *    A function that removes the listener when called.
   */
  on(type, listener, { signal } = {}) {
    if (typeof listener !== "function") {
      throw new Error(BAD_LISTENER);
    }

    if (signal?.aborted === true) {
      // The signal is already aborted so don't setup the listener.
      // We return an empty function as it's the expected returned value.
      return () => {};
    }

    if (!(eventListeners in this)) {
      this[eventListeners] = new Map();
    }

    const events = this[eventListeners];

    if (events.has(type)) {
      events.get(type).add(listener);
    } else {
      events.set(type, new Set([listener]));
    }

    const offFn = () => this.off(type, listener);

    if (signal) {
      signal.addEventListener("abort", offFn, { once: true });
    }

    return offFn;
  }

  /**
   * Removes an event `listener` for the given event `type` on this instance
   * If no `listener` is passed removes all listeners of the given
   * `type`. If `type` is not passed removes all the listeners of this instance.
   *
   * @param {string} [type]
   *    The type of event.
   * @param {Function} [listener]
   *    The listener that processes the event.
   */
  off(type, listener) {
    const length = arguments.length;
    const events = this[eventListeners];

    if (!events) {
      return;
    }

    if (length >= 2) {
      // Trying to remove from `this` the `listener` specified for the event's `type` given.
      const listenersForType = events.get(type);

      // If we don't have listeners for the event's type, we bail out.
      if (!listenersForType) {
        return;
      }

      // If the listeners list contains the listener given, we just remove it.
      if (listenersForType.has(listener)) {
        listenersForType.delete(listener);
        delete listener[onceResolvers];
      }
    } else if (length === 1) {
      // No listener was given, it means we're removing all the listeners from
      // the given event's `type`.
      if (events.has(type)) {
        events.delete(type);
      }
    } else if (length === 0) {
      // With no parameter passed, we're removing all the listeners from this.
      events.clear();
    }
  }

  clearEvents() {
    const events = this[eventListeners];
    if (!events) {
      return;
    }
    events.clear();
  }

  /**
   * Registers an event `listener` that is called only the next time an event
   * of the specified `type` is emitted on this instance.
   * It returns a Promise resolved once the specified event `type` is emitted.
   *
   * @param {string} type
   *    The type of the event.
   * @param {Function} [listener]
   *    The listener that processes the event.
   * @param {object} options
   * @param {AbortSignal} options.signal
   *     The listener will be removed when linked AbortController’s abort() method is called
   * @return {Promise}
   *    The promise resolved once the event `type` is emitted.
   */
  once(type, listener = function () {}, options) {
    const { promise, resolve } = Promise.withResolvers();
    if (!listener[onceResolvers]) {
      listener[onceResolvers] = [];
    }
    listener[onceResolvers].push(resolve);
    this.on(type, listener, options);
    return promise;
  }

  emit(type, ...rest) {
    this._emit(type, false, rest);
  }

  emitAsync(type, ...rest) {
    return this._emit(type, true, rest);
  }

  emitForTests(type, ...rest) {
    if (flags.testing) {
      this.emit(type, ...rest);
    }
  }

  /**
   * Emit an event of a given `type` on this instance.
   *
   * @param {string} type
   *    The type of the event.
   * @param {boolean} async
   *    If true, this function will wait for each listener completion.
   *    Each listener has to return a promise, which will be awaited for.
   * @param {Array} args
   *    The arguments to pass to each listener function.
   * @return {Promise|undefined}
   *    If `async` argument is true, returns the promise resolved once all listeners have resolved.
   *    Otherwise, this function returns undefined;
   */
  _emit(type, async, args) {
    if (loggingEnabled) {
      logEvent(type, args);
    }

    const targetEventListeners = this[eventListeners];
    if (!targetEventListeners) {
      return undefined;
    }

    const listeners = targetEventListeners.get(type);
    if (!listeners?.size) {
      return undefined;
    }

    const promises = async ? [] : null;

    // Creating a temporary Set with the original listeners, to avoiding side effects
    // in emit.
    for (const listener of new Set(listeners)) {
      // If the object was destroyed during event emission, stop emitting.
      if (!(eventListeners in this)) {
        break;
      }

      // If listeners were removed during emission, make sure the
      // event handler we're going to fire wasn't removed.
      if (listeners && listeners.has(listener)) {
        try {
          // If this was a one-off listener (add via `EventEmitter#once`), unregister the
          // listener right away, before firing the listener, to prevent re-entry in case
          // the listener fires the same event again.
          const resolvers = listener[onceResolvers];
          if (resolvers) {
            this.off(type, listener);
          }
          const promise = listener.apply(this, args);
          // Resolve the promise returned by `EventEmitter#once` only after having called
          // the listener.
          if (resolvers) {
            for (const resolver of resolvers) {
              // Resolve with the first argument fired on the listened event
              // (`EventEmitter#once` listeners don't have access to all the other arguments).
              resolver(args[0]);
            }
          }
          if (async) {
            // Assert the name instead of `constructor != Promise` in order
            // to avoid cross compartment issues where Promise can be multiple.
            if (!promise || promise.constructor.name != "Promise") {
              console.warn(
                `Listener for event '${type}' did not return a promise.`
              );
            } else {
              promises.push(promise);
            }
          }
        } catch (ex) {
          // Prevent a bad listener from interfering with the others.
          console.error(ex);
          const msg = ex + ": " + ex.stack;
          dump(msg + "\n");
        }
      }
    }

    if (async) {
      return Promise.all(promises);
    }

    return undefined;
  }

  /**
   * Returns a number of event listeners registered for the given event `type` on this instance.
   *
   * @param {string} type
   *    The type of event.
   * @return {number}
   *    The number of event listeners.
   */
  count(type) {
    if (eventListeners in this) {
      const listenersForType = this[eventListeners].get(type);

      if (listenersForType) {
        return listenersForType.size;
      }
    }

    return 0;
  }
}

module.exports = EventEmitter;

const {
  getNthPathExcluding,
} = require("resource://devtools/shared/platform/stack.js");
let loggingEnabled = false;

if (!isWorker) {
  loggingEnabled = Services.prefs.getBoolPref("devtools.dump.emit", false);
  const observer = {
    observe: () => {
      loggingEnabled = Services.prefs.getBoolPref("devtools.dump.emit");
    },
  };
  Services.prefs.addObserver("devtools.dump.emit", observer);

  // Also listen for Loader unload to unregister the pref observer and
  // prevent leaking
  const unloadObserver = function (subject) {
    if (subject.wrappedJSObject == require("@loader/unload")) {
      Services.prefs.removeObserver("devtools.dump.emit", observer);
      Services.obs.removeObserver(unloadObserver, "devtools:loader:destroy");
    }
  };
  Services.obs.addObserver(unloadObserver, "devtools:loader:destroy");
}

function serialize(target) {
  const MAXLEN = 60;

  // Undefined
  if (typeof target === "undefined") {
    return "undefined";
  }

  if (target === null) {
    return "null";
  }

  // Number / String
  if (typeof target === "string" || typeof target === "number") {
    return truncate(target, MAXLEN);
  }

  // HTML Node
  if (target.nodeName) {
    let out = target.nodeName;

    if (target.id) {
      out += "#" + target.id;
    }
    if (target.className) {
      out += "." + target.className;
    }

    return out;
  }

  // Array
  if (Array.isArray(target)) {
    return truncate(target.toSource(), MAXLEN);
  }

  // Function
  if (typeof target === "function") {
    return `function ${target.name ? target.name : "anonymous"}()`;
  }

  // Window
  if (target?.constructor?.name === "Window") {
    return `window (${target.location.origin})`;
  }

  // Object
  if (typeof target === "object") {
    let out = "{";

    const entries = Object.entries(target);
    for (let i = 0; i < Math.min(10, entries.length); i++) {
      const [name, value] = entries[i];

      if (i > 0) {
        out += ", ";
      }

      out += `${name}: ${truncate(value, MAXLEN)}`;
    }

    return out + "}";
  }

  // Other
  return truncate(target.toSource(), MAXLEN);
}

function truncate(value, maxLen) {
  // We don't use value.toString() because it can throw.
  const str = String(value);
  return str.length > maxLen ? str.substring(0, maxLen) + "..." : str;
}

function logEvent(type, args) {
  let argsOut = "";

  // We need this try / catch to prevent any dead object errors.
  try {
    argsOut = `${args.map(serialize).join(", ")}`;
  } catch (e) {
    // Object is dead so the toolbox is most likely shutting down,
    // do nothing.
  }

  const path = getNthPathExcluding(0, "devtools/shared/event-emitter.js");

  if (args.length) {
    dump(`EMITTING: emit(${type}, ${argsOut}) from ${path}\n`);
  } else {
    dump(`EMITTING: emit(${type}) from ${path}\n`);
  }
}
