/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  capture: "chrome://remote/content/shared/Capture.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  Log: "chrome://remote/content/shared/Log.sys.mjs",
});

XPCOMUtils.defineLazyGetter(lazy, "logger", () =>
  lazy.Log.get(lazy.Log.TYPES.MARIONETTE)
);

export class MarionetteCommandsParent extends JSWindowActorParent {
  actorCreated() {
    this._resolveDialogOpened = null;
  }

  dialogOpenedPromise() {
    return new Promise(resolve => {
      this._resolveDialogOpened = resolve;
    });
  }

  async sendQuery(name, data) {
    // return early if a dialog is opened
    const result = await Promise.race([
      super.sendQuery(name, data),
      this.dialogOpenedPromise(),
    ]).finally(() => {
      this._resolveDialogOpened = null;
    });

    if ("error" in result) {
      throw lazy.error.WebDriverError.fromJSON(result.error);
    } else {
      return result.data;
    }
  }

  notifyDialogOpened() {
    if (this._resolveDialogOpened) {
      this._resolveDialogOpened({ data: null });
    }
  }

  // Proxying methods for WebDriver commands

  clearElement(webEl) {
    return this.sendQuery("MarionetteCommandsParent:clearElement", {
      elem: webEl,
    });
  }

  clickElement(webEl, capabilities) {
    return this.sendQuery("MarionetteCommandsParent:clickElement", {
      elem: webEl,
      capabilities: capabilities.toJSON(),
    });
  }

  async executeScript(script, args, opts) {
    return this.sendQuery("MarionetteCommandsParent:executeScript", {
      script,
      args,
      opts,
    });
  }

  findElement(strategy, selector, opts) {
    return this.sendQuery("MarionetteCommandsParent:findElement", {
      strategy,
      selector,
      opts,
    });
  }

  findElements(strategy, selector, opts) {
    return this.sendQuery("MarionetteCommandsParent:findElements", {
      strategy,
      selector,
      opts,
    });
  }

  async getShadowRoot(webEl) {
    return this.sendQuery("MarionetteCommandsParent:getShadowRoot", {
      elem: webEl,
    });
  }

  async getActiveElement() {
    return this.sendQuery("MarionetteCommandsParent:getActiveElement");
  }

  async getElementAttribute(webEl, name) {
    return this.sendQuery("MarionetteCommandsParent:getElementAttribute", {
      elem: webEl,
      name,
    });
  }

  async getElementProperty(webEl, name) {
    return this.sendQuery("MarionetteCommandsParent:getElementProperty", {
      elem: webEl,
      name,
    });
  }

  async getElementRect(webEl) {
    return this.sendQuery("MarionetteCommandsParent:getElementRect", {
      elem: webEl,
    });
  }

  async getElementTagName(webEl) {
    return this.sendQuery("MarionetteCommandsParent:getElementTagName", {
      elem: webEl,
    });
  }

  async getElementText(webEl) {
    return this.sendQuery("MarionetteCommandsParent:getElementText", {
      elem: webEl,
    });
  }

  async getElementValueOfCssProperty(webEl, name) {
    return this.sendQuery(
      "MarionetteCommandsParent:getElementValueOfCssProperty",
      {
        elem: webEl,
        name,
      }
    );
  }

  async getPageSource() {
    return this.sendQuery("MarionetteCommandsParent:getPageSource");
  }

  async isElementDisplayed(webEl, capabilities) {
    return this.sendQuery("MarionetteCommandsParent:isElementDisplayed", {
      capabilities: capabilities.toJSON(),
      elem: webEl,
    });
  }

  async isElementEnabled(webEl, capabilities) {
    return this.sendQuery("MarionetteCommandsParent:isElementEnabled", {
      capabilities: capabilities.toJSON(),
      elem: webEl,
    });
  }

  async isElementSelected(webEl, capabilities) {
    return this.sendQuery("MarionetteCommandsParent:isElementSelected", {
      capabilities: capabilities.toJSON(),
      elem: webEl,
    });
  }

  async sendKeysToElement(webEl, text, capabilities) {
    return this.sendQuery("MarionetteCommandsParent:sendKeysToElement", {
      capabilities: capabilities.toJSON(),
      elem: webEl,
      text,
    });
  }

  async performActions(actions, capabilities) {
    return this.sendQuery("MarionetteCommandsParent:performActions", {
      actions,
      capabilities: capabilities.toJSON(),
    });
  }

  async releaseActions() {
    return this.sendQuery("MarionetteCommandsParent:releaseActions");
  }

  async singleTap(webEl, x, y, capabilities) {
    return this.sendQuery("MarionetteCommandsParent:singleTap", {
      capabilities: capabilities.toJSON(),
      elem: webEl,
      x,
      y,
    });
  }

