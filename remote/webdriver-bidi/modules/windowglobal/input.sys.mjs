/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { WindowGlobalBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/WindowGlobalBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  action: "chrome://remote/content/shared/webdriver/Actions.sys.mjs",
  AnimationFramePromise: "chrome://remote/content/shared/Sync.sys.mjs",
  assertTargetInViewPort:
    "chrome://remote/content/shared/webdriver/Actions.sys.mjs",
  dom: "chrome://remote/content/shared/DOM.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  event: "chrome://remote/content/shared/webdriver/Event.sys.mjs",
});

class InputModule extends WindowGlobalBiDiModule {
  #actionsOptions;
  #actionState;

  constructor(messageHandler) {
    super(messageHandler);

    // Bug 1920959: Remove if we no longer need to dispatch in content.
    this.#actionState = null;
    // Options for actions to pass through performActions and releaseActions.
    this.#actionsOptions = {
      // Callbacks as defined in the WebDriver specification.
      getElementOrigin: this.#getElementOriginFromContent.bind(this),
      isElementOrigin: this.#isElementOriginFromContent.bind(this),

      // Custom callbacks.
      assertInViewPort: this.#assertInViewPortFromContent.bind(this),
      dispatchEvent: this.#dispatchEventFromContent.bind(this),
      getClientRects: this.#getClientRectsFromContent.bind(this),
      getInViewCentrePoint: this.#getInViewCentrePointFromContent.bind(this),
    };
  }

  destroy() {}

  //////////////////////////////////////////////////////////////
  // Start: Wrapper callbacks for action dispatching in content

  #dispatchEventFromContent(eventName, _context, details) {
    return this._dispatchEvent({ eventName, details });
  }

  #assertInViewPortFromContent(target, _context) {
    return lazy.assertTargetInViewPort(target, this.messageHandler.window);
  }

  #getClientRectsFromContent(element, _context) {
    return element.getClientRects();
  }

  #getElementOriginFromContent(origin, _context) {
    return origin;
  }

  #getInViewCentrePointFromContent(rect, _context) {
    return lazy.dom.getInViewCentrePoint(rect, this.messageHandler.window);
  }

  #isElementOriginFromContent(origin, _context) {
    return lazy.dom.isElement(origin);
  }

  // End: Wrapper callbacks for action dispatching in content
  //////////////////////////////////////////////////////////////

  /**
   * In the provided array of input.SourceActions, replace all origins matching
   * the input.ElementOrigin production with the Element corresponding to this
   * origin.
   *
   * Note that this method replaces the content of the `actions` in place, and
   * does not return a new array.
   *
   * @param {Array<input.SourceActions>} actions
   *     The array of SourceActions to deserialize.
   * @returns {Promise}
   *     A promise which resolves when all ElementOrigin origins have been
   *     deserialized.
   */
  async #deserializeActionOrigins(actions) {
    const promises = [];

    if (!Array.isArray(actions)) {
      // Silently ignore invalid action chains because they are fully parsed later.
      return Promise.resolve();
    }

    for (const actionsByTick of actions) {
      if (!Array.isArray(actionsByTick?.actions)) {
        // Silently ignore invalid actions because they are fully parsed later.
        return Promise.resolve();
      }

      for (const action of actionsByTick.actions) {
        if (action?.origin?.type === "element") {
          promises.push(
            (async () => {
              action.origin = await this.#deserializeElementSharedReference(
                action.origin.element
              );
            })()
          );
        }
      }
    }

    return Promise.all(promises);
  }

  async #deserializeElementSharedReference(sharedReference) {
    if (typeof sharedReference?.sharedId !== "string") {
      throw new lazy.error.InvalidArgumentError(
        `Expected "element" to be a SharedReference, got: ${sharedReference}`
      );
    }

    const realm = this.messageHandler.getRealm();

    const element = this.deserialize(sharedReference, realm);
    if (!lazy.dom.isElement(element)) {
      throw new lazy.error.NoSuchElementError(
        `No element found for shared id: ${sharedReference.sharedId}`
      );
    }

    return element;
  }

  _assertInViewPort(options) {
    const { target } = options;

    return lazy.assertTargetInViewPort(target, this.messageHandler.window);
  }

  async _dispatchEvent(options) {
    const { eventName, details } = options;

    try {
      switch (eventName) {
        case "synthesizeKeyDown":
          lazy.event.sendKeyDown(details.eventData, this.messageHandler.window);
          break;
        case "synthesizeKeyUp":
          lazy.event.sendKeyUp(details.eventData, this.messageHandler.window);
          break;
        case "synthesizeMouseAtPoint":
          lazy.event.synthesizeMouseAtPoint(
            details.x,
            details.y,
            details.eventData,
            this.messageHandler.window
          );
          break;
        case "synthesizeMultiTouch":
          lazy.event.synthesizeMultiTouch(
            details.eventData,
            this.messageHandler.window
          );
          break;
        case "synthesizeWheelAtPoint":
          lazy.event.synthesizeWheelAtPoint(
            details.x,
            details.y,
            details.eventData,
            this.messageHandler.window
          );
          break;
        default:
          throw new Error(
            `${eventName} is not a supported type for dispatching`
          );
      }
    } catch (e) {
      if (e.message.includes("NS_ERROR_FAILURE")) {
        // Dispatching the event failed. Inform the RootTransport
        // to retry dispatching the event.
        throw new DOMException(
          `Failed to dispatch event "${eventName}": ${e.message}`,
          "AbortError"
        );
      }

      throw e;
    }
  }

  _finalizeAction() {
    // Terminate the current wheel transaction if there is one. Wheel
    // transactions should not live longer than a single action chain.
    ChromeUtils.endWheelTransaction();

    // Wait for the next animation frame to make sure the page's content
    // was updated.
    return lazy.AnimationFramePromise(this.messageHandler.window);
  }

  async _getClientRects(options) {
    const { element: reference } = options;

    const element = await this.#deserializeElementSharedReference(reference);
    const rects = element.getClientRects();

    // To avoid serialization and deserialization of DOMRect and DOMRectList
    // convert to plain object and Array.
    return [...rects].map(rect => {
      const { x, y, width, height, top, right, bottom, left } = rect;
      return { x, y, width, height, top, right, bottom, left };
    });
  }

  async _getElementOrigin(options) {
    const { origin } = options;

    const reference = origin.element;
    this.#deserializeElementSharedReference(reference);

    return reference;
  }

  _getInViewCentrePoint(options) {
    const { rect } = options;

    return lazy.dom.getInViewCentrePoint(rect, this.messageHandler.window);
  }

  async setFiles(options) {
    const { element: sharedReference, files } = options;

    const element = await this.#deserializeElementSharedReference(
      sharedReference
    );

    if (
      !HTMLInputElement.isInstance(element) ||
      element.type !== "file" ||
      element.disabled
    ) {
      throw new lazy.error.UnableToSetFileInputError(
        `Element needs to be an <input> element with type "file" and not disabled`
      );
    }

    if (files.length > 1 && !element.hasAttribute("multiple")) {
      throw new lazy.error.UnableToSetFileInputError(
        `Element should have an attribute "multiple" set when trying to set more than 1 file`
      );
    }

    const fileObjects = [];
    for (const file of files) {
      try {
        fileObjects.push(await File.createFromFileName(file));
      } catch (e) {
        throw new lazy.error.UnsupportedOperationError(
          `Failed to add file ${file} (${e})`
        );
      }
    }

    const selectedFiles = Array.from(element.files);

    const intersection = fileObjects.filter(fileObject =>
      selectedFiles.some(
        selectedFile =>
          // Compare file fields to identify if the files are equal.
          // TODO: Bug 1883856. Add check for full path or use a different way
          // to compare files when it's available.
          selectedFile.name === fileObject.name &&
          selectedFile.size === fileObject.size &&
          selectedFile.type === fileObject.type
      )
    );

    if (
      intersection.length === selectedFiles.length &&
      selectedFiles.length === fileObjects.length
    ) {
      lazy.event.cancel(element);
    } else {
      element.mozSetFileArray(fileObjects);

      lazy.event.input(element);
      lazy.event.change(element);
    }
  }

  async performActions(options) {
    const { actions } = options;

    if (this.#actionState === null) {
      this.#actionState = new lazy.action.State();
    }

    await this.#deserializeActionOrigins(actions);

    const actionChain = await lazy.action.Chain.fromJSON(
      this.#actionState,
      actions,
      this.#actionsOptions
    );
    await actionChain.dispatch(this.#actionState, this.#actionsOptions);

    // Terminate the current wheel transaction if there is one. Wheel
    // transactions should not live longer than a single action chain.
    ChromeUtils.endWheelTransaction();
  }

  async releaseActions() {
    if (this.#actionState === null) {
      return;
    }

    const undoActions = this.#actionState.inputCancelList.reverse();
    await undoActions.dispatch(this.#actionState, this.#actionsOptions);

    this.#actionState = null;
  }
}

export const input = InputModule;
