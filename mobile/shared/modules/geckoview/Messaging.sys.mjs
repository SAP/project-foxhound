/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

if (Services.appinfo.processType != Services.appinfo.PROCESS_TYPE_DEFAULT) {
  throw new Error("EventDispatcher is only available in the parent process");
}

function DispatcherDelegate(aDispatcher) {
  this._dispatcher = aDispatcher;
}

DispatcherDelegate.prototype = {
  /**
   * Register a listener to be notified of event(s).
   *
   * @param aListener Target listener implementing nsIGeckoViewEventListener.
   * @param aEvents   String or array of strings of events to listen to.
   */
  registerListener(aListener, aEvents) {
    this._dispatcher.registerListener(aListener, aEvents);
  },

  /**
   * Unregister a previously-registered listener.
   *
   * @param aListener Registered listener implementing nsIGeckoViewEventListener.
   * @param aEvents   String or array of strings of events to stop listening to.
   */
  unregisterListener(aListener, aEvents) {
    if (!this._dispatcher) {
      throw new Error("Can only listen in parent process");
    }
    this._dispatcher.unregisterListener(aListener, aEvents);
  },

  /**
   * Dispatch an event to registered listeners for that event, and pass an
   * optional data object and/or a optional callback interface to the
   * listeners.
   *
   * @param aEvent     Name of event to dispatch.
   * @param aData      Optional object containing data for the event.
   * @param aCallback  Optional callback implementing nsIGeckoViewEventCallback.
   * @param aFinalizer Optional finalizer implementing nsIGeckoViewEventFinalizer.
   */
  dispatch(aEvent, aData, aCallback, aFinalizer) {
    this._dispatcher.dispatch(aEvent, aData, aCallback, aFinalizer);
  },

  /**
   * Sends a request to Java.
   *
   * @param aType     Type of message to send
   * @param aMsg      Message to send
   * @param aCallback Optional callback implementing nsIGeckoViewEventCallback.
   */
  sendRequest(aType, aMsg, aCallback) {
    this.dispatch(aType, aMsg, aCallback);
  },

  /**
   * Sends a request to Java, returning a Promise that resolves to the response.
   *
   * @param aType Type of message to send
   * @param aMsg Message to send
   * @return A Promise resolving to the response
   */
  sendRequestForResult(aType, aMsg) {
    return new Promise((resolve, reject) => {
      // Manually release the resolve/reject functions after one callback is
      // received, so the JS GC is not tied up with the Java GC.
      const onCallback = (callback, ...args) => {
        if (callback) {
          callback(...args);
        }
        resolve = undefined;
        reject = undefined;
      };
      const callback = {
        onSuccess: result => onCallback(resolve, result),
        onError: error => onCallback(reject, error),
        onFinalize: _ => onCallback(reject),
      };
      this.dispatch(aType, aMsg, callback, callback);
    });
  },
};

export var EventDispatcher = {
  instance: new DispatcherDelegate(Services.geckoviewBridge),

  /**
   * Return an EventDispatcher instance for a chrome DOM window.
   *
   * @param aWindow a chrome DOM window.
   */
  for(aWindow) {
    const view =
      aWindow &&
      aWindow.arguments &&
      aWindow.arguments[0] &&
      aWindow.arguments[0].QueryInterface(Ci.nsIGeckoViewView);

    if (!view) {
      throw new Error("The window is not a GeckoView-connected window");
    }

    return new DispatcherDelegate(view);
  },

  /**
   * Returns a named EventDispatcher, which can communicate with the
   * corresponding EventDispatcher on the java side.
   */
  byName(aName) {
    const dispatcher = Services.geckoviewBridge.getDispatcherByName(aName);
    return new DispatcherDelegate(dispatcher);
  },
};