  async switchToFrame(id) {
    const {
      browsingContextId,
    } = await this.sendQuery("MarionetteCommandsParent:switchToFrame", { id });

    return {
      browsingContext: BrowsingContext.get(browsingContextId),
    };
  }

  async switchToParentFrame() {
    const { browsingContextId } = await this.sendQuery(
      "MarionetteCommandsParent:switchToParentFrame"
    );

    return {
      browsingContext: BrowsingContext.get(browsingContextId),
    };
  }

  async takeScreenshot(webEl, format, full, scroll) {
    const rect = await this.sendQuery(
      "MarionetteCommandsParent:getScreenshotRect",
      {
        elem: webEl,
        full,
        scroll,
      }
    );

    // If no element has been specified use the top-level browsing context.
    // Otherwise use the browsing context from the currently selected frame.
    const browsingContext = webEl
      ? this.browsingContext
      : this.browsingContext.top;

    let canvas = await lazy.capture.canvas(
      browsingContext.topChromeWindow,
      browsingContext,
      rect.x,
      rect.y,
      rect.width,
      rect.height
    );

    switch (format) {
      case lazy.capture.Format.Hash:
        return lazy.capture.toHash(canvas);

      case lazy.capture.Format.Base64:
        return lazy.capture.toBase64(canvas);

      default:
        throw new TypeError(`Invalid capture format: ${format}`);
    }
  }
}

/**
 * Proxy that will dynamically create MarionetteCommands actors for a dynamically
 * provided browsing context until the method can be fully executed by the
 * JSWindowActor pair.
 *
 * @param {function(): BrowsingContext} browsingContextFn
 *     A function that returns the reference to the browsing context for which
 *     the query should run.
 */
export function getMarionetteCommandsActorProxy(browsingContextFn) {
  const MAX_ATTEMPTS = 10;

  /**
   * Methods which modify the content page cannot be retried safely.
   * See Bug 1673345.
   */
  const NO_RETRY_METHODS = [
    "clickElement",
    "executeScript",
    "performActions",
    "releaseActions",
    "sendKeysToElement",
    "singleTap",
  ];

  return new Proxy(
    {},
    {
      get(target, methodName) {
        return async (...args) => {
          let attempts = 0;
          while (true) {
            try {
              const browsingContext = browsingContextFn();
              if (!browsingContext) {
                throw new DOMException(
                  "No BrowsingContext found",
                  "NoBrowsingContext"
                );
              }

              // TODO: Scenarios where the window/tab got closed and
              // currentWindowGlobal is null will be handled in Bug 1662808.
              const actor = browsingContext.currentWindowGlobal.getActor(
                "MarionetteCommands"
              );

              const result = await actor[methodName](...args);
              return result;
            } catch (e) {
              if (!["AbortError", "InactiveActor"].includes(e.name)) {
                // Only retry when the JSWindowActor pair gets destroyed, or
                // gets inactive eg. when the page is moved into bfcache.
                throw e;
              }

              if (NO_RETRY_METHODS.includes(methodName)) {
                const browsingContextId = browsingContextFn()?.id;
                lazy.logger.trace(
                  `[${browsingContextId}] Querying "${methodName}" failed with` +
                    ` ${e.name}, returning "null" as fallback`
                );
                return null;
              }

              if (++attempts > MAX_ATTEMPTS) {
                const browsingContextId = browsingContextFn()?.id;
                lazy.logger.trace(
                  `[${browsingContextId}] Querying "${methodName} "` +
                    `reached the limit of retry attempts (${MAX_ATTEMPTS})`
                );
                throw e;
              }

              lazy.logger.trace(
                `Retrying "${methodName}", attempt: ${attempts}`
              );
            }
          }
        };
      },
    }
  );
}

/**
 * Register the MarionetteCommands actor that holds all the commands.
 */
export function registerCommandsActor() {
  try {
    ChromeUtils.registerWindowActor("MarionetteCommands", {
      kind: "JSWindowActor",
      parent: {
        esModuleURI:
          "chrome://remote/content/marionette/actors/MarionetteCommandsParent.sys.mjs",
      },
      child: {
        esModuleURI:
          "chrome://remote/content/marionette/actors/MarionetteCommandsChild.sys.mjs",
      },

      allFrames: true,
      includeChrome: true,
    });
  } catch (e) {
    if (e.name === "NotSupportedError") {
      lazy.logger.warn(`MarionetteCommands actor is already registered!`);
    } else {
      throw e;
    }
  }
}

export function unregisterCommandsActor() {
  ChromeUtils.unregisterWindowActor("MarionetteCommands");
}
