/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { WindowGlobalBiDiModule } from "chrome://remote/content/webdriver-bidi/modules/WindowGlobalBiDiModule.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  LayoutUtils: "resource://gre/modules/LayoutUtils.sys.mjs",

  AnimationFramePromise: "chrome://remote/content/shared/Sync.sys.mjs",
  assertTargetInViewPort:
    "chrome://remote/content/shared/webdriver/Actions.sys.mjs",
  dom: "chrome://remote/content/shared/DOM.sys.mjs",
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  event: "chrome://remote/content/shared/webdriver/Event.sys.mjs",
  FilePickerListener:
    "chrome://remote/content/shared/listeners/FilePickerListener.sys.mjs",
  OwnershipModel: "chrome://remote/content/webdriver-bidi/RemoteValue.sys.mjs",
  setDefaultSerializationOptions:
    "chrome://remote/content/webdriver-bidi/RemoteValue.sys.mjs",
});

class InputModule extends WindowGlobalBiDiModule {
  #filePickerListener;
  #subscribedEvents;

  constructor(messageHandler) {
    super(messageHandler);

    this.#filePickerListener = new lazy.FilePickerListener();
    this.#filePickerListener.on(
      "file-picker-opening",
      this.#onFilePickerOpening
    );

    // Set of event names which have active subscriptions.
    this.#subscribedEvents = new Set();
  }

  destroy() {
    this.#filePickerListener.off(
      "file-picker-opening",
      this.#onFilePickerOpening
    );
    this.#subscribedEvents = null;
  }

  async setFiles(options) {
    const { element: sharedReference, files } = options;

    const element =
      await this.#deserializeElementSharedReference(sharedReference);

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

  #onFilePickerOpening = (eventName, data) => {
    const { element } = data;
    if (element.ownerGlobal.browsingContext != this.messageHandler.context) {
      return;
    }

    const realm = this.messageHandler.getRealm();

    const serializedNode = this.serialize(
      element,
      lazy.setDefaultSerializationOptions(),
      lazy.OwnershipModel.None,
      realm
    );

    this.emitEvent("input.fileDialogOpened", {
      context: this.messageHandler.context,
      element: serializedNode,
      multiple: element.multiple,
    });
  };

  #startListingOnFilePickerOpened() {
    if (!this.#subscribedEvents.has("script.FilePickerOpened")) {
      this.#filePickerListener.startListening();
    }
  }

  #stopListingOnFilePickerOpened() {
    if (this.#subscribedEvents.has("script.FilePickerOpened")) {
      this.#filePickerListener.stopListening();
    }
  }

  #subscribeEvent(event) {
    switch (event) {
      case "input.fileDialogOpened": {
        this.#startListingOnFilePickerOpened();
        this.#subscribedEvents.add(event);
        break;
      }
    }
  }

  #unsubscribeEvent(event) {
    switch (event) {
      case "input.fileDialogOpened": {
        this.#stopListingOnFilePickerOpened();
        this.#subscribedEvents.delete(event);
        break;
      }
    }
  }

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

  _assertInViewPort(options) {
    const { target } = options;

    return lazy.assertTargetInViewPort(target, this.messageHandler.window);
  }

  async _dispatchEvent(options) {
    const { eventName, details } = options;

    const windowUtils = this.messageHandler.window.windowUtils;
    const microTaskLevel = windowUtils.microTaskLevel;
    // Since we're being called as a webidl callback,
    // CallbackObjectBase::CallSetup::CallSetup has increased the microtask
    // level. Undo that temporarily so that microtask handling works closer
    // the way it would work when dispatching events natively.
    windowUtils.microTaskLevel = 0;

    try {
      switch (eventName) {
        case "synthesizeKeyDown":
          lazy.event.sendKeyDown(details.eventData, this.messageHandler.window);
          break;
        case "synthesizeKeyUp":
          lazy.event.sendKeyUp(details.eventData, this.messageHandler.window);
          break;
        case "synthesizeMouseAtPoint":
          await lazy.event.synthesizeMouseAtPoint(
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
          await lazy.event.synthesizeWheelAtPoint(
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
    } finally {
      windowUtils.microTaskLevel = microTaskLevel;
    }
  }

  async _finalizeAction() {
    // Terminate the current wheel transaction if there is one. Wheel
    // transactions should not live longer than a single action chain.
    await ChromeUtils.endWheelTransaction(this.messageHandler.window);

    // Wait for the next animation frame to make sure the page's content
    // was updated.
    await lazy.AnimationFramePromise(this.messageHandler.window);
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

  /**
   * Convert a position or rect in browser coordinates of CSS units.
   */
  _toBrowserWindowCoordinates(options) {
    const { position } = options;
    const window = this.messageHandler.window;

    return lazy.LayoutUtils.rectToTopLevelWidgetRect(window, {
      left: position[0],
      top: position[1],
      height: 0,
      width: 0,
    });
  }
}

export const input = InputModule;
