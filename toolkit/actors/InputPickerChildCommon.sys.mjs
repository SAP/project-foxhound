/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  LayoutUtils: "resource://gre/modules/LayoutUtils.sys.mjs",
});

/**
 * InputPickerChildCommon is the communication channel between the input box
 * (content) for each input types and its picker (chrome).
 */
export class InputPickerChildCommon extends JSWindowActorChild {
  /** @type {HTMLInputElement} */
  #inputElement = null;
  #inputType = "";
  #namespace;
  /** @type {AbortController} */
  #abortController;

  /**
   * On init, just listen for the event to open the picker, once the picker is
   * opened, we'll listen for update and close events.
   *
   * @param {string} namespace Affects the event names, e.g. Foo makes it
   *                           accept FooValueChanged event.
   *                           Align it with ActorManagerParent declaration.
   */
  constructor(namespace) {
    super();
    this.#namespace = namespace;
  }

  /**
   * Cleanup function called when picker is closed.
   */
  close() {
    this.#abortController.abort();
    this.closeImpl(this.#inputElement);
    this.#inputElement = null;
    this.#inputType = "";
  }

  /**
   * @param {HTMLInputElement} _inputElement
   */
  closeImpl(_inputElement) {
    throw new Error("Not implemented");
  }

  /**
   * Called after picker is opened to start listening for input box update
   * events.
   */
  addListeners(aElement) {
    this.#abortController = new AbortController();
    aElement.ownerGlobal.addEventListener("pagehide", this, {
      signal: this.#abortController.signal,
    });
  }

  /**
   * Helper function that returns the CSS direction property of the element.
   */
  getComputedDirection(aElement) {
    return aElement.ownerGlobal
      .getComputedStyle(aElement)
      .getPropertyValue("direction");
  }

  /**
   * Helper function that returns the rect of the element, which is the position
   * relative to the left/top of the content area.
   */
  getBoundingContentRect(aElement) {
    return lazy.LayoutUtils.getElementBoundingScreenRect(aElement);
  }

  /**
   * MessageListener
   */
  receiveMessage(aMessage) {
    if (!this.#inputElement || this.#inputElement.type !== this.#inputType) {
      // Either we are already closed by content or the input type is changed
      return;
    }
    switch (aMessage.name) {
      case "InputPicker:Closed": {
        this.close();
        break;
      }
      case "InputPicker:ValueChanged": {
        this.pickerValueChangedImpl(aMessage, this.#inputElement);
        break;
      }
    }
  }

  /**
   * Element updater function called when the picker value is changed.
   *
   * @param {ReceiveMessageArgument} _aMessage
   * @param {HTMLInputElement} _inputElement
   */
  pickerValueChangedImpl(_aMessage, _inputElement) {
    throw new Error("Not implemented");
  }

  /**
   * nsIDOMEventListener, for chrome events sent by the input element and other
   * DOM events.
   */
  handleEvent(aEvent) {
    switch (aEvent.type) {
      case `MozOpen${this.#namespace}`: {
        if (
          !aEvent.originalTarget.ownerGlobal.HTMLInputElement.isInstance(
            aEvent.originalTarget
          )
        ) {
          return;
        }

        if (this.#inputElement) {
          // This happens when we're trying to open a picker when another picker
          // is still open. We ignore this request to let the first picker
          // close gracefully.
          return;
        }

        /** @type {HTMLInputElement} */
        const inputElement = aEvent.originalTarget;
        const openPickerDetail = this.openPickerImpl(inputElement);
        if (!openPickerDetail) {
          // The impl doesn't want to proceed in this case
          return;
        }

        this.#inputElement = inputElement;
        this.#inputType = inputElement.type;
        this.addListeners(inputElement);

        this.sendAsyncMessage(`InputPicker:Open`, {
          rect: this.getBoundingContentRect(inputElement),
          dir: this.getComputedDirection(inputElement),
          type: inputElement.type,
          detail: openPickerDetail,
        });
        break;
      }
      case `MozClose${this.#namespace}`: {
        this.sendAsyncMessage(`InputPicker:Close`, {});
        this.close();
        break;
      }
      case "pagehide": {
        if (this.#inputElement?.ownerDocument == aEvent.target) {
          this.sendAsyncMessage(`InputPicker:Close`, {});
          this.close();
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * Picker initialization function called when opening the picker
   *
   * @param {HTMLInputElement} _inputElement
   * @returns An argument object to pass to the picker, or undefined to stop opening one.
   */
  openPickerImpl(_inputElement) {
    throw new Error("Not implemented");
  }

  /**
   * Picker updater function when the input value is updated
   *
   * @param {HTMLInputElement} _inputElement
   * @returns An argument object to pass to the picker
   */
  updatePickerImpl(_inputElement) {
    throw new Error("Not implemented");
  }
}
