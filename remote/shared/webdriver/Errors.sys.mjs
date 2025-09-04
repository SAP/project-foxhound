/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RemoteError } from "chrome://remote/content/shared/RemoteError.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  pprint: "chrome://remote/content/shared/Format.sys.mjs",
});

const ERRORS = new Set([
  "DetachedShadowRootError",
  "ElementClickInterceptedError",
  "ElementNotAccessibleError",
  "ElementNotInteractableError",
  "InsecureCertificateError",
  "InvalidArgumentError",
  "InvalidCookieDomainError",
  "InvalidElementStateError",
  "InvalidSelectorError",
  "InvalidSessionIDError",
  "InvalidWebExtensionError",
  "JavaScriptError",
  "MoveTargetOutOfBoundsError",
  "NoSuchAlertError",
  "NoSuchElementError",
  "NoSuchFrameError",
  "NoSuchHandleError",
  "NoSuchHistoryEntryError",
  "NoSuchInterceptError",
  "NoSuchNodeError",
  "NoSuchRequestError",
  "NoSuchScriptError",
  "NoSuchShadowRootError",
  "NoSuchUserContextError",
  "NoSuchWebExtensionError",
  "NoSuchWindowError",
  "ScriptTimeoutError",
  "SessionNotCreatedError",
  "StaleElementReferenceError",
  "TimeoutError",
  "UnableToCaptureScreen",
  "UnableToSetCookieError",
  "UnableToSetFileInputError",
  "UnexpectedAlertOpenError",
  "UnknownCommandError",
  "UnknownError",
  "UnsupportedOperationError",
  "WebDriverError",
]);

const BUILTIN_ERRORS = new Set([
  "Error",
  "EvalError",
  "InternalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);

/** @namespace */
export const error = {
  /**
   * Check if ``val`` is an instance of the ``Error`` prototype.
   *
   * Because error objects may originate from different globals, comparing
   * the prototype of the left hand side with the prototype property from
   * the right hand side, which is what ``instanceof`` does, will not work.
   * If the LHS and RHS come from different globals, this check will always
   * fail because the two objects will not have the same identity.
   *
   * Therefore it is not safe to use ``instanceof`` in any multi-global
   * situation, e.g. in content across multiple ``Window`` objects or anywhere
   * in chrome scope.
   *
   * This function also contains a special check if ``val`` is an XPCOM
   * ``nsIException`` because they are special snowflakes and may indeed
   * cause Firefox to crash if used with ``instanceof``.
   *
   * @param {*} val
   *     Any value that should be undergo the test for errorness.
   * @returns {boolean}
   *     True if error, false otherwise.
   */
  isError(val) {
    if (val === null || typeof val != "object") {
      return false;
    } else if (val instanceof Ci.nsIException) {
      return true;
    }

    // DOMRectList errors on string comparison
    try {
      let proto = Object.getPrototypeOf(val);
      return BUILTIN_ERRORS.has(proto.toString());
    } catch (e) {
      return false;
    }
  },

  /**
   * Checks if ``obj`` is an object in the :js:class:`WebDriverError`
   * prototypal chain.
   *
   * @param {*} obj
   *     Arbitrary object to test.
   *
   * @returns {boolean}
   *     True if ``obj`` is of the WebDriverError prototype chain,
   *     false otherwise.
   */
  isWebDriverError(obj) {
    // Don't use "instanceof" to compare error objects because of possible
    // problems when the other instance was created in a different global and
    // as such won't have the same prototype object.
    return error.isError(obj) && "name" in obj && ERRORS.has(obj.name);
  },

  /**
   * Ensures error instance is a :js:class:`WebDriverError`.
   *
   * If the given error is already in the WebDriverError prototype
   * chain, ``err`` is returned unmodified.  If it is not, it is wrapped
   * in the provided WebDriverError class (defaults to :js:class:`UnknownError`).
   *
   * @param {Error} err
   *     Error to conditionally turn into a WebDriverError.
   * @param {WebDriverError=} targetErrorClass
   *     Target WebDriver error class to wrap the error with.
   *     Defaults to UnknownError.
   *
   * @returns {WebDriverError}
   *     If ``err`` is a WebDriverError, it is returned unmodified.
   *     Otherwise a WebDriver error of the target error class type is returned.
   */
  wrap(err, targetErrorClass = UnknownError) {
    if (error.isWebDriverError(err)) {
      return err;
    }

    return new targetErrorClass(err);
  },

  /**
   * Unhandled error reporter.  Dumps the error and its stacktrace to console,
   * and reports error to the Browser Console.
   */
  report(err) {
    let msg = "Marionette threw an error: " + error.stringify(err);
    dump(msg + "\n");
    console.error(msg);
  },

  /**
   * Prettifies an instance of Error and its stacktrace to a string.
   */
  stringify(err) {
    try {
      let s = err.toString();
      if ("stack" in err) {
        s += "\n" + err.stack;
      }
      return s;
    } catch (e) {
      return "<unprintable error>";
    }
  },

  /** Create a stacktrace to the current line in the program. */
  stack() {
    let trace = new Error().stack;
    let sa = trace.split("\n");
    sa = sa.slice(1);
    let rv = "stacktrace:\n" + sa.join("\n");
    return rv.trimEnd();
  },
};

/**
 * WebDriverError is the prototypal parent of all WebDriver errors.
 * It should not be used directly, as it does not correspond to a real
 * error in the specification.
 */
class WebDriverError extends RemoteError {
  /**
   * Base error for WebDriver protocols.
   *
   * @param {(string|Error)=} obj
   *     Optional string describing error situation or Error instance
   *     to propagate.
   * @param {object=} data
   *     Additional error data helpful in diagnosing the error.
   */
  constructor(obj, data = {}) {
    super(obj);

    this.name = this.constructor.name;
    this.status = "webdriver error";
    this.data = data;

    // Error's ctor does not preserve x' stack
    if (error.isError(obj)) {
      this.lineNumber = obj.lineNumber;
      this.columnNumber = obj.columnNumber;
      if (!obj.stack) {
        // Provides a stacktrace if it was missing on the original Error object
        this.stack = `@${obj.fileName}:${obj.lineNumber}:${obj.columnNumber}\n`;
      } else {
        this.stack = obj.stack;
      }
    }

    if (error.isWebDriverError(obj)) {
      this.message = obj.message;
      this.data = obj.data;
    }
  }

  /**
   * @returns {Record<string, string>}
   *     JSON serialisation of error prototype.
   */
  toJSON() {
    const result = {
      error: this.status,
      message: this.message || "",
      stacktrace: this.stack || "",
    };

    // Only add the field if additional data has been specified.
    if (Object.keys(this.data).length) {
      result.data = this.data;
    }

    return result;
  }

  /**
   * Unmarshals a JSON error representation to the appropriate Marionette
   * error type.
   *
   * @param {Record<string, string>} json
   *     Error object.
   *
   * @returns {Error}
   *     Error prototype.
   */
  static fromJSON(json) {
    if (typeof json.error == "undefined") {
      let s = JSON.stringify(json);
      throw new TypeError("Undeserialisable error type: " + s);
    }
    if (!STATUSES.has(json.error)) {
      throw new TypeError("Not of WebDriverError descent: " + json.error);
    }

    let cls = STATUSES.get(json.error);
    let err = new cls();
    if ("message" in json) {
      err.message = json.message;
    }
    if ("stacktrace" in json) {
      err.stack = json.stacktrace;
    }
    if ("data" in json) {
      err.data = json.data;
    }

    return err;
  }
}

/**
 * The Gecko a11y API indicates that the element is not accessible.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class ElementNotAccessibleError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "element not accessible";
  }
}

/**
 * An element click could not be completed because the element receiving
 * the events is obscuring the element that was requested clicked.
 *
 * @param {string=} message
 *     Optional string describing error situation. Will be replaced if both
 *     `data.obscuredEl` and `data.coords` are provided.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 * @param {Element=} obscuredEl
 *     Element obscuring the element receiving the click.  Providing this
 *     is not required, but will produce a nicer error message.
 * @param {Map.<string, number>=} coords
 *     Original click location.  Providing this is not required, but
 *     will produce a nicer error message.
 */
class ElementClickInterceptedError extends WebDriverError {
  constructor(obj, data = {}, obscuredEl = undefined, coords = undefined) {
    let obscuredElDetails = null;
    let overlayingElDetails = null;

    if (obscuredEl && coords) {
      const doc = obscuredEl.ownerDocument;
      const overlayingEl = doc.elementFromPoint(coords.x, coords.y);

      obscuredElDetails = lazy.pprint`${obscuredEl}`;
      overlayingElDetails = lazy.pprint`${overlayingEl}`;

      switch (obscuredEl.style.pointerEvents) {
        case "none":
          obj =
            `Element ${obscuredElDetails} is not clickable ` +
            `at point (${coords.x},${coords.y}) ` +
            `because it does not have pointer events enabled, ` +
            `and element ${overlayingElDetails} ` +
            `would receive the click instead`;
          break;

        default:
          obj =
            `Element ${obscuredElDetails} is not clickable ` +
            `at point (${coords.x},${coords.y}) ` +
            `because another element ${overlayingElDetails} ` +
            `obscures it`;
          break;
      }
    }

    if (coords) {
      data.coords = coords;
    }
    if (obscuredElDetails) {
      data.obscuredElement = obscuredElDetails;
    }
    if (overlayingElDetails) {
      data.overlayingElement = overlayingElDetails;
    }

    super(obj, data);
    this.status = "element click intercepted";
  }
}

/**
 * A command could not be completed because the element is not pointer-
 * or keyboard interactable.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class ElementNotInteractableError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "element not interactable";
  }
}

/**
 * Navigation caused the user agent to hit a certificate warning, which
 * is usually the result of an expired or invalid TLS certificate.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class InsecureCertificateError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "insecure certificate";
  }
}

/**
 * The arguments passed to a command are either invalid or malformed.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class InvalidArgumentError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "invalid argument";
  }
}

/**
 * An illegal attempt was made to set a cookie under a different
 * domain than the current page.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class InvalidCookieDomainError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "invalid cookie domain";
  }
}

/**
 * A command could not be completed because the element is in an
 * invalid state, e.g. attempting to clear an element that isn't both
 * editable and resettable.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class InvalidElementStateError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "invalid element state";
  }
}

/**
 * Argument was an invalid selector.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class InvalidSelectorError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "invalid selector";
  }
}

/**
 * Occurs if the given session ID is not in the list of active sessions,
 * meaning the session either does not exist or that it's not active.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class InvalidSessionIDError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "invalid session id";
  }
}

/**
 * Tried to install an invalid web extension.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class InvalidWebExtensionError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "invalid web extension";
  }
}

/**
 * An error occurred whilst executing JavaScript supplied by the user.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class JavaScriptError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "javascript error";
  }
}

/**
 * The target for mouse interaction is not in the browser's viewport
 * and cannot be brought into that viewport.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class MoveTargetOutOfBoundsError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "move target out of bounds";
  }
}

/**
 * An attempt was made to operate on a modal dialog when one was
 * not open.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchAlertError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such alert";
  }
}

/**
 * An element could not be located on the page using the given
 * search parameters.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchElementError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such element";
  }
}

/**
 * A command tried to remove an unknown preload script.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchScriptError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such script";
  }
}

/**
 * A shadow root was not attached to the element.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchShadowRootError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such shadow root";
  }
}

/**
 * A shadow root is no longer attached to the document.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class DetachedShadowRootError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "detached shadow root";
  }
}

/**
 * A command to switch to a frame could not be satisfied because
 * the frame could not be found.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchFrameError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such frame";
  }
}

/**
 * The handle of a strong object reference could not be found.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchHandleError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such handle";
  }
}

/**
 * The entry of the history could not be found.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchHistoryEntryError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such history entry";
  }
}

/**
 * Tried to remove an unknown network intercept.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchInterceptError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such intercept";
  }
}

/**
 * A node as given by its unique shared id could not be found within the cache
 * of known nodes.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchNodeError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such node";
  }
}

/**
 * Tried to continue an unknown request.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchRequestError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such request";
  }
}

/**
 * A command tried to reference an unknown user context (containers in Firefox).
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchUserContextError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such user context";
  }
}

/**
 * A command tried to reference an unknown web extension.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchWebExtensionError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such web extension";
  }
}

/**
 * A command to switch to a window could not be satisfied because
 * the window could not be found.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class NoSuchWindowError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "no such window";
  }
}

/**
 * A script did not complete before its timeout expired.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class ScriptTimeoutError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "script timeout";
  }
}

/**
 * A new session could not be created.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class SessionNotCreatedError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "session not created";
  }
}

/**
 * A command failed because the referenced element is no longer
 * attached to the DOM.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class StaleElementReferenceError extends WebDriverError {
  constructor(obj, options = {}) {
    super(obj, options);
    this.status = "stale element reference";
  }
}

/**
 * An operation did not complete before its timeout expired.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class TimeoutError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "timeout";
  }
}

/**
 * A command to set a cookie's value could not be satisfied.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class UnableToSetCookieError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "unable to set cookie";
  }
}

/**
 * A command to set a file could not be satisfied.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class UnableToSetFileInputError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "unable to set file input";
  }
}

/**
 * A command to capture a screenshot could not be satisfied.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class UnableToCaptureScreen extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "unable to capture screen";
  }
}

/**
 * A modal dialog was open, blocking this operation.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class UnexpectedAlertOpenError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "unexpected alert open";
  }
}

/**
 * A command could not be executed because the remote end is not
 * aware of it.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class UnknownCommandError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "unknown command";
  }
}

/**
 * An unknown error occurred in the remote end while processing
 * the command.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class UnknownError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "unknown error";
  }
}

/**
 * Indicates that a command that should have executed properly
 * cannot be supported for some reason.
 *
 * @param {(string|Error)=} obj
 *     Optional string describing error situation or Error instance
 *     to propagate.
 * @param {object=} data
 *     Additional error data helpful in diagnosing the error.
 */
class UnsupportedOperationError extends WebDriverError {
  constructor(obj, data = {}) {
    super(obj, data);
    this.status = "unsupported operation";
  }
}

const STATUSES = new Map([
  ["detached shadow root", DetachedShadowRootError],
  ["element click intercepted", ElementClickInterceptedError],
  ["element not accessible", ElementNotAccessibleError],
  ["element not interactable", ElementNotInteractableError],
  ["insecure certificate", InsecureCertificateError],
  ["invalid argument", InvalidArgumentError],
  ["invalid cookie domain", InvalidCookieDomainError],
  ["invalid element state", InvalidElementStateError],
  ["invalid selector", InvalidSelectorError],
  ["invalid session id", InvalidSessionIDError],
  ["invalid web extension", InvalidWebExtensionError],
  ["javascript error", JavaScriptError],
  ["move target out of bounds", MoveTargetOutOfBoundsError],
  ["no such alert", NoSuchAlertError],
  ["no such element", NoSuchElementError],
  ["no such frame", NoSuchFrameError],
  ["no such handle", NoSuchHandleError],
  ["no such history entry", NoSuchHistoryEntryError],
  ["no such intercept", NoSuchInterceptError],
  ["no such node", NoSuchNodeError],
  ["no such request", NoSuchRequestError],
  ["no such script", NoSuchScriptError],
  ["no such shadow root", NoSuchShadowRootError],
  ["no such user context", NoSuchUserContextError],
  ["no such web extension", NoSuchWebExtensionError],
  ["no such window", NoSuchWindowError],
  ["script timeout", ScriptTimeoutError],
  ["session not created", SessionNotCreatedError],
  ["stale element reference", StaleElementReferenceError],
  ["timeout", TimeoutError],
  ["unable to capture screen", UnableToCaptureScreen],
  ["unable to set cookie", UnableToSetCookieError],
  ["unable to set file input", UnableToSetFileInputError],
  ["unexpected alert open", UnexpectedAlertOpenError],
  ["unknown command", UnknownCommandError],
  ["unknown error", UnknownError],
  ["unsupported operation", UnsupportedOperationError],
  ["webdriver error", WebDriverError],
]);

// Errors must be exported as part of the `error` object.
// We could declare each error as global variable, but because they are Error
// prototypes this would mess up their names.
for (let cls of STATUSES.values()) {
  error[cls.name] = cls;
}
